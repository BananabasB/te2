# Interactions, Minigames & Audio System — The Escapists 2

## Table of Contents

1. [Core Interaction Framework](#1-core-interaction-framework)
2. [Animated Interaction System](#2-animated-interaction-system)
3. [Item Transfer Interactions](#3-item-transfer-interactions)
4. [Multi-Stage Construction & Escape Interactions](#4-multi-stage-construction--escape-interactions)
5. [Specialised Interactions](#5-specialised-interactions)
6. [Carry Systems](#6-carry-systems)
7. [Service & Job Interactions](#7-service--job-interactions)
8. [Minigame System](#8-minigame-system)
9. [Audio System](#9-audio-system)
10. [Animation & Effects](#10-animation--effects)
11. [Appendices](#11-appendices)

---

## 1. Core Interaction Framework

### 1.1 InteractiveObject (Base Class)

**File:** `Assembly-CSharp/InteractiveObject.cs`

All interactive objects in the game derive from `InteractiveObject : T17MonoBehaviour`. This is the abstract contract that defines how characters (player or AI) discover, reserve, start, and stop interactions.

#### Enums

| Enum | Values | Description |
|------|--------|-------------|
| `InteractiveType` | `Primary`, `Secondary`, `Tertiary`, `PressAndHold`, `PressAndHoldSecondary`, `PressAndHoldOnly` | Defines which input action triggers the interaction |
| `InteractiveEventType` | `ReadyStart`, `Started`, `ReadyEnd`, `Ended` | Lifecycle event phases |
| `CharacterResctrictions` | `AnyoneCanUse`, `PlayersOnly`, `AiOnly` | Who is allowed to interact |
| `InteractionType` | `InteractiveObject`, `AnimatedInteractiveObject`, `PortableInteractiveObject` | Runtime classification for serialization |

#### Key Serialised Fields

| Field | Type | Purpose |
|-------|------|---------|
| `m_InteractType` | `InteractiveType` | Input binding for this interaction |
| `m_AllowedCharacterTypes` | `CharacterResctrictions` | Access restriction |
| `m_bIsEnabled` | `bool` | Global enabled/disabled toggle |
| `m_bInteractionVisibility` | `bool` | Whether the interaction shows in the HUD |
| `m_ValidInteractingDirections` | `Direction[4]` | Allowed approach directions (up/down/left/right) |
| `m_AI_InteractionAffinity` | `float` | AI preference weight for this object |
| `m_interactingCharacter` | `Character` | Reference to actively interacting character |
| `m_vStartingPosition` | `Vector3` | Snap position for the character |
| `m_bObjectReserved` | `bool` | Reservation flag |
| `m_ReservingCharacterID` | `byte` | Who reserved it |
| `m_NetObjectLock` | `NetObjectLock` | Network lock for multiplayer contention |
| `m_NetViewID` | `T17NetworkViewID` | Network identity |
| `m_LocalInteractionID` | `int` | Local index for interaction tracking |
| `m_bLeaveCharacterPositionUnaltered` | `bool` | Skip position snapping |
| `m_bCanBeUsedOutsideJobTime` | `bool` | Allow usage outside scheduled job hours |
| `m_StopInteractionWalkThreshold` | `float` | Distance threshold for auto-stop when walking away |

#### Interaction Lifecycle

```
Reservation (NetObjectLock)
    │
    ▼
WalkToTarget (pathfinding)
    │
    ▼
OnStartInteraction()
    │
    ▼
InteractionReadyStart()
    │
    ├── InteractionReadyUpdate()  ← loop (every frame while ready)
    │
    ▼
InteractionReadyEnd()
    │
    ▼
OnExitInteraction()
    │
    ▼
RequestStopInteraction()
```

#### Core Methods

| Method | Purpose |
|--------|---------|
| `AllowedToInteract(Character, bool)` | Gate check — can this character start? |
| `InteractionVisibility(GameObject)` | Should the "press X" prompt show? |
| `CanStartOrContinueInteraction(Character)` | Runtime check during active interaction |
| `OnStartInteraction(Character)` | Enter the interaction (walk complete) |
| `OnExitInteraction(Character)` | Leave the interaction |
| `InteractionReadyStart()` | Begin ready phase (animation, lerp) |
| `InteractionReadyUpdate()` | Per-frame during ready phase |
| `InteractionReadyEnd()` | End ready phase |
| `RequestStopInteraction()` | Initiates stop (walk-away or immediate) |
| `StartInteractionWithTimeline(TimelineAsset)` | Play a Timeline sequence as the interaction |
| `OnReservationExpired()` | Called when NetObjectLock reservation times out |
| `SerialiseInteractionForLoad()` / `OnInteractionRestored()` | Save/load support |

#### Reservation System

Uses `NetObjectLock` for network-synchronised reservations. The lock prevents multiple characters from using the same object. A `OnReservationRevoked` delegate notifies when a lock is forcibly taken (e.g., by a guard searching a desk).

#### Delegates

```csharp
public delegate void OnReservationRevoked();
```

---

### 1.2 NodeCanvas AI Actions

Four NodeCanvas `ActionTask<AICharacter>` actions drive AI interaction behaviour:

#### Interact

**File:** `Assembly-CSharp/Interact.cs`

| Field | Type | Purpose |
|-------|------|---------|
| `m_interactionTarget` | `GameObject` | Target object to interact with |
| `m_interactionObjTarget` | `InteractiveObject` | Resolved component |
| `m_SpecificInteraction` | `string` | Type name for specific interaction class lookup |
| `kickedByCharacter` | `Character` | Who kicked the AI off this interaction |
| `m_bReturnOnStart` | `bool` | Immediately succeed on start |
| `m_bComplainAboutKick` | `bool` | Play complaint speech when kicked |

Resolves target component via `GetComponentInChildren<InteractiveObject>()` or `Type.GetType(m_SpecificInteraction)`. Uses `OnInteractResponse` / `OnInteractionEnded` callbacks; polls `CheckStatus()` in `OnUpdate()`.

#### StopInteraction

**File:** `Assembly-CSharp/StopInteraction.cs`

Simple action that calls `RequestStopInteraction()` on the character's current interaction. Includes a 3-second give-up timer — if the interaction doesn't stop within that window, the action fails.

#### RemoteInteract

**File:** `Assembly-CSharp/RemoteInteract.cs`

Forces a target character to interact with a target object:
- Calls `RemoteForceInteraction` on the target character
- If the target object is occupied, kicks the occupant via `m_NetObjectLock.KickInteractingCharacter()`
- Used for guard-directed interactions (e.g., sending an inmate to clean)

#### RandomInteraction

**File:** `Assembly-CSharp/RandomInteraction.cs`

AI chooses a random nearby interactive object during free time:

| Field | Type | Purpose |
|-------|------|---------|
| `m_bFreeTimeInteractions` | `bool` | Only pick free-time-eligible objects |
| `m_MinInteractionTime` | `float` | Minimum time to spend |
| `m_MaxInteractionTime` | `float` | Maximum time to spend |
| `m_fSameObjectCooldown` | `float` | Cooldown before reusing same object (default 15s) |

Uses `RoomBlob.GetInteractiveObjectsInRoom()` to find candidates, tracks cooldown epochs per object, integrates with pathfinding callbacks (find path → walk → interact).

---

### 1.3 InteractionItemRequiremetHelper

**File:** `Assembly-CSharp/InteractionItemRequiremetHelper.cs`

Simple validator component:
- `m_EquippedItemRequirement` — the required item type
- Checks if the interacting character has the item equipped
- If not, plays speech dialog `"Text.Emote.ItemNotEquipped"` with the required item name as token
- Returns `false` from `CheckRequirement()`, preventing interaction start

---

## 2. Animated Interaction System

### 2.1 AnimatedInteraction

**File:** `Assembly-CSharp/AnimatedInteraction.cs`

`AnimatedInteraction : InteractiveObject, ICullingWrapperListener` — extends the base class with animation playback, positional lerping, and direction-aware animation selection. Most gameplay interactions inherit from this rather than directly from `InteractiveObject`.

#### Key Serialised Fields

| Field | Type | Purpose |
|-------|------|---------|
| `m_InteractionPositionOffset` | `Vector3` | Offset from object origin for character placement |
| `bForceFaceInteractionTarget` | `bool` | Force character to face the object |
| `m_bFindNearestInteractionPosition` | `bool` | Pick the closest valid position from `m_ValidAnimationDirections` |
| `m_AnimationData` | `InteractObjAnimData` | ScriptableObject with animation clips |
| `m_ValidAnimationDirections` | `Direction[8]` | Per-direction animation variants |
| `m_InteractionObjectAnimator` | `Animator` | The object's animator (can be external reference) |
| `m_bTransitionToTarget` | `bool` | Lerp character to position on enter |
| `m_bTransitionFromTarget` | `bool` | Lerp character out of position on exit |
| `m_bInteractionReady` | `bool` | Flag set when lerp/walk completes |
| `m_ExitPositions` | `List<Vector3>` | Candidate exit points |
| `m_vExitPosition` | `Vector3` | Chosen exit position |
| `m_vInteractPosition` | `Vector3` | Chosen interaction position |
| `m_Z_Offset_Interaction` | `float` | Z-layer offset during interaction |
| `m_fTimer` / `m_fLerpTimer` / `m_fLerpTime` | `float` | Timing for animation and lerp |
| `m_Transition_Z_Offset` | `float` | Z offset during transition |

#### Animation State Machine

| State | Value | Description |
|-------|-------|-------------|
| `IDLE` | 0 | Not interacting |
| `START` | 1 | Enter animation playing |
| `PLAY` | 2 | Main interaction loop |
| `STOP` | 3 | Exit animation playing |
| `PLAYSTATE_A` | 4 | Alternate loop A |
| `PLAYSTATE_B` | 5 | Alternate loop B |

**Animator parameters:**
- `"AnimState"` (int) — drives the state machine
- `"SpecialToIdle"` (trigger) — transition back to idle
- `"SpecialToStop"` (trigger) — transition to stop
- `"HoldSpecialAnim"` (bool) — hold the special animation state

#### Direction Resolution

When `m_bFindNearestInteractionPosition` is true, `GetInteractionPosition()` evaluates an array of up to 8 `Direction` values to find the closest valid approach direction based on character position.

#### Exit Position Resolution

Uses pathfinding to find the nearest walkable exit tile from `m_ExitPositions`, favouring the original approach direction. If no exit is valid, the character walks back along their entry path.

#### Culling Wrapper

Implements `ICullingWrapperListener`:
- `CullingWrapper_OnBecameVisible()` — re-enables the animator
- `CullingWrapper_OnBecameInvisible()` — disables the animator for performance

---

### 2.2 InteractObjAnimData

**File:** `Assembly-CSharp/InteractObjAnimData.cs`

`ScriptableObject` asset that defines animation parameters for an interaction:

| Field | Type | Purpose |
|-------|------|---------|
| `enterAnimation` | `AnimationClip` | Character enter animation |
| `interactingAnimation` | `AnimationClip` | Loop while interacting |
| `exitAnimation` | `AnimationClip` | Character exit animation |
| `duration` | `float` | Total interaction duration |
| `lerpDuration` | `float` | Duration of position lerp |
| `walkWhilstLerping` | `bool` | Allow character to walk during lerp |

This is the designer-facing asset that plugs into `AnimatedInteraction.m_AnimationData`.

---

## 3. Item Transfer Interactions

### 3.1 TransferItemsInteraction

**File:** `Assembly-CSharp/TransferItemsInteraction.cs`

`TransferItemsInteraction : AnimatedInteraction` — core item transfer between a character and the object's container.

| Field | Type | Purpose |
|-------|------|---------|
| `m_TransferDirection` | `TransferDirection` | ToCharacter, FromCharacter, or Invalid |
| `m_bTransferEquippedItemsOnly` | `bool` | Only operate on equipped slot |
| `m_NoItemsLeftSpeech` | `string` | Dialog tag when container is empty |
| `m_bCycleThroughTransferItems` | `bool` | Cycle through items one at a time |

**`TransferDirection` enum:** `Invalid`, `ToCharacter`, `FromCharacter`

**Required component:** `ItemContainer` on the same GameObject.

**Delegate:** `TransferCompleteDelegate()` — fires when transfer finishes.

**Methods:**
- `DoItemTransferAndRequestStop()` — executes the transfer and stops
- `OnTransferComplete()` — calls the delegate
- `OnTransferFailed()` — handles failure (inventory full, no items)

**Audio:** Plays `Events.Play_Interaction_Generic` (Wwise event).

### 3.2 ItemInteraction

**File:** `Assembly-CSharp/ItemInteraction.cs`

`ItemInteraction : TransferItemsInteraction` — adds `m_bUniqueItemsOnly` (only accept items that aren't already in the container). Hooks into `GlobalStart` to ensure the `ItemManager` has initialised before becoming active.

### 3.3 CellBars_ItemInteraction

**File:** `Assembly-CSharp/CellBars_ItemInteraction.cs`

Manages covering cell bars with a bedsheet:

| Field | Type | Purpose |
|-------|------|---------|
| `m_BedSheet` | `Item` | The bedsheet item reference |

**Behaviour:**
1. Accepts a bedsheet item via transfer
2. Toggles the cell bars physics layer between `"Fence"` (solid) and `"BlockVision"` (permeable but blocks sight)
3. Updates `BarEventManager` with the new state
4. Toggles `NetObjectLock` proximity visibility (inmates can't see covered bars)
5. Sets animator parameter `"Covered"` (bool)
6. Plays state `"On State On Horizontal"` (full-screen blocking animation)

### 3.4 CellBed_ItemInteraction

**File:** `Assembly-CSharp/CellBed_ItemInteraction.cs`

Manages three items on the cell bed:

| Field | Type | Purpose |
|-------|------|---------|
| `m_BedSheet` | `Item` | Bedsheet for rope/dummy |
| `m_Pillow` | `Item` | Pillow |
| `m_BedDummy` | `Item` | Decoy dummy in bed |

**Animator parameters:** `"Dummy"`, `"Pillow"`, `"Sheet"` (all bools).

**Rules:**
- Cannot remove sheet when pillow is on the bed
- `AllowedToInteract` returns `false` if the bed has no items available to give (all slots empty)
- Integrates with `BedEventManager` for AI awareness

### 3.5 MultiStageTransferInteraction

**File:** `Assembly-CSharp/MultiStageTransferInteraction.cs`

`MultiStageTransferInteraction : TransferItemsInteraction` — delegates transfer logic to an `IMultistageTransferInteractionResponder` (one-child limit).

The responder interface defines:
- `OnItemTransfered(Item, Character)` — called when an item is transferred
- `GetValidInteractionItems()` — returns the list of items valid for the current stage

---

## 4. Multi-stage Construction & Escape Interactions

### 4.1 MultistageInputInteraction

**File:** `Assembly-CSharp/MultistageInputInteraction.cs`

`MultistageInputInteraction : T17MonoBehaviour, IMultistageTransferInteractionResponder, Saveable, INetworkLoadable` — the core multi-stage construction system used for escape methods, job stations, and other progressive interactions.

#### Stage Class

| Field | Type | Purpose |
|-------|------|---------|
| `m_ItemRequired` | `Item` | Item needed for this stage |
| `m_CharacterSucceedDialog` | `string` | Speech on correct item |
| `m_CharacterWrongDialog` | `string` | Speech on wrong item |
| `m_SignDialog` | `string` | Speech to bystanders |
| `m_StageCompleteSound` | `string` | Audio event on completion |
| `m_StageObjectA` / `m_StageObjectB` | `GameObject` | Visual state objects (toggle on/off) |
| `m_IntellectRequired` | `int` | Minimum intellect stat |
| `m_StaminaRequired` | `int` | Minimum stamina stat |
| `m_StrengthRequired` | `int` | Minimum strength stat |
| `m_bIsProgressedViaExternal` | `bool` | Progress comes from another interaction |

#### Core Fields

| Field | Type | Purpose |
|-------|------|---------|
| `m_Stages` | `Stage[]` | Ordered array of construction stages |
| `m_CurrentStage` | `int` | Current stage index |
| `ModeSupportedTypes` | `enum` | SinglePlayer, MultiPlayer, Dynamic |

#### Network Sync

Stage progression uses `RPC_SetStage(int stage)` for network synchronisation. Supports save/restore via `SaveData_MultistageInputInteraction_V1` data structure.

#### Key Methods

| Method | Purpose |
|--------|---------|
| `ProgressToNextStage(Character)` | Advance one stage, validate stat requirements |
| `OnInteractedWithFinalStage(Character)` | Hook for escape/job completion |
| `CheckCorrectAmountOfPlayers()` | Multiplayer player count validation |
| `SetStage(int stage)` | Set current stage (RPC) |

**Required components:** `ItemContainer`, `NetObjectLock`, `MultiStageTransferInteraction`, `T17NetView`

### 4.2 MultistageInputProgressorInteraction

**File:** `Assembly-CSharp/MultistageInputProgressorInteraction.cs`

`MultistageInputProgressorInteraction : MultistageInputInteraction` — forwards progress to another interaction:

| Field | Type | Purpose |
|-------|------|---------|
| `m_InteractionToProgress` | `MultistageInputInteraction` | The target interaction to progress |
| `m_InteractionMinRequiredStage` | `int` | Minimum stage on target before this can progress |

On item transfer, instead of advancing its own stage, it calls `ProgressToNextStage()` on the target interaction.

### 4.3 ConstructEndgameInteraction

**File:** `Assembly-CSharp/ConstructEndgameInteraction.cs`

`ConstructEndgameInteraction : MultistageInputInteraction` — base class for all escape method interactions.

| Field | Type | Purpose |
|-------|------|---------|
| `m_EscapeMethod` | `EscapeMethod` | The escape method identifier |
| `m_EscapeCutscene` | `Cutscene` | Cutscene to play on escape |
| `m_EscapeNameplateText` | `string` | Text on escape nameplate |
| `m_TrackedItemsToSpawn` | `TrackedItemSpawnEntry[]` | "Hot" items to spawn in random desks |

**Player validation:**
- `m_TooManyPlayersDialog` — speech when too many players present
- `m_TooFewPlayersDialog` — speech when too few players present
- `m_InvalidMultiplayerProximityDialog` — speech when players aren't nearby

On final stage, spawns tracked items into random desks and triggers the escape cutscene.

### 4.4 GliderEscapeInteraction

**File:** `Assembly-CSharp/GliderEscapeInteraction.cs`

`GliderEscapeInteraction : ConstructEndgameInteraction` — requires all tiles in `m_TilesToDestroy` (list of `DamagableTile`) to be fully damaged before the final stage becomes available. Overrides `Child_CanInteract()`.

### 4.5 CivilianClothesEscapeInteraction

**File:** `Assembly-CSharp/CivilianClothesEscapeInteraction.cs`

`CivilianClothesEscapeInteraction : ConstructEndgameInteraction` — requires the character to be wearing `m_RequiredOutfit` (OutfitType) at the final stage. Overrides `Child_CanInteract()`.

### 4.6 TransportEscapeInteraction

**File:** `Assembly-CSharp/TransportEscapeInteraction.cs`

`TransportEscapeInteraction : ConstructEndgameInteraction` — requires all `m_ProtectingGuards` (Guard list) in the same room to be knocked out before the final stage. Overrides `Child_CanInteract()`.

### 4.7 RepeatProcessEscapeInteraction

**File:** `Assembly-CSharp/RepeatProcessEscapeInteraction.cs`

`RepeatProcessEscapeInteraction : ConstructEndgameInteraction` — requires repeated completions before final stage:

| Field | Type | Purpose |
|-------|------|---------|
| `m_Count` | `int` | Number of completions required |
| `m_MoreNeededDialog` | `string` | Speech when more reps needed |
| `m_CompletedDialog` | `string` | Speech when done |

Tracked via `m_CurrentProgressCount`; final stage progression only allowed when `m_CurrentProgressCount >= m_Count`.

---

## 5. Specialised Interactions

### 5.1 Desk System

#### DeskInteraction

**File:** `Assembly-CSharp/DeskInteraction.cs`

`DeskInteraction : AnimatedInteraction, IControlledUpdate` — full desk mechanic with opening, closing, contraband detection, and inventory management.

| Field | Type | Purpose |
|-------|------|---------|
| `m_DeskOpeningTextTag` | `string` | Speech when opening |
| `m_DeskOpeningTime` | `float` | How long to hold to open |
| `m_DeskOwner` | `Character` | Assigned inmate owner |
| `m_LinkedItemContainer` | `ItemContainer` | The desk's inventory |

**Static lists:**
- `m_InmateDesks` — all desks assigned to inmates
- `m_PlayerInmateDesks` — desks assigned to player inmates

**Behaviour:**
- Timed opening animation with radial progress visual
- Contraband detection — flags items that shouldn't be in the desk
- Opens container UI for search/placement
- Integrates with climbable system (desks can be climbed over)
- Extensive AI event integration via `DeskEventManager`

#### DeskEventManager

**File:** `Assembly-CSharp/DeskEventManager.cs`

`DeskEventManager : EventManager` — manages two AI events:
- `m_InvestigateObject` — guard investigates a suspicious desk
- `m_ContrabandInDesk` — guard finds contraband in a desk

Uses `AIEventManager` delegates and implements config overrides for investigation behaviour.

#### DeskTutorialHandler

**File:** `Assembly-CSharp/DeskTutorialHandler.cs`

`DeskTutorialHandler : IGMTutorialArrowHandler` — tutorial arrow system for DeskMenu. Tracks `m_TrackedTargets` (items) and `m_ContainerToRegister` for the tutorial arrow to follow.

---

### 5.2 Toilet System

#### ToiletInteraction

**File:** `Assembly-CSharp/ToiletInteraction.cs`

`ToiletInteraction : AnimatedInteraction, IControlledUpdate` — the most complex single interactive object in the game, managing flushing, flooding, draining, and item hiding.

| Field | Type | Purpose |
|-------|------|---------|
| `m_ToiletFlushTime` | `float` | Duration of flush animation |
| `m_FloodingChance` | `float` | Probability that flushing causes flooding |
| `m_FloodWaterPrefab` | `GameObject` | Water visual prefab for flooding |
| `m_FloodSpreadTime` | `float` | Time for flood to spread |

**`FloodingStatus` enum:** `None`, `Flooding`, `Flooded`, `Draining`

**`TPData` struct:** Pathfinding distance data to nearest flood points.

**Behaviour:**
1. Player flushes toilet
2. Random chance (`m_FloodingChance`) triggers a flood
3. Flood spawns water prefab, spreads over time
4. Water must be mopped up (draining phase)
5. Integrated `ItemContainer` for hiding contraband in the cistern

**Audio:** `Events.Play_Env_Toilet_Flush`, `Events.Play_Env_Toilet_Flood`

**Serialization:** Uses `ToiletInteractionDeserializer` bridge to `NetPrisonViewDetails.Instance.ToiletInteractionData`.

#### ToiletEventManager

**File:** `Assembly-CSharp/ToiletEventManager.cs`

`ToiletEventManager : EventManager` — AI events for toilet:
- `m_ToiletFlood` — guard responds to flooding
- `m_ContrabandInToilet` — guard finds contraband

Floor-aware (handles multi-storey toilet positioning). Integrates with plumbing job system.

#### ToiletMenu

**File:** `Assembly-CSharp/ToiletMenu.cs`

`ToiletMenu : GameMenuBehaviour` — UI for the toilet interaction:
- Shows inventory (hidden contraband)
- Flush button
- Clog probability system (`DEBUG_ALWAYS_CLOG` for testing)

#### ToiletInteractionDeserializer

**File:** `Assembly-CSharp/ToiletInteractionDeserializer.cs`

`ToiletInteractionDeserializer : IDeserializable` — serialization bridge that reads/writes `ToiletInteractionData` from `NetPrisonViewDetails.Instance`.

---

### 5.3 Comfort & Recovery Interactions

#### ChairInteraction

**File:** `Assembly-CSharp/ChairInteraction.cs`

`ChairInteraction : AnimatedInteraction` — sitting interaction.

| Field | Type | Purpose |
|-------|------|---------|
| `m_EnergyIncreaseWithTray` | `float` | Extra energy gain multiplier when holding a tray |

- Periodically restores health and energy
- Energy gain doubled when character has a tray
- Tracks occupancy (one chair, one person)
- Drops tray on exit (instantiates tray item world object)
- Audio: `Events.Play_Player_Rest`

#### BedInteraction

**File:** `Assembly-CSharp/BedInteraction.cs`

`BedInteraction : AnimatedInteraction` — sleeping interaction.

- Restores health and energy over time
- Links to `m_CellBedInteraction` (the cell bed item system)
- Shows save game menu when sleeping in a bed
- Recalculates stats on awake (daily routine processing)
- Plays `Events.Play_Player_Rest`

#### SolitaryBedInteraction

**File:** `Assembly-CSharp/SolitaryBedInteraction.cs`

`SolitaryBedInteraction : BedInteraction` — forces `RegainConsciousness()` on start (used when the AI is knocked out and wakes up in solitary). Also plays `Events.Play_Solitary_Sting`.

#### MedicBedInteraction

**File:** `Assembly-CSharp/MedicBedInteraction.cs`

`MedicBedInteraction : BedInteraction` — medical ward bed:

| Field | Type | Purpose |
|-------|------|---------|
| `m_ConvalescenceMinimumTime` | `float` | Minimum stay (default 5s) |
| `m_ConvalescenceMaximumTime` | `float` | Maximum stay (default 20s) |

- Fully restores health over the convalescence period
- Sets `StatModifierEnum.MedicalSleeping`
- Pauses AI movement during treatment

#### ShowerInteraction

**File:** `Assembly-CSharp/ShowerInteraction.cs`

`ShowerInteraction : AnimatedInteraction` — shower block.

- Applies `StatModifierEnum.Shower` state
- Periodically increases health and energy
- Tracks shower duration for the "Crikey" steam achievement
- Audio: `Events.Play_Env_Shower_Loop`

#### KennelInteraction

**File:** `Assembly-CSharp/KennelInteraction.cs`

`KennelInteraction : AnimatedInteraction` — hides non-dog characters (dogs can't use kennels). Plays `Events.Play_Player_Rest` on start and exit.

#### LockerInteraction

**File:** `Assembly-CSharp/LockerInteraction.cs`

`LockerInteraction : AnimatedInteraction` — hide in a locker.

- Sets character visibility to false (hides inside)
- Toggles NPC pin visibility in Versus mode
- Audio: `Events.Play_Player_Locker_Enter`, `Events.Play_Player_Locker_Exit`

#### ChargingPodInteraction

**File:** `Assembly-CSharp/ChargingPodInteraction.cs`

`ChargingPodInteraction : AnimatedInteraction` — robotic charging station.

- Hides character during charging
- Applies `StatModifierEnum.Sitting`
- Restores health/energy
- Uses locker enter/exit audio events

---

### 5.4 Study & Reading

#### StudyInteraction

**File:** `Assembly-CSharp/StudyInteraction.cs`

`StudyInteraction : AnimatedInteraction` — reading minigame for stat development.

| Field | Type | Purpose |
|-------|------|---------|
| `m_ReadingMasherSettings` | `ReadingMasher.MasherSettings` | Masher configuration |
| `m_IntellectReward` | `int` | Intellect XP per completion |
| `m_StaminaLoss` | `int` | Stamina drain per completion |

- Uses `ReadingMasher` minigame (see Minigame System section)
- Applies config modifier from `m_Reading_RewardModifier`
- `CanStartOrContinueInteraction()` checks minimum energy threshold
- Applies `StatModifierEnum.Sitting` during reading
- Plays `Events.Play_Player_Rest`

---

### 5.5 Gym Equipment

#### GymInteraction

**File:** `Assembly-CSharp/GymInteraction.cs`

`GymInteraction : AnimatedInteraction` — complete gym equipment system supporting 7 equipment types.

**`GymInteractionType` enum:**

| Type | Masher | Stat Rewarded |
|------|--------|---------------|
| `WeightLifting` | `AlternateButtonMasher` | Strength |
| `PullUp` | `GymMasher_Pullup` | Strength |
| `Kettlebells` | `GymMasher_KettleBelts` | Fitness |
| `Threadmill` | `GymMasher_Threadmill_ExerciseBike` | Cardio |
| `ExerciseBike` | `GymMasher_Threadmill_ExerciseBike` | Cardio |
| `PommelHorse` | `GymMasher_Pommel_Footbag` | Fitness |
| `Footbag` | `GymMasher_Pommel_Footbag` | Fitness |

**Rep System:**
- Two-stage animation per rep: `m_RepFirstStage` / `m_RepSecondStage` (GameObject visual states)
- Stat changes: `m_StrengthChange`, `m_EnergyChange`, `m_CardioChange`
- `m_StaminaDrainPerRep` — stamina cost per rep
- `m_RepTime` — time per rep

**Reward Mapping:** Uses `MinigameCompletionHelper` with `m_NumRepsForCompletion` (players) and `m_TimeForAiAutoCompletion` (AI). Configurable via `MinigameConfig`.

#### GymMasherBase

**File:** `Assembly-CSharp/GymMasherBase.cs`

`GymMasherBase : MasherBase, IMinigameMasher` — base class for all gym minigame mashers.

| Field | Type | Purpose |
|-------|------|---------|
| `m_CharacterOffset` | `float` | Y-offset for HUD positioning |
| `WorldSpaceHudScalePODO` | (struct) | Positioning data |
| `m_IsRepACompleted` / `m_IsRepBCompleted` | `bool` | Per-rep completion flags |

**Methods:**
- `ConsumeIsRepACompleted()` / `ConsumeIsRepBCompleted()` — check and clear completion flags
- `PositionForPlayer(Player)` — per-frame HUD position update
- `Reset()` — reset masher state
- `SetPlayerToCheck(Player)` — set which player's input to read

Holds `AlternateButtonMasher.MasherState` field for sub-types to use.

#### GymMasher_WeightLifting

**File:** `Assembly-CSharp/GymMasher_WeightLifting.cs`

Alternating-button weightlifting minigame:
- Rising slider bar with a threshold zone
- Two alternating button presses fill a gain value
- When gain passes threshold: success; otherwise: fail
- Three-light indicator progression
- Stamina cost per attempt

#### GymMasher_KettleBelts

**File:** `Assembly-CSharp/GymMasher_KettleBelts.cs`

Kettlebells holding minigame:
- Slider with a safezone window
- Gain fills while slider is in safezone
- Gain decays outside safezone
- Threshold increases over time (gets harder)
- Three-light indicator for progress

#### GymMasher_Pullup

**File:** `Assembly-CSharp/GymMasher_Pullup.cs`

Pullup timing minigame:
- Moving slider indicator
- Shrinking threshold zone (tightens over time)
- Two alternating button presses when indicator is within zone
- Stamina drain at set intervals

#### GymMasher_Threadmill_ExerciseBike

**File:** `Assembly-CSharp/GymMasher_Threadmill_ExerciseBike.cs`

Treadmill/exercise bike endurance minigame:
- Alternating-button fill bar with continuous decay
- Decay rate increases over time
- Optional single-button mode (accessibility)

#### GymMasher_Pommel_Footbag

**File:** `Assembly-CSharp/GymMasher_Pommel_Footbag.cs`

Pommel horse/footbag dexterity minigame:
- Two moving markers on a single slider (left/right)
- Shrinking safezone
- Alternating button presses required
- Distance counter tracks total "reps"

---

### 5.6 Information & UI Interactions

#### GuardBoardInteraction

**File:** `Assembly-CSharp/GuardBoardInteraction.cs`

`GuardBoardInteraction : InteractiveObject` — opens guard job board:
```csharp
InGameMenuFlow.Instance.OpenGuardBoard();
```
Plays `Events.Play_UI_JobBoard_In`.

#### GuardComputerInteraction

**File:** `Assembly-CSharp/GuardComputerInteraction.cs`

`GuardComputerInteraction : AnimatedInteraction` — immediately stops interaction on `InteractionReadyUpdate()`. Clears the remote interactive object reference on `OnExitInteraction`.

#### GuardOutfitCrateInteraction

**File:** `Assembly-CSharp/GuardOutfitCrateInteraction.cs`

`GuardOutfitCrateInteraction : AnimatedInteraction` — only guards can interact (`CharacterRole.Guard` checks in both `AllowedToInteract` and `InteractionVisibility`). Disallows other players from seeing the HUD prompt.

#### InformationBoardInteraction

**File:** `Assembly-CSharp/InformationBoardInteraction.cs`

`InformationBoardInteraction : InteractiveObject` — opens the information board:

| Field | Type | Purpose |
|-------|------|---------|
| `m_BoardTitleTag` | `string` | Localisation tag for title |
| `m_BoardBodyTag` | `string` | Localisation tag for body text |
| `m_AnalyticsRef` | `string` | Optional analytics event name |

Plays `Events.Play_UI_JobBoard_In`.

#### SignPostInteraction

**File:** `Assembly-CSharp/SignPostInteraction.cs`

`SignPostInteraction : InteractiveObject` — opens sign post UI:
```csharp
InGameMenuFlow.Instance.OpenSignPost(m_TitleText, m_BodyText, m_Sprite);
```
Plays `Events.Play_UI_JobBoard_In`.

#### SignPost (UI)

**File:** `Assembly-CSharp/SignPost.cs`

`SignPost : GameMenuBehaviour` — UI class for displaying sign post content:
- Displays localised title text, body text, and a sprite
- `Close()` method calls `RequestStopInteraction()` on the current player character
- Integrates with `T17Close` for close button/back input

---

### 5.7 Other Interactions

#### FishingInteraction

**File:** `Assembly-CSharp/FishingInteraction.cs`

`FishingInteraction : AnimatedInteraction` — fishing minigame.

| Field | Type | Purpose |
|-------|------|---------|
| `m_BaitedFishingRodItem` | `Item` | Required baited rod |
| `m_FishRewardItem` | `Item` | Fish given on success |

**Flow:**
1. Check character has baited fishing rod → dialog if missing (`"Text.Emote.NeedFishingRod"` / `"Text.Emote.NeedFishBait"`)
2. Check inventory space for fish → dialog if full (`"Text.Emote.InventoryFull"`)
3. Show/hide fishing rod visual on character
4. Start `ReadingMasher` minigame
5. On completion, give fish reward (tracked per character via `m_FishRewardMap`)

#### GeneratorInteraction

**File:** `Assembly-CSharp/GeneratorInteraction.cs`

`GeneratorInteraction : AnimatedInteraction` — disables the `Generator` component on interaction start. Sets animator `"On"` bool to false. Object visibility linked to generator active state (invisible when generator is off).

#### IdleHoldInteraction

**File:** `Assembly-CSharp/IdleHoldInteraction.cs`

`IdleHoldInteraction : AnimatedInteraction` — toggleable interaction via `RPC_SetCanInteract(bool)`. Both `InteractionVisibility()` and `AllowedToInteract()` check `m_InteractionAllowed` flag.

#### TalkInteraction

**File:** `Assembly-CSharp/TalkInteraction.cs`

`TalkInteraction : InteractiveObject` — character conversation interaction.

**Checks:**
- Quest delivery (player's `TryDeliverItem` delegates)
- Quest availability on the target character
- Robinson Crusoe quest flag (unique NPC quest)

**Behaviour:**
- Opens character's `ItemContainer` for quest/favour view
- Plays `"Text.Player.ThanksForThat"` speech on successful item delivery
- Links to the Character's quest FSM

---

## 6. Carry Systems

### 6.1 CarryInteraction

**File:** `Assembly-CSharp/CarryInteraction.cs`

`CarryInteraction : InteractiveObject` — pickup and carry knocked-out characters.

| Field | Type | Purpose |
|-------|------|---------|
| `m_KOCharacter` | `Character` | The character being carried |
| `m_Carrier` | `Character` | The character doing the carrying |
| `m_KOCharacterAnimator` | `Animator` | Animator of the carried character |
| `m_CarrierCharacterAnimator` | `Animator` | Animator of the carrier |

**Animation:** Sets `AnimState.IdleCarry` on both characters.

**Network sync:**
- `RPC_PickUpCharacter(CharacterID)` — sync pick-up across network
- `RPC_DropCharacter()` — sync drop

**Audio:** `Events.Play_Player_Pickup_Item` (pickup), `Events.Play_Player_Combat_Hit_Generic` (when dropping a KO'd character forcefully)

**Visibility:** Only visible when a KO character is knocked out nearby. Uses `NetObjectLock` to prevent multiple carriers on the same KO character.

### 6.2 CarryObjectInteraction

**File:** `Assembly-CSharp/CarryObjectInteraction.cs`

`CarryObjectInteraction : InteractiveObject` — pickup and carry physics objects (furniture, props).

| Field | Type | Purpose |
|-------|------|---------|
| `m_CarryOffset` | `Vector3` | Position offset while carrying |
| `m_Decoration` | `AIDecoration` | AI decoration placement data |

**Decoration system:** Objects can be placed in predefined Desk or Job decoration positions. Uses `GetDecorationPosition()` to find valid placement.

**Pickup/Drop:**
- Toggles box collider and rigidbody on/off
- Updates climbable tag (can't climb a carried object)
- Tracks room assignment for object-placement logic
- `m_MovedObjects` dictionary tracks moved object coordinates for save serialization

**Network sync:**
- `RPC_PickUp(NetworkViewID)` — sync pickup
- `RPC_Drop(Vector3 position)` — sync drop

**Audio:** `Events.Play_Player_Pickup_Item`, `Events.Play_Jobs_JusticeTable_PickUp`

**Serialization:** Uses `NetSaveData` dictionary for persisting moved object state.

### 6.3 CarryObjectInteractionDeserialiser

**File:** `Assembly-CSharp/CarryObjectInteractionDeserialiser.cs`

`CarryObjectInteractionDeserialiser : IDeserializable` — deserialization bridge that reads carried object data from save state and repositions objects accordingly.

---

## 7. Service & Job Interactions

### 7.1 TrayInteraction

**File:** `Assembly-CSharp/TrayInteraction.cs`

`TrayInteraction : AnimatedInteraction` — meal tray pickup.

| Field | Type | Purpose |
|-------|------|---------|
| `m_TrayMaterials` | `Material[]` | Random material selection for visual variety |

**Behaviour:**
- Only visible and allowed during `Routines.MealTime`
- On start: selects random tray material, calls `SetHasTray(true)` on character, plays `Events.Play_Player_Pickup_Item`
- One-shot: immediately calls `RequestStopInteraction()` in `InteractionReadyUpdate()`

### 7.2 BeckonAndMinigameServeCustomerInteraction

**File:** `Assembly-CSharp/BeckonAndMinigameServeCustomerInteraction.cs`

Abstract class for job interactions that require:
1. Beckoning a customer to the service point
2. Playing a minigame to serve them

| Field | Type | Purpose |
|-------|------|---------|
| `m_BeckonCustomerComponent` | `BeckonCustomer` | Customer slot manager |
| `m_HasWaitingCustomerAnim` | `string` | Animator trigger for "customer waiting" |

**Flow:**
1. Link to `ServiceItemJob` for job context
2. Subscribe to `CustomerWaitingForServiceChangedEvent`
3. Check `m_BeckonCustomerComponent.IsAllowedToBeckonNewCustomer()` for beckon permission
4. On minigame completion, serve customer and beckon next

**NodeCanvas integration:** `CanServiceInteractionBeckonNextCustomer` (condition task) checks if AI can beckon.

### 7.3 BeckonCustomer

**File:** `Assembly-CSharp/BeckonCustomer.cs`

`BeckonCustomer : T17MonoBehaviour` — manages a single waiting customer slot.

| Method | Purpose |
|--------|---------|
| `CallForNextCustomer()` | Signal that a new customer can approach |
| `CancelRequestForCustomer()` | Clear the waiting slot |
| `IsAllowedToBeckonNewCustomer()` | Check if slot is free |

**RPCs:**
- `RPC_Master_SyncWaitingCustomer(int characterID)` — network sync
- `RPC_CLIENT_RecieveWaitingCustomer(int characterID)` — client notification
- `RPC_ALL_SetBeckoningCustomer(int characterID)` — set the beckoning customer

---

## 8. Minigame System

### 8.1 MasherBase

**File:** `Assembly-CSharp/MasherBase.cs`

`MasherBase : MonoBehaviour` — common base for all minigame masher UI elements.

| Field | Type | Purpose |
|-------|------|---------|
| `m_StatLabel` | `TextMeshProUGUI` | Stat name label |
| `m_StatSprite` | `Image` | Stat icon sprite |
| `m_ProgressSprite` | `Image` | Progress bar fill |
| `m_ProgressSlider` | `Slider` | Progress bar slider |

**Methods:**
- `SetStyle(StylePreset)` — Apply visual style preset
- `UpdateProgress(float value, float min, float max)` — Update progress bar
- `SetPlayerToCheck(Player)` — Set which player this masher responds to

### 8.2 StylePreset

**File:** `Assembly-CSharp/MinigameMashers/StylePreset.cs`

| Value | Description |
|-------|-------------|
| `Invalid` | No style |
| `Stength` | Strength-themed (note: typo in original) |
| `Fitness` | Fitness-themed |
| `Intelligence` | Intelligence-themed |

### 8.3 MinigameMap

**File:** `Assembly-CSharp/MinigameMap.cs`

`MinigameMap : MonoBehaviour` — central router and factory for minigame types.

**`MinigameTypes` enum:**

| Value | Masher Type |
|-------|-------------|
| `ST_FireBreathing` | (settings only) |
| `ST_HulaHoops` | (settings only) |
| `ST_Juggling` | (settings only) |
| `ST_Unicycle` | (settings only) |
| `Job_Stonemason` | (settings only) |

**Masher Settings structs held:**
- `AlternateMasherSettings`
- `HoldingMasherSettings`
- `PullupMasherSettings`
- `ThreadMillMasherSettings`
- `PommelHorseMasherSettings`
- `SolitaryPotatoMasher.MasherSettings`
- `ReadingMasher.MasherSettings`

**Key method:** `SetupButtonMasher(MinigameTypes, Action<bool>, Action)` — creates the correct IMiniGameMasher instance via `PerPlayerTrackedUIElements.CreateMasherForPlayer()`.

**Completion helper:** `MinigameCompletionHelper` — tracks rep count for completion.

### 8.4 MinigameInteraction

**File:** `Assembly-CSharp/MinigameInteraction.cs`

`MinigameInteraction : AnimatedInteraction` — generic wrapper for playing a minigame during an interaction.

| Field | Type | Purpose |
|-------|------|---------|
| `m_bShouldStopWithNoInput` | `bool` | Auto-stop when player stops inputting |
| `m_bRequireInputAtStart` | `bool` | Require immediate input to start |
| `m_NoRepsStopInterval` | `float` | Timeout if no reps completed |
| `m_NoRepsState` | `string` | Animator state for no-reps timeout |
| `m_bShouldDrainStamina` | `bool` | Drain stamina during minigame |
| `m_StaminaDrainPerMoment` | `float` | Stamina drain rate |

**Lifecycle:**
1. On start, sets up the minigame via `MinigameMap.SetupButtonMasher()`
2. Manages idle timeout with `m_NoRepsStopInterval`
3. On completion, fires completion echoes
4. On stop or timeout, transitions to exit animation

### 8.5 MinigameCompletionHelper

**File:** `Assembly-CSharp/MinigameCompletionHelper.cs`

Helper component for tracking minigame completion:

| Field | Type | Purpose |
|-------|------|---------|
| `m_NumRepsForCompletion` | `int` | Reps required for player completion |
| `m_TimeForAiAutoCompletion` | `float` | Time after which AI auto-completes |

Players must complete the specified number of reps; AI auto-completes after the timer expires (simulating successful play).

### 8.6 MinigameConfig

**File:** `Assembly-CSharp/MinigameConfig.cs`

`ScriptableObject` configuration asset:

| Field | Type | Purpose |
|-------|------|---------|
| `m_WeightLiftingRewardModifier` | `float` | Reward multiplier |
| `m_PullUpRewardModifier` | `float` | Reward multiplier |
| `m_KettlebellRewardModifier` | `float` | Reward multiplier |
| `m_ThreadmillRewardModifier` | `float` | Reward multiplier |
| `m_ExerciseBikeRewardModifier` | `float` | Reward multiplier |
| `m_PommelHorseRewardModifier` | `float` | Reward multiplier |
| `m_FootbagRewardModifier` | `float` | Reward multiplier |
| `m_ReadingRewardModifier` | `float` | Reward multiplier (not in file but referenced by StudyInteraction) |
| `m_Solitary_RewardModifier` | `float` | Reward multiplier (referenced by AchievementManager) |

### 8.7 MasherItemProcessorInteraction (Abstract)

**File:** `Assembly-CSharp/MasherItemProcessorInteraction.cs`

Abstract class for job interactions that process items via minigame:

| Field | Type | Purpose |
|-------|------|---------|
| `m_MinigameInteraction` | `MinigameInteraction` | The minigame wrapper |
| `m_ItemToProcess` | `Item` | The input item |
| `m_ItemToOutputSuccess` | `Item` | Output on success |
| `m_ItemToOutputFail` | `Item` | Output on failure (damaged item) |
| `m_SuccessChance` | `float` | Base success rate |

**Behaviour:**
1. Character approaches with input item
2. On start: plays minigame
3. On minigame completion: roll `m_SuccessChance`
4. Success → output `m_ItemToOutputSuccess`, fail → output `m_ItemToOutputFail`
5. Destroy input item, spawn output item

---

## 9. Audio System

### 9.1 Architecture Overview

The audio system is the **Audiokinetic Wwise** middleware integrated via the standard Unity Wwise SDK. All audio is routed through a central `AudioController` singleton which wraps `AkSoundEngine.PostEvent()`.

```
Game Code
    │
    ▼
AudioController.SendEvent(SOUND_AREA, eventName, gameObject)
    │
    ▼
AkSoundEngine.PostEvent(eventID, gameObject)
    │
    ▼
libAkSoundEngine (native)
    │
    ▼
Audio Hardware
```

### 9.2 AudioController

**File:** `Assembly-CSharp/AudioController.cs`

`AudioController : MonoBehaviour` — central audio hub singleton.

**`SOUND_AREA` enum:**

| Value | Purpose |
|-------|---------|
| `SA_FRONTEND` | Main menu, front-end UI |
| `SA_UI` | In-game UI sounds |
| `SA_INGAME` | All gameplay audio |

**`MusicState` enum:** `Playing`, `Resumed`, `Stopped`, `Paused`

**Singleton access:** `AudioController.Instance`

**Key methods:**

| Method | Signature | Purpose |
|--------|-----------|---------|
| `SendEvent` | `static void(SOUND_AREA, string, GameObject)` | Post a Wwise event |
| `SetParameter` | `static void(Game_Parameter, float)` | Set an RTPC value |
| `PlayMusicEvent` | `void(Events)` | Play a music event |
| `StopMusic` | `void()` | Stop all music |

**Initialisation:**
- Creates `GlobalSoundObject` and `GlobalMusicObject` for ambience/music
- Creates `UIObject` for UI sounds
- Sets up audio mixer groups (Music, SFX) with volume control

**Music system:**
- Manages music state based on prison routine schedule
- Transitions music between routine phases (`Play_Music_Prison_01_Routine_A` through `G`)
- Supports lockdown music, escape music, and threat-level based transitions
- Music unlocking via achievement system

**Volume control:**
- `m_MusicVolume` / `m_SFXVolume` — configurable sliders
- Applies volume via `SetRTPCValue` on mixer groups

### 9.3 AudioProximityDetector

**File:** `Assembly-CSharp/AudioProximityDetector.cs`

`AudioProximityDetector : MonoBehaviour` — spatial audio handler for electric fences.

| Field | Type | Purpose |
|-------|------|---------|
| Detection method | `SphereCollider` | Trigger volume |

**Behaviour:**
- Checks for nearby electric fences every 0.5s
- Tracks count of nearby fences
- Starts `Events.Play_Electric_Fence` when near, stops when far
- Sets `Game_Parameter.Distance_From_Fence` RTPC for distance-based audio mixing

### 9.4 Wwise Integration

#### AkInitializer

**File:** `Assembly-CSharp/AkInitializer.cs`

`AkInitializer : MonoBehaviour` — initialises the Wwise sound engine.

| Field | Type | Purpose |
|-------|------|---------|
| `basePath` | `string` | Bank path (default: `Audio/GeneratedSoundBanks`) |
| `memoryPoolSize` / `memoryPoolSize64` / `memoryPoolSize256` | `int` | Memory pool sizes (4096/2048/1024/0) |
| `language` | `string` | Language for localised banks |

Calls `AkSoundEngine.Initialize()` and decodes banks on first run. Creates `AkSoundEngineInitialization` sub-object.

#### AkBank

**File:** `Assembly-CSharp/AkBank.cs`

`AkBank : AkUnityEventHandler` — loads/unloads soundbanks.

| Field | Type | Purpose |
|-------|------|---------|
| `data` | `AkBankManager.BankHandle` | The loaded bank handle |

Supports:
- Synchronous and asynchronous loading
- Decode-on-load option (for streaming audio)
- Trigger-based activation (Start, Enable, etc.)

#### AkBankManager

**File:** `Assembly-CSharp/AkBankManager.cs`

Static manager with dictionary-based bank handle tracking. Thread-safe via `Mutex`. Deferred unload list supports safe unloading. `GlobalBankCallback` for async bank load results.

#### AkEvent

**File:** `Assembly-CSharp/AkEvent.cs`

`AkEvent : AkUnityEventHandler` — posts Wwise events.

| Field | Type | Purpose |
|-------|------|---------|
| `eventID` | `int` | Event short ID from autogen enum |
| `soundEmitterObject` | `GameObject` | Emitter override |
| `enableActionOnEvent` / `actionOnEventType` | `AkActionOnEventType` | Action on event (stop, pause, etc.) |
| `m_callbackData` | `AkEventCallbackData` | Callback configuration |
| `playingId` | `int` | Currently playing instance ID |

#### AkAmbient

**File:** `Assembly-CSharp/AkAmbient.cs`

`AkAmbient : AkEvent` — environmental ambience with multi-position support.

**MultiPositionType:** `Simple`, `Large`, `MultiPosition`

Supports multi-position event trees (single sound emitted from multiple locations).

#### AkGameObj

**File:** `Assembly-CSharp/AkGameObj.cs`

`AkGameObj : MonoBehaviour` — Wwise game object registration and position tracking.

- Registers via `AkSoundEngine.RegisterGameObj(GameObject, name)`
- Updates position per-frame via `AkSoundEngine.SetObjectPosition()`
- Environment-aware for player objects (reverb zones)
- Listener mask support
- Position update scheduler: spreads updates across 30 frames to reduce CPU spikes

#### AkState

**File:** `Assembly-CSharp/AkState.cs`

Sets Wwise state groups via `AkSoundEngine.SetState(StateGroupID, StateID)`.

#### AkSwitch

**File:** `Assembly-CSharp/AkSwitch.cs`

Sets Wwise switch groups via `AkSoundEngine.SetSwitch(SwitchGroupID, SwitchID, GameObject)`.

#### AkSoundEngine

**File:** `Assembly-CSharp/AkSoundEngine.cs`

Massive P/Invoke wrapper to the native `libAkSoundEngine` library. Key static methods:

| Method | Purpose |
|--------|---------|
| `RegisterGameObj(GameObject, string)` | Register a game object with Wwise |
| `UnregisterGameObj(GameObject)` | Unregister |
| `PostEvent(int, GameObject, ...)` | Post an event |
| `SetState(int, int)` | Set a state group |
| `SetSwitch(int, int, GameObject)` | Set a switch |
| `SetRTPCValue(int, float, GameObject)` | Set an RTPC parameter |
| `SetObjectPosition(GameObject, Vector3, Vector3, Vector3)` | Set 3D position |
| `LoadBank(string, ...)` / `UnloadBank(...)` | Bank management |
| `PrepareBank(...)` | Prepare future-use banks |
| `ExecuteActionOnEvent(...)` | Stop/pause/resume events |
| `SetMultiplePositions(GameObject, AkPositionArray, ushort, ...)` | Multi-position support |
| `GetSourcePlayPosition(int)` | Get playback position |
| `Init(...)` / `Term()` | Engine lifecycle |
| `GetIDFromString(string)` | String-to-ID conversion (FNV-1a) |
| `GetMaxRadius(GameObject)` | Get max attenuation radius |

Uses `AkSoundEnginePINVOKE` for C#→C++ interop.

#### AkUtilities

**File:** `Assembly-CSharp/AkUtilities.cs`

`ShortIDGenerator` — `ComputeHash32(string)` using FNV-1a hash algorithm for generating Wwise short IDs from string names.

### 9.5 AUTOGEN Wwise Enums

**Directory:** `Assembly-CSharp/AUTOGEN_T17Wwise_Enums/`

Auto-generated enum files that mirror the Wwise project structure:

#### Events.cs

**Class:** `Events` — string constants for every Wwise event in the project.

Key categories:

| Category | Example Events |
|----------|---------------|
| **Ambience** | `Play_Prison_01_Ambience_General`, `Play_Amb_PSO_BBQ`, `Play_Amb_PSO_ComputerRoom`, `Play_Amb_PSO_Fountain`, `Play_Amb_PSO_Pond` |
| **Character** | `Play_Dog_Bark`, `Play_Dog_Pant`, `Play_Dog_Dig`, `Play_Dog_Snarl`, `Play_Dog_Whimper` |
| **Combat** | `Play_Player_Combat_Hit`, `Play_Player_Combat_Swing`, `Play_Player_Combat_Block`, `Play_Player_Combat_Charge`, `Play_Player_Combat_KO`, `Play_Player_Combat_LockOn` |
| **Routine** | `Play_Routine_Bell_Classic`, `Play_Routine_Alarm_Beep` |
| **Environment** | `Play_Env_Shower_Loop`, `Play_Env_Toilet_Flush`, `Play_Env_Toilet_Flood` |
| **Music** | `Play_Music_Prison_01_Routine_A` through `G`, `Play_Music_Lockdown` |
| **UI** | `Play_UI_JobBoard_In`, `Play_UI_Lift` |
| **Player** | `Play_Player_Locker_Enter`, `Play_Player_Locker_Exit`, `Play_Player_Rest`, `Play_Player_Pickup_Item` |
| **Interaction** | `Play_Interaction_Generic` |
| **Fence** | `Play_Electric_Fence` |
| **Solitary** | `Play_Solitary_Sting` |
| **Jobs** | `Play_Jobs_Stonemason_Cut`, `Play_Jobs_Laundry`, `Play_Jobs_Kitchen`, `Play_Jobs_Blacksmith`, `Play_Jobs_ShoePress`, `Play_Jobs_WoodBuffer`, `Play_Jobs_JusticeTable_PickUp`, etc. |
| **Stop variants** | Stop events for all looping sounds |

#### Game_Parameter.cs

**Class:** `Game_Parameter` — Wwise RTPC parameter constants (e.g., `Distance_From_Fence`).

#### Switch_Group.cs / State_Group.cs

**Classes:** `Switch_Group`, `State_Group` — Wwise switch and state group constants.

#### Specialised enum files:

| File | Content |
|------|---------|
| `Player_Footsteps.cs` | Footstep surface switch values |
| `Player_Hit.cs` | Hit type switch values |
| `Player_Musical_Instruments.cs` | Musical instrument switch values |
| `Player_Amb_Position.cs` | Ambience position switch values |
| `Music_Threat_Level.cs` | Threat level state values |
| `Music_Player_Position.cs` | Player position state values |
| `Sfx_Mix.cs` | SFX mix state values |
| `Pause_Menu.cs` | Pause menu state values |
| `Round_Results_Mix.cs` | Round results mix state values |
| `Master_Volume.cs` | Master volume state values |
| `Big_Top_Crowd.cs` | Big Top crowd state values |
| `Cutscene.cs` | Cutscene state values |
| `Music_Lute_DLC_05.cs` | Lute DLC music state values |

---

## 10. Animation & Effects

### 10.1 AnimationEffectHandler

**File:** `Assembly-CSharp/AnimationEffectHandler.cs`

`AnimationEffectHandler : MonoBehaviour` — timed effect that auto-removes after playing.

| Field | Type | Purpose |
|-------|------|---------|
| `m_AnimationLength` | `float` | Duration before auto-return to pool |

On start, begins counting down; when timer expires, resets state and returns to `CullingObjectCollector` pool.

### 10.2 EffectManager

**File:** `Assembly-CSharp/EffectManager.cs`

`EffectManager : T17MonoBehaviour` — object pool for visual effects.

**`effectType` enum:**

| Type | Purpose |
|------|---------|
| `AnimatedPunchEffect` | Punch impact visual |
| `StrengthIncrease` | Stat increase VFX |
| `IntelligenceIncrease` | Stat increase VFX |
| `CardioIncrease` | Stat increase VFX |
| `StaminaIncrease` / `StaminaDecrease` | Stamina change VFX |
| `LandedJump` | Landed jump puff |
| `OpinionIncrease` / `OpinionDecrease` | Opinion change VFX |
| `HealthRestored` | Heal VFX |
| `EnergyRestored` | Energy restore VFX |
| `FistCharge` | Fist charge-up VFX |
| `FeetChargeDash` | Dash charge VFX |
| `PlayerLeaveDust` | Dust puff on movement |
| `MoneyIncreased` | Money gain VFX |
| `HeatIncreased` | Heat/alert level VFX |
| `ChargeAttackImpact` | Charge attack impact VFX |
| `DiggingUp` / `DiggingDown` | Digging VFX |

**Key methods:**
- `SpawnEffect(effectType, Vector3 position, Quaternion rotation)` — get from pool or instantiate
- `ReturnEffect(EffectHandler)` — return to pool
- Network-aware for multiplayer effect spawning

### 10.3 EffectHandler

**File:** `Assembly-CSharp/EffectHandler.cs`

`EffectHandler : MonoBehaviour` — per-instance effect behaviour.

**Features:**
- Lifetime tracking (`m_LifeTime`)
- Optional animation curve: `m_AnimCurveTransparency`, `m_AnimCurveScale`
- UV scrolling (`m_UVScrollSpeed`)
- Animated sprite sheets (`m_SpriteSheetColumns`, `m_SpriteSheetRows`, `m_FrameRate`)
- Auto-returns to `EffectManager` pool on lifetime expiry

### 10.4 AnimationEffectCompletdEchoer

**File:** `Assembly-CSharp/AnimationEffectCompletdEchoer.cs`

`AnimationEffectCompletdEchoer : MonoBehaviour` — broadcasts an `AnimationFinishedEvent` (UnityEvent) when an animation completes. Triggered from an Animation Event in the Animation window.

### 10.5 AnimationPlayer

**File:** `Assembly-CSharp/AnimationPlayer.cs`

`AnimationPlayer : MonoBehaviour` — invokes `Animator.SetTrigger("Play")` from Unity Events. Used for simple animation triggers (e.g., in Timeline or UI button callbacks).

### 10.6 CharacterAudioEvents

**File:** `Assembly-CSharp/CharacterAudioEvents.cs`

`CharacterAudioEvents : MonoBehaviour` — holds an array of audio event name strings (`string[]`). Accessible via `m_Instance` singleton per character. Used by animation events to look up sound names dynamically.

### 10.7 CaptureAnimatorSoundEvent

**File:** `Assembly-CSharp/CaptureAnimatorSoundEvent.cs`

`CaptureAnimatorSoundEvent : MonoBehaviour` — catches Animation Events with the function name "SoundEvent". Takes the string parameter, looks it up (potentially via CharacterAudioEvents), and forwards to `AudioController.SendEvent()`. Unregisters the game object from Wwise on level end.

---

## 11. Appendices

### A. Class Hierarchy

```
T17MonoBehaviour
├── InteractiveObject
│   ├── AnimatedInteraction
│   │   ├── TransferItemsInteraction
│   │   │   ├── ItemInteraction
│   │   │   │   ├── CellBars_ItemInteraction
│   │   │   │   └── CellBed_ItemInteraction
│   │   │   └── MultiStageTransferInteraction
│   │   ├── DeskInteraction
│   │   ├── ToiletInteraction
│   │   ├── ChairInteraction
│   │   ├── BedInteraction
│   │   │   ├── SolitaryBedInteraction
│   │   │   └── MedicBedInteraction
│   │   ├── ShowerInteraction
│   │   ├── LockerInteraction
│   │   ├── KennelInteraction
│   │   ├── ChargingPodInteraction
│   │   ├── StudyInteraction
│   │   ├── GymInteraction
│   │   ├── FishingInteraction
│   │   ├── TrayInteraction
│   │   ├── GuardComputerInteraction
│   │   ├── GuardOutfitCrateInteraction
│   │   ├── GeneratorInteraction
│   │   ├── IdleHoldInteraction
│   │   └── MinigameInteraction
│   ├── GuardBoardInteraction
│   ├── InformationBoardInteraction
│   ├── SignPostInteraction
│   ├── CarryInteraction
│   ├── CarryObjectInteraction
│   └── TalkInteraction
│
└── MultistageInputInteraction (IMultistageTransferInteractionResponder)
    ├── ConstructEndgameInteraction
    │   ├── GliderEscapeInteraction
    │   ├── CivilianClothesEscapeInteraction
    │   ├── TransportEscapeInteraction
    │   └── RepeatProcessEscapeInteraction
    └── MultistageInputProgressorInteraction
```

### B. Wwise Event Flow

```
Animation Event ("SoundEvent", stringParam)
    │
    ▼
CaptureAnimatorSoundEvent.OnAnimationEvent()
    │
    ▼
AudioController.SendEvent(SA_INGAME, stringParam, gameObject)
    │
    ▼
AkSoundEngine.PostEvent(eventID, gameObject)
    │
    ▼
Wwise Audio Pipeline (native)
```

### C. Minigame Masher Interface

```
IMinigameMasher
    ├── GymMasherBase
    │   ├── GymMasher_WeightLifting  (AlternateButtonMasher)
    │   ├── GymMasher_KettleBelts    (HoldingMasher)
    │   ├── GymMasher_Pullup         (PullupMasher)
    │   ├── GymMasher_Threadmill_ExerciseBike (ThreadMillMasher)
    │   └── GymMasher_Pommel_Footbag (PommelHorseMasher)
    ├── ReadingMasher
    └── AlternateButtonMasher
```

Created by `PerPlayerTrackedUIElements.CreateMasherForPlayer()` with settings from `MinigameMap`.

### D. Interaction Lifecycle Sequence

```
Character                    InteractiveObject              NetObjectLock
    │                              │                             │
    ├─── CanStartOrContinue ──────►│                             │
    │◄───────── true/false ────────┤                             │
    │                              │                             │
    ├─── RequestReservation ───────┼────────────────────────────►│
    │                              │◄─────── Lock Acquired ─────┤
    │                              │                             │
    ├─── WalkToTarget ────────────►│                             │
    │                              │                             │
    ├─── OnStartInteraction ──────►│                             │
    │                              │                             │
    ├─── InteractionReadyStart ───►│                             │
    │                              │   (animation, lerp)        │
    ├─── InteractionReadyUpdate ──►│  (loop)                    │
    │                              │                             │
    ├─── InteractionReadyEnd ─────►│                             │
    │                              │                             │
    ├─── OnExitInteraction ───────►│                             │
    │                              │                             │
    │                              ├── RequestStop ────────────►│
    │                              │◄────── Lock Released ──────┤
    ▼                              ▼                             ▼
```

### E. Save/Load Serialization

Interactive objects that need persistence implement `ISaveable` (or `INetworkLoadable`) and provide a serialization data class:

| Interaction | Data Class | Bridge |
|-------------|-----------|--------|
| ToiletInteraction | `ToiletInteractionData` | `ToiletInteractionDeserializer` via `NetPrisonViewDetails.Instance` |
| MultistageInputInteraction | `SaveData_MultistageInputInteraction_V1` | Inline via `ISaveable.WriteToSaveData()`/`LoadFromSaveData()` |
| CarryObjectInteraction | `NetSaveData.MovedObjects` dictionary | `CarryObjectInteractionDeserialiser` |

### F. AI Event Integration

| Interaction | EventManager | Events |
|-------------|-------------|--------|
| DeskInteraction | `DeskEventManager` | `m_InvestigateObject`, `m_ContrabandInDesk` |
| ToiletInteraction | `ToiletEventManager` | `m_ToiletFlood`, `m_ContrabandInToilet` |
| CellBars_ItemInteraction | `BarEventManager` | (bar state changes) |
| CellBed_ItemInteraction | `BedEventManager` | (bed state changes) |

### G. Audio Events Referenced in Code

| Interaction | Audio Event |
|-------------|-------------|
| TransferItemsInteraction | `Events.Play_Interaction_Generic` |
| ChairInteraction, BedInteraction, StudyInteraction, KennelInteraction | `Events.Play_Player_Rest` |
| LockerInteraction, ChargingPodInteraction | `Events.Play_Player_Locker_Enter`, `Events.Play_Player_Locker_Exit` |
| ShowerInteraction | `Events.Play_Env_Shower_Loop` |
| ToiletInteraction | `Events.Play_Env_Toilet_Flush`, `Events.Play_Env_Toilet_Flood` |
| GuardBoardInteraction, InformationBoardInteraction, SignPostInteraction | `Events.Play_UI_JobBoard_In` |
| CarryInteraction, CarryObjectInteraction, TrayInteraction | `Events.Play_Player_Pickup_Item` |
| AudioProximityDetector | `Events.Play_Electric_Fence`, `Events.Stop_Electric_Fence` |
