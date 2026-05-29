# Multiplayer & Networking System

The multiplayer system is built on **Photon PUN 2** (specifically PUN 2.45) and provides a custom abstraction layer (`T17Net*`) over Photon's raw API. The architecture is split into three tiers:

1. **Photon PUN 2** – Low-level transport (rooms, RPCs, custom properties, load balancing).
2. **T17Net Abstraction** – Custom wrapper providing connection state machines, agent-based room management, property synchronization, load sync, and object locking.
3. **Application Layer** – MonoBehaviour consumers (lobby UI, character controllers, prison details, etc.) that use T17Net classes.

---

## Table of Contents

- [Core Architecture](#core-architecture)
- [Connection State Machine](#connection-state-machinet17netconnectandjoinroom)
- [Room & Matchmaking](#room--matchmaking)
- [Photon Integration Layer](#photon-integration-layer)
- [Load Synchronization](#load-synchronization)
- [Game State Synchronization](#game-state-synchronization)
- [Player / Character Synchronization](#player--character-synchronization)
- [Object Interaction (Locks)](#object-interaction-locks)
- [Crossplay](#crossplay)
- [Lobby UI](#lobby-ui)
- [Debug & Tools](#debug--tools)
- [Networking Peer (Photon Peer)](#networking-peer-photon-peer)
- [Encryption & Security](#encryption--security)
- [Friend Invites](#friend-invites)
- [Time Management](#time-management)
- [User Data & Analytics](#user-data--analytics)
- [Room Details (Prison / Blueprint)](#room-details-prison--blueprint)
- [Glossary](#glossary)

---

## Core Architecture

### T17NetManager (Singleton)

Entry point for all multiplayer operations. Lives at the **Persistent** scene level.

**Key Responsibilities:**
- Initializes `PhotonNetwork` via `T17NetInit.Start()` which calls `PhotonNetwork.ConnectUsingSettings()`.
- Holds the **connection state machine** (`T17NetConnectAndJoinRoom`).
- Holds the **PhotonView registration** dictionary (`NetViews`) mapping `NetViewIDs` -> `T17NetView` objects.
- Manages the **room name generator** (`T17NetRoomNameGenerator`) for creating unique room IDs.
- Stores the **local player's data** (`T17NetLocalPlayerData`): userId, userName, platform, gameVersion, appVersion, etc.
- Provides cross-scene persistence of networking state.

**Transitions between scenes:**
- `T17NetPersistence` → carries the `T17NetManager` instance across additive scene loads.
- When entering game sessions, instantiates a `T17NetRoomGameView` for room property sync.

**Local Player Data (`T17NetLocalPlayerData`):**
- `UserId` / `UserName` – from platform auth (Steam ID, Epic Account ID, etc.)
- `Platform` enum: `None, Steam, EGS, PSN, Xbox, Dev`
- `GameVersion` / `AppVersion` – used for version-gating matchmaking
- `UseUDP` flag
- `Region` – preferred Photon region
- `QueueType` – PvP vs Coop
- `IsPrivateRoom` – whether hosting a private room
- `IsQuickMatch` – whether using quick match
- `NetEncryptionKeyType` – symmetric key variant
- `CrossplayMask` – bitmask of allowed platforms for crossplay
- `GameModeType` – GameType (Prison vs Blueprint)

### T17NetConfig (ScriptableObject)

Configuration asset holding:
- `PhotonAppId` / `PhotonAppVersion`
- `ServerAddress` / `UseNameServer` / `FixedRegion`
- `EncryptionKeys` array
- `EnableTrafficStats`, `LagSimulationSettings`, `PeerLogLevel`
- Timeout and disconnect thresholds
- Room creation limits (`MaxPlayers`, `EmptyRoomTTL`, `PlayerTTL`)
- `PUNLogLevel`
- Crossplay platform icons

### T17NetworkManager

A small manager that provides an `Awake()` hook to configure `PhotonNetwork` settings from `T17NetConfig` before Photon initializes.

---

## Connection State Machine (T17NetConnectAndJoinRoom)

Drives all connection workflow via a **stack-based state machine**. Each state is a `T17NetAgentBase` subclass.

### Agent Stack & Execution

- Agents exist as a flat list, with an **active index** (`_currentAgentIndex`).
- Only **one agent executes at a time**.
- Agents can push follow-up agents onto the stack, creating sequences.
- When an agent `Done()`s (success), the next agent begins.
- When an agent `Failed()` (error), an `OnNetConnectionFailed` event fires and a retry/quit prompt is shown.

**States are implemented as these agents:**

| Agent | Purpose |
|-------|---------|
| `T17NetAgentInit` | Ensures Photon is connected; if not, connects. |
| `T17NetAgentEnsureLobby` | Ensures we join the correct Photon lobby (PvP or Coop). |
| `T17NetAgentCreateRoom` | Calls `PhotonNetwork.CreateRoom()` with room options (max players, visibility, custom properties). |
| `T17NetAgentJoinRoom` | Calls `PhotonNetwork.JoinRoom()` by name. |
| `T17NetAgentJoinRandomRoom` | Calls `PhotonNetwork.JoinRandomRoom()` with matchmaking filters. |
| `T17NetAgentStartGame` | Final state: loads the game scene additively, spawns the `T17NetRoomGameView`, and signals completion. |
| `T17NetAgentWaitForCloudWait` | Handles a "cloud wait" period (room list before rejoin). |

### Execution Flow Examples

**Host Game:** `Init` → `EnsureLobby` → `CreateRoom` (with room options) → `StartGame`

**Join (by name or invite):** `Init` → `EnsureLobby` → `JoinRoom` (by name) → `StartGame`

**Quick Match:** `Init` → `EnsureLobby` → `JoinRandomRoom` (with filters) → `StartGame`

**Reconnect:** `Init` → `EnsureLobby` → `WaitForCloudWait` → `JoinRoom` → `StartGame`

### Room Options (T17NetRoomOptions)

Built before creating a room:
- `MaxPlayers` (from T17NetConfig or game mode)
- `IsVisible` / `IsOpen`
- `CustomRoomProperties` (a `Hashtable`):
  - `RoomCode` – 6-character join code
  - `MapName` – level identifier
  - `MapDisplayName` – localized display name
  - `CurrentPlayerCount`, `MaxPlayerCount`
  - `GameMode` – "PVP" or "COOP"
  - `GameType` – "Prison" or "Blueprint"
  - `HostPlatform` – platform of the host
  - `HostUserId` / `HostUserName`
  - `CrossplayMask`
  - `EncryptionKeyType`
  - `VersionCompatibility` – game version string
  - `Levels` – semicolon-separated level list (BluePrints)
  - `Tags` – Free-form tag list
- `CustomRoomPropertiesForLobby` – which keys are visible in the room list

### Error Handling & Retry

On failure, the `OnNetConnectionFailed` event fires with:
- `FailReason` enum: `None, CreateRoomFailed, JoinRoomFailed, JoinRandomRoomFailed, NotConnectedToMaster, NotJoinedLobby, StartGameFailed`
- A UI prompt offers **Retry** or **Quit to Main Menu** (if not in-game).

---

## Room & Matchmaking

### Room List

When in a Photon lobby, `PhotonNetwork.GetRoomList()` returns available rooms. The system filters these:

**T17NetRoomInfoFilter** – a ScriptableObject filter used to pre-filter rooms:
- `MinimumNumberOfPlayers` / `MaximumNumberOfPlayers`
- `MinLevelsX` / `MaxLevelsX`
- `GameMode` filter (PvP, Coop, or Any)
- `GameType` filter (Prison, Blueprint, or Any)

**PunRoomListHelper** – MonoBehaviour that:
- Listens to `PhotonNetwork.OnRoomListUpdate` (internal Photon callbacks)
- Caches the filtered list of rooms
- Emits `RoomListChanged` event
- Exposes `RoomCount` property

**Lobby room list UI** (`T17NetRoomListScreen`):
- Populates a scroll list from `PunRoomListHelper`
- Each entry is a `RoomInfoListEntry` (UI prefab)
- Shows: room name, player count, map, game mode, host name
- Join button triggers `T17NetAgentJoinRoom`

### Quick Match

- Calls `PhotonNetwork.JoinRandomRoom()` with matchmaking filters derived from local player preferences:
  - Game Mode (PvP/Coop)
  - Game Type (Prison/Blueprint)
  - Crossplay settings
  - `ExpectedMaxPlayers`
  - `ExpectedUsers` (for party join)
- On failure, optionally creates a new room.

### Private Rooms

- Rooms created with `IsVisible = false`
- A **6-character RoomCode** is generated (uppercase alphanumeric, no ambiguous chars)
- The code is set as a custom room property (`RoomCode`) and also exposed as the `RoomCode` property on `T17NetManager`
- A shareable URL is built: `teardown://join?room=<code>`
- The invite system uses this URL for deep linking

### Lobby Types

- `PunLobbyType` enum in `PunLobbyTypeHelper`: `Default, PvP, Coop, Sql`
- `Sql` is used for SQL-style lobby queries if using Photon's matchmaking
- `PvP` / `Coop` are custom lobby names

### Room Cleanup

- `EmptyRoomTTL` and `PlayerTTL` are set from config
- On `PhotonNetwork.LeaveRoom()`, the `T17NetManager` emits `LeftRoom` event

---

## Photon Integration Layer

### T17NetView (MonoBehaviour)

Custom wrapper around `PhotonView`:
- Has a unique `NetViewID` (int)
- Registers/unregisters itself with `T17NetManager.NetViews`
- Provides `OwnerID` (who owns/controls this networked object)
- Provides `IsMine` – true if the local client is the owner
- Provides `IsRoomView` – true if this is the room-global view (not owned by any player)
- **Synchronization**: Component-based synch via `T17NetSyncBehaviour` (see below)
- **Ownership**: Supports `OwnerShipMode`:
  - `Fixed` – owner never changes
  - `Request` – ownership can be requested (e.g., object lock)
  - `Takeover` – ownership can be taken
- Custom Properties per view via `T17NetViewCustomProperty`

**Room View** – A special `T17NetView` with `IsRoomView = true`. Used for room-global synchronization (game state, load sync).

### T17NetSyncBehaviour

Component attached to a `T17NetView` to synchronize specific data. Works in two modes:

1. **Owner Write → Others Read**: The owner (IsMine) writes data; all other instances read.
2. **All Write (for room views)**: Everyone can write.

Key methods:
- `OnSync(stream)` – Serialize/deserialize custom data via `T17NetSyncStream`
- `OnRequestWrite()` – Called to determine if a write should happen
- `HasDataToSync` / `HadDataToSync` – Write pending/just-wrote flags
- `NetSyncType` enum: `Delta, Full, Once, Off`

**Example implementors:**
- `T17NetRoomGameView` – syncs game state
- `NetCharacterObserved` – syncs character transforms and state
- `NetPlayerObserved` – syncs player data
- `NetObjectLock` – syncs lock state
- `T17NetLoadSync` – syncs loading progress

### T17NetSyncStream

Custom binary stream for `T17NetSyncBehaviour` serialization:
- Wraps `PhotonStream` (or a custom byte buffer)
- Provides typed read/write: `Bool`, `Int`, `Float`, `Vector3`, `Quaternion`, `String`, `Byte`, `Bytes`, `ByteEnum`
- `IsWriting` property to differentiate serialize vs deserialize path

### T17NetSendMonoMessageTarget

Attribute-like system for sending RPCs to `MonoBehaviour` targets:
- `T17NetSendMonoMessage(string methodName, T17NetSendMonoMessageTarget target, object[] args)`
- Target types: `All`, `AllBuffered`, `Others`, `OthersBuffered`, `MasterClient`
- Internally uses `PhotonView.RPC()` to call the method on the target component
- Used for sending "mono messages" to all players (e.g., start game, load complete)

### T17NetHelpers

Static utility methods:
- `GetLocalPlayerData()` – returns `T17NetLocalPlayerData`
- `GetNetViewManager()` – returns `T17NetManager` instance
- `GetCurrentRoom()` – returns `T17NetRoomGameView` for the current room
- `GetRoomViewT17NetView()` – returns the room's `T17NetView`
- `IsRoomOwner()` – checks if local client owns the room
- `GetT17NetView(NetViewID)` / `GetT17NetView(PhotonView)` – lookup
- `AreWeOffline()` – are we in offline/menu mode
- `IsNetViewIdValid(int)` – checks > 0
- `IsNetViewOurs(int)` / `IsNetViewTheirs(int)`
- `BroadcastNetMessage(string methodName, object[] args)` – sends mono message to all
- `SendNetMessageSecure` / `SendNetMessageToMasterClientSecure` – encrypted sends
- `GetNetworkObject<T>(NetViewID)` – generic typed lookup
- `InstantiateNetObject(GameObject prefab)` / `DestroyNetObject(T17NetView)` – networked instantiation
- `GetRandomJoinCode()` – generates a 6-char room code

### PhotonView / RPC Management

**T17NetRPC** – class that wraps a Photon RPC call:
- For reliability, falling back to raw `photonView.RPC()` if `T17NetSendMonoMessage` fails
- Handles buffered vs. non-buffered sends

---

## Load Synchronization

### T17NetLoadSync (MonoBehaviour)

Attached to the **Room View**. Synchronizes all player load states across the network.

**Process:**
1. Each player reports their loading progress via `UpdatePlayerLoadState(PlayerLoadState)`.
2. Data is serialized into `T17NetSyncStream` on `OnSync()`.
3. Deserialized on all clients to build a complete picture of who is loaded.

**PlayerLoadState** – `enum`:
- `None`
- `LoadingLevel`
- `DownloadingDependencies`
- `LoadingDependencies`
- `SettingUpPlayer`
- `Ready`
- `Failed`

**Events:**
- `OnAllPlayersReady` – All players have reached `Ready`.
- `OnPlayerLoadStateChanged(T17NetPlayer, PlayerLoadState)` – Individual updates.
- `OnPlayerJoinedLate` – Someone joined after the game started (late join).

### NetLoadManagerSync

Manages the **game ready state**:
- When all players are `Ready`, calls `StartGame()` on `GameManager`.
- If a player is `Failed`, handles error flow.

### PlayerLoadState

Tracks loading progress with these states:
1. `None` – hasn't started loading
2. `LoadingLevel` – loading main scene
3. `DownloadingDependencies` – downloading assets
4. `LoadingDependencies` – loading downloaded assets
5. `SettingUpPlayer` – player setup logic
6. `Ready` – fully loaded and ready to play
7. `Failed` – loading failed

Each player reports their state to the room view, which aggregates and triggers events.

---

## Game State Synchronization

### T17NetRoomGameView (MonoBehaviour)

Central game state synch object. Created when the game starts (by `T17NetAgentStartGame`).

**Custom Properties (Room → All clients):**
Synchronized via Photon's `Room.SetCustomProperties()`:
- `CurrentPlayerCount` (int)
- `MaxPlayerCount` (int)
- `GameState` (enum: `WaitingForPlayers`, `Loading`, `Playing`, `GameOver`)
- `CurrentLevelIndex` (int) – which level the group is on (BluePrints mode)
- `SelectedLevels` (string) – semicolon-separated list of chosen levels
- `Difficulty` (int/float)
- `StartTime` (long) – epoch timestamp when game started
- `GameTimeRemaining` (float) – for timed modes
- `PrisonDetails` (serialized JSON) – prison-specific data
- `BlueprintDetails` (serialized JSON) – blueprint-specific data
- `MapName` / `MapDisplayName`
- `ServerAnnouncement` (string) – admin broadcast messages

**Sync Behaviour:**
- Implements `T17NetSyncBehaviour` to sync a `T17NetRoomGameState`:
  - `GamePhase` enum
  - `CurrentLevel`
  - `LevelsRemaining`
  - `ElapsedGameTime`
  - `PrisonDetails` / `BlueprintDetails` blob
- Updated by the **Room Owner** (MasterClient) and read by all others.

**Events (UnityEvents):**
- `OnGameStateChanged`
- `OnLevelChanged`
- `OnPlayerJoined` / `OnPlayerLeft`
- `OnAllPlayersLoaded`
- `OnGameTimeUpdated`

### NetRoomCustomProperties

Helper to read/write typed properties from `Room.CustomProperties`:
- `SetProp<T>(key, value)` – sets a property
- `GetProp<T>(key, defaultValue)` – gets a property with fallback
- Change callbacks via `OnPropertyChanged`

---

## Player / Character Synchronization

### NetPlayerObserved

Synchronizes player-level data (not character):
- `PlayerName`
- `PlayerPlatform` + Platform icon ID
- `PlayerReady` status (lobby ready toggle)
- `PlayerTeam` (for team-based modes)
- `PlayerColor` / `PlayerCosmetics` selection
- `Ping` / `Latency`
- `IsAlive` / `IsSpectating`
- `Kills` / `Deaths` / `Score` (stat tracking)
- `CustomizationData` (serialized customization choices like outfit, hat, etc.)

Attached to each player's `T17NetView`. Owner writes, others read.

### NetCharacterObserved

Synchronizes per-frame character state:
- `Position` (Vector3) – smoothed via interpolation/ extrapolation
- `Rotation` (Quaternion)
- `Velocity` / `MovementDirection`
- `IsGrounded`, `IsJumping`, `IsSprinting`, `IsCrouching`
- `Health` / `Shield`
- `AnimationState` (enum / int) – current animation state ID
- `AnimationFloatParams` – float parameters for blend trees
- `WeaponEquipped` – ID of currently held weapon
- `AmmoInClip` / `ReserveAmmo`
- `InteractionState` – what the character is interacting with
- `EmoteState` – currently playing emote

**Owner writes → Others interpolate.** Uses `T17NetSyncBehaviour` with `NetSyncType.Delta` for efficiency.

### CharacterNetEvents

Manages one-shot networked events for characters:
- `TakeDamage(float amount, int attackerId, string damageType)`
- `Heal(float amount)`
- `Die(int killerId, string cause)`
- `Respawn(Vector3 position)`
- `PlayEffect(string effectName, Vector3 position, Quaternion rotation)`
- `PlaySound(string soundName)`
- `TriggerAnimation(string triggerName)`
- `EquipWeapon(int weaponId)`
- `DropWeapon(Vector3 position)`
- `Interact(int objectId, string interactionType)`

Uses `T17NetSendMonoMessage` (RPCs) for reliable delivery.

### CharacterSerializer

Handles efficient binary serialization of character state:
- Position delta compression
- Quaternion smallest-three compression
- Animation state as byte
- Health as half-float or byte
- Bitpacking for boolean flags

---

## Object Interaction (Locks)

### NetObjectLock

Synchronizes lock state on interactable objects (doors, gates, levers, etc.).

**Properties synced:**
- `IsLocked` (bool)
- `LockOwnerId` (int – player ID who locked it)
- `LockState` enum: `Unlocked, Locked, Locking, Unlocking`
- `LockTimeRemaining` (float) – for timed locks
- `InteractionCooldown` (float)

**Ownership Handling:**
- Objects use `OwnerShipMode.Request`
- When a player interacts, they **request ownership** via `T17NetView.RequestOwnership()`
- On ownership transfer, the new owner writes lock state
- After lock state is written, ownership returns to original (if `Fixed` mode) or stays (if `Request` mode)

**Events:**
- `OnLockStateChanged(bool isLocked, int ownerId)`
- `OnLockInteractionStart(int playerId)`
- `OnLockInteractionComplete(int playerId)`

### T17NetView Ownership

Methods:
- `RequestOwnership()` – asks MasterClient to transfer ownership
- `TransferOwnership(int playerId)` – force-transfer (MasterClient only)
- `OnOwnershipRequest(PhotonView ownerView, int requestingPlayer)` – callback for auth
- `OnOwnershipTransferred(int newOwnerId)`

---

## Crossplay

### CrossplayLobbyManager (ScriptableObject)

Manages platform-specific room filtering and crossplay settings.

**Key Properties:**
- `AllPlatforms` – list of supported platform enums
- `PlatformIcons` – mapping from Platform to Sprite
- `PlatformNames` – localized display names
- `CrossplayMask` – bitmask computed from enabled platforms

**Room Filtering:**
- Stores the `CrossplayMask` as a room custom property
- When querying room list, filters rooms whose `CrossplayMask` matches the local player's mask
- Quick match includes `CrossplayMask` in matchmaking filters

**Platform Detection:**
- `T17NetLocalPlayerData.Platform` is set at login
- `PhotonNetwork.LocalPlayer.SetCustomProperty("Platform", platformString)` is set on join
- Other players' platforms read from their player custom properties

**Crossplay Icons:**
- Each room list entry shows platform icons of connected players
- `CrossplayLobbyManager.GetPlatformIcon(Platform)` provides the Sprite

### Quick Match with Crossplay

- `PhotonNetwork.JoinRandomRoom()` uses `ExpectedProperties` filter including `CrossplayMask`
- Matchmaking ensures only rooms with compatible crossplay settings are returned
- If no match, a new room with the player's crossplay mask is created

---

## Lobby UI

### LobbyPlayerObject

Displays a player in the lobby (before game starts):
- Player name, platform icon, ready state toggle/indicator
- Color/cosmetic selection UI
- "Kick" button (host only)
- Ready state synchronized via `NetPlayerObserved`

### CoopPlayerObject

Similar to `LobbyPlayerObject` but for cooperative mode:
- Shows role/class selection (if applicable)
- Shows loadout preview
- Ready state indicator

### LobbyRoomInfoObject

Displays room information in the room list:
- Room name (truncated)
- Player count (current / max)
- Map name and thumbnail
- Game mode (PvP / Coop)
- Game type (Prison / Blueprint)
- Host name
- Platform icons of connected players
- Lock icon (if private room)
- Ping indicator
- Join button with click handler

### T17NetRoomListScreen

Main room list screen controller:
- Populates scroll rect from `PunRoomListHelper`
- Refresh button to manually refresh room list
- Filter toggles (game mode, game type, player count range)
- Quick match button
- Host game button → navigates to host settings screen
- Join by code input field (for private rooms / invites)
- Empty state ("No rooms found" message)

---

## Debug & Tools

### T17NetDebugPanel (MonoBehaviour)

In-game debug overlay for networking info:
- Connection status (Connected to Master/Lobby/Room, disconnected)
- Room name, player count
- Local player ID and ping
- RTT (Round Trip Time)
- Traffic statistics (bytes sent/received per second)
- Photon peer state (PeerState enum)
- List of connected players with their IDs, platforms, pings
- Custom room properties dump
- Log output window (last N log messages)
- Toggle for lag simulation
- Buttons: "Force Leave Room", "Quick Reconnect", "Show Traffic Stats"

Toggle visibility with a hotkey (F8 or configurable).

### T17NetPhotonLagSimulationGui

Wrapper around Photon's `LagSimulationGui`:
- Adds/removes the `LagSimulationGui` MonoBehaviour on `PhotonNetwork.PhotonView`
- Configurable lag/loss settings from `T17NetConfig`
- Can be enabled/disabled via debug panel

### T17NetPhotonTrafficStatsGui

Wrapper around Photon's `TrafficStatsGui`:
- Toggle visibility of Photon's built-in traffic stats overlay
- Configurable update interval

### PhotonRoomLog

Logging utility for room events:
- `PhotonRoomLog.Log(string message)` – timestamps and logs room events
- Output target configurable (console, file, debug panel)

---

## Networking Peer (Photon Peer)

### NetworkingPeer

A custom extension/wrapper around `PhotonPeer` / `LoadBalancingPeer`:
- Provides detailed logging of peer-level operations
- Tracks connection state transitions: `Disconnected → Connecting → Connected → JoinedLobby → JoinedRoom → Leaving`
- Handles **disconnect detection** and **auto-reconnect** logic
  - On disconnect: waits a configurable delay, then re-runs the connection state machine from `Init`
  - `MaxReconnectAttempts` before giving up
- `PeerState` enum: `Disconnected, Connecting, Connected, JoinedLobby, JoinedRoom, Disconnecting, Reconnecting`
- Exposes `BasePeer` for direct Photon access

### PhotonNetwork Layer

The system configures `PhotonNetwork` at startup:
- `PhotonNetwork.UsePunAppSettings = false` (uses `T17NetConfig` directly)
- `PhotonNetwork.EnableCloseConnection = true`
- `PhotonNetwork.NetworkingClient.EnableProtocolFallback = true` (TCP fallback if UDP fails)
- `PhotonNetwork.KeepAliveInBackground = 120` (seconds)

---

## Encryption & Security

### T17NetEncryptionKeys (ScriptableObject)

Manages symmetric encryption keys used for secure room communication:
- Array of `EncryptionKey` structs:
  - `KeyType` enum: `None, AES256, XOR_Simple, Custom`
  - `Key1` / `Key2` (byte arrays) – the actual key material
  - `Hash` – SHA256 hash for verification
- Selected via `T17NetLocalPlayerData.NetEncryptionKeyType`
- Used by `SendNetMessageSecure` / `SendNetMessageToMasterClientSecure` methods
- Encryption applied at the application layer (above Photon)

**Secure Messaging:**
- `T17NetHelpers.SendNetMessageSecure(string methodName, object[] args)`:
  - Serializes args to byte array
  - Encrypts with selected key
  - Sends via `T17NetSendMonoMessage` as `byte[]` encrypted payload
- Receiver decrypts and invokes method

---

## Friend Invites

### T17NetInvites

Integrates with platform invite systems (Steam, Epic, etc.):

**Workflow:**
1. Host creates a private room and gets the room code
2. `T17NetInvites.BuildInviteUrl()` generates `teardown://join?room=<CODE>`
3. Platform-specific invite mechanism opens (Steam overlay, EGS overlay, etc.)
4. Recipient clicks the invite link → deep link opens the game
5. Game reads room code from deep link URL → calls `T17NetAgentJoinRoom` with the code

**Platform Overlay Integration:**
- `OpenSteamInviteOverlay()` – opens Steam's friend invite UI
- `OpenEGSInviteOverlay()` – opens Epic's invite UI
- Fallback: clipboard copy of invite URL

---

## Time Management

### T17NetTimeManager

Manages synchronized game time across clients:

- `NetworkTime` (double) – Photon's `PhotonNetwork.Time`, synced via server
- `GameStartTime` – set by host when game begins
- `GameElapsedTime` – `NetworkTime - GameStartTime`
- `GameTimeRemaining` – for timed game modes (countdown)
- `IsPaused` – if the game is paused (all clients agree via room property)
- `TimeScale` – synced time scale (for slow-mo effects)

Provides:
- `GetSyncedTime()` – returns the authoritative game time
- `GetLocalTimeOffset()` – difference between local clock and network clock
- Events: `OnGameTimePaused`, `OnGameTimeResumed`, `OnGameTimeExpired`

---

## User Data & Analytics

### T17UserDataStore

Per-user persistent data store with network awareness:
- `UserId` → associates data with authenticated users
- Stores: display name, preferences (graphics, audio, controls), friend list, blocked list, recent players
- Syncs selected data to Photon custom player properties (e.g., display name)
- Provides `GetRecentPlayers()` – players met in recent games (by UserId)

### NetAnalytics

Sends telemetry/analytics events:
- Connection success/failure rates
- Matchmaking queue times
- Room join times (from room list to in-game)
- Player count distributions
- Disconnect reasons
- Performance metrics (RTT, packet loss)
- Platform distribution tracking

Events are queued and sent in batches to reduce overhead.

---

## Room Details (Prison / Blueprint)

### NetPrisonViewDetails

Prison-mode specific room properties:
- `PrisonId` / `PrisonName`
- `Difficulty` (Easy/Medium/Hard/Nightmare)
- `EscapePlan` – which escape method is active
- `GuardCount` / `GuardBehavior`
- `ToolsAvailable` – list of tools in the prison
- `TimeLimit` – for timed escape
- `ObjectiveState` – current prison objective progress
- Syncs via room custom properties (`PrisonDetails` JSON blob)

### NetBluePrintDetails

BluePrint-mode specific room properties:
- `BlueprintId` / `BlueprintName`
- `Levels` – array of level identifiers
- `CurrentLevelIndex` – which level the group is playing
- `LevelProgress` – per-level completion state
- `DifficultyProgression` – difficulty curve across levels
- `ContinueOnFail` – whether failing a level ends the run
- Syncs via room custom properties (`BlueprintDetails` JSON blob)

---

## Glossary

| Term | Definition |
|------|------------|
| PUN | Photon Unity Networking, the multiplayer framework |
| T17Net | Custom abstraction layer over PUN |
| NetViewID | Unique int identifying a networked object |
| Room View | Global `T17NetView` for room-scoped state |
| Room Owner | MasterClient – the player who created the room |
| NetSyncBehaviour | Component for custom data synch |
| Mono Message | RPC targeting a MonoBehaviour method |
| CrossplayMask | Bitmask of platforms allowed in a room |
| RoomCode | 6-char alphanumeric code for private room invites |
| PlayerLoadState | Enum tracking a player's loading progress |
| NetObjectLock | Lock state for interactable objects |
| Agent | A state in the connection state machine |
| Load Balancing | Photon's server infrastructure (Master → Lobby → Room) |
