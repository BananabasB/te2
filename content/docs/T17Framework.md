---
title: T17Framework
description: The Escapists 2 - T17Framework system documentation
---

## Overview

Team17's internal Unity framework providing base classes, UI widgets, event system, dialog/tooltip system, networking, customisation, and global game flow. All classes live in the global namespace unless otherwise noted.

---

## Core Framework

### T17MonoBehaviour.cs

`Assembly-CSharp/T17MonoBehaviour.cs`

Base class for all T17 MonoBehaviour-derived components.

**Inherits:** `MonoBehaviour`

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `private` | `bool` | `m_Initialised` | Whether component has been initialised |

**Methods**

| Signature | Description |
|---|---|
| `virtual void Init()` | Initialisation hook, sets `m_Initialised = true` |
| `virtual void OnDestroy()` | Calls `Deinit()` |
| `virtual void Deinit()` | Cleanup hook |

---

### T17NetworkBehaviour.cs

`Assembly-CSharp/T17NetworkBehaviour.cs`

Base class for networked MonoBehaviours.

**Inherits:** `MonoBehaviour`

**Implements:** `IPunObservable`, `IPunCallbacks`

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `protected` | `PhotonView` | `photonView` | Associated PhotonView |
| `protected` | `int` | `m_OwnerID` | Owner player ID |

**Methods**

| Signature | Description |
|---|---|
| `virtual void Awake()` | Caches PhotonView |
| `virtual void OnPhotonSerializeView(PhotonStream stream, PhotonMessageInfo info)` | Serialisation callback |

---

### T17BehaviourManager.cs

`Assembly-CSharp/T17BehaviourManager.cs`

Manages registration and lifecycle of T17Behaviour instances.

**Methods (static)**

| Signature | Description |
|---|---|
| `static void Register(T17MonoBehaviour behaviour)` | Registers a behaviour |
| `static void Unregister(T17MonoBehaviour behaviour)` | Unregisters a behaviour |
| `static T GetBehaviour<T>()` | Returns first registered behaviour of type T |

---

### T17NetManager.cs

`Assembly-CSharp/T17NetManager.cs`

Core network manager wrapping Photon.

**Inherits:** `T17MonoBehaviour`

**Fields / Properties**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public static` | `T17NetManager` | `m_Instance` | Singleton |
| `public` | `bool` | `IsConnected` | Whether connected to Photon |
| `public` | `bool` | `IsInRoom` | Whether currently in a room |
| `public` | `string` | `PlayerName` | Local player's name |

**Methods**

| Signature | Description |
|---|---|
| `void Connect()` | Connects to Photon cloud |
| `void Disconnect()` | Disconnects from Photon |
| `void CreateRoom(string name, RoomOptions options)` | Creates a room |
| `void JoinRoom(string name)` | Joins a room by name |
| `void JoinRandomRoom()` | Joins a random room |
| `void LeaveRoom()` | Leaves current room |
| `void LoadLevel(string levelName)` | Calls `PhotonNetwork.LoadLevel` |

---

### T17NetworkManager.cs

`Assembly-CSharp/T17NetworkManager.cs`

Higher-level network manager handling player spawning and game state sync.

**Inherits:** `T17NetworkBehaviour`

**Fields / Properties**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public static` | `T17NetworkManager` | `m_Instance` | Singleton |
| `public` | `GameObject` | `PlayerPrefab` | Player prefab for spawning |

**Methods**

| Signature | Description |
|---|---|
| `void SpawnPlayer(Vector3 position, Quaternion rotation)` | Instantiates player prefab over network |
| `void OnPlayerJoined(PhotonPlayer player)` | Handles new player join |
| `void OnPlayerLeft(PhotonPlayer player)` | Handles player disconnect |
| `void OnLevelLoaded()` | Called when a new level is loaded |

---

### T17NetView.cs

`Assembly-CSharp/T17NetView.cs`

Manages networked object ownership and RPCs.

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public` | `int` | `ViewID` | Photon view ID |
| `public` | `PhotonView` | `photonView` | Associated PhotonView |

**Methods**

| Signature | Description |
|---|---|
| `void RPC(string methodName, PhotonTargets targets, params object[] parameters)` | Sends RPC |
| `void TransferOwnership(int playerID)` | Transfers view ownership |
| `bool IsMine()` | Whether local player owns this view |

---

### T17NetConfig.cs

`Assembly-CSharp/T17NetConfig.cs`

Network configuration constants.

**Fields (static)**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public static` | `int` | `MaxPlayersPerRoom` | Maximum players in a room |
| `public static` | `string` | `AppID` | Photon application ID |
| `public static` | `string` | `GameVersion` | Game version string for matchmaking |

---

## UI Widget System

All UI widgets are in `Assembly-CSharp/` with the `T17` prefix. They wrap/customise Unity's UI system (uGUI).

### T17Button.cs

Wrapper for `UnityEngine.UI.Button` with T17 theming.

**Inherits:** `T17Selectable`

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public` | `UnityEngine.Events.UnityEvent` | `OnClick` | Click event |

---

### T17Text.cs

Wrapper for `UnityEngine.UI.Text` with T17 styling defaults.

**Inherits:** `T17Selectable`

---

### T17Image.cs

Wrapper for `UnityEngine.UI.Image` with T17 theming.

**Inherits:** `T17Selectable`

---

### T17RawImage.cs

`Assembly-CSharp/T17RawImage.cs`

Wrapper for `UnityEngine.UI.RawImage` with UV scrolling support.

**Inherits:** `T17Selectable`

---

### T17Toggle.cs

Wrapper for `UnityEngine.UI.Toggle`.

**Inherits:** `T17Selectable`

---

### T17Slider.cs

Wrapper for `UnityEngine.UI.Slider`.

**Inherits:** `T17Selectable`

---

### T17Scrollbar.cs

Wrapper for `UnityEngine.UI.Scrollbar`.

**Inherits:** `T17Selectable`

---

### T17ScrollView.cs

Wrapper for `UnityEngine.UI.ScrollRect`.

**Inherits:** `T17Selectable`

---

### T17DropDown.cs

Wrapper for `UnityEngine.UI.DropDown`.

**Inherits:** `T17Selectable`

---

### T17InputField.cs

Wrapper for `UnityEngine.UI.InputField`.

**Inherits:** `T17Selectable`

---

### T17Selectable.cs

Base class for all T17 UI widgets.

**Inherits:** `UnityEngine.UI.Selectable`

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public` | `Color` | `NormalColor` | Normal state tint |
| `public` | `Color` | `HighlightedColor` | Highlighted state tint |
| `public` | `Color` | `PressedColor` | Pressed state tint |
| `public` | `Color` | `DisabledColor` | Disabled state tint |

---

### T17TabPanel.cs

Tab panel container with navigation.

---

### T17NavigableGrid.cs

Grid layout with keyboard/controller navigation.

---

### T17MenuBody.cs

Base container for menu screens.

---

### T17CounterObject.cs

Numeric counter display widget.

---

### T17FavourObject.cs

Favourite/toggle indicator UI element.

---

### T17HintObject.cs

Hint/tooltip popup indicator.

---

### T17InfoObject.cs

Information icon/tooltip trigger.

---

### T17TrackedUIElement.cs

UI element tracked by the analytics/reporting system.

---

### T17StatsSlider.cs

Slider specialised for stat display.

---

### T17UIAlphaFade.cs

Alpha fade animation component.

---

### T17AspectRatioFitter.cs

Aspect ratio fitting component.

---

### T17BlockKeyboardAutoFocus.cs

Prevents keyboard auto-focus on input fields.

---

### T17ControlMapper.cs

Maps UI controls to Rewired input actions.

---

## Event System

### T17EventSystem.cs

Custom event system extending Unity's EventSystem.

**Inherits:** `UnityEngine.EventSystems.EventSystem`

---

### T17EventSystemsManager.cs

Manages multiple T17EventSystem instances.

**Inherits:** `T17MonoBehaviour`

---

### IT17EventHelper.cs

Interface for event helper classes.

---

## Dialog & Tooltip System

### T17DialogBox.cs

`Assembly-CSharp/T17DialogBox.cs`

Full-screen dialog box with title, message, and buttons.

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public` | `T17Text` | `TitleText` | Dialog title |
| `public` | `T17Text` | `MessageText` | Dialog message body |
| `public` | `T17Button[]` | `Buttons` | Dialog action buttons |

**Methods**

| Signature | Description |
|---|---|
| `void Show(string title, string message)` | Shows with default OK |
| `void Show(string title, string message, string[] buttonLabels, System.Action<int> callback)` | Shows with custom buttons |

---

### T17DialogBoxManager.cs

`Assembly-CSharp/T17DialogBoxManager.cs`

Manages dialog box queue and display.

**Inherits:** `T17MonoBehaviour`

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public static` | `T17DialogBoxManager` | `m_Instance` | Singleton |
| `public` | `T17DialogBox` | `DialogBoxPrefab` | Prefab for dialog instances |

**Methods**

| Signature | Description |
|---|---|
| `void QueueDialog(string title, string message, string[] buttonLabels, System.Action<int> callback)` | Queues a dialog |
| `void ShowNext()` | Shows next dialog in queue |

---

### T17TooltipManager.cs

`Assembly-CSharp/T17TooltipManager.cs`

Manages tooltip display and positioning.

**Inherits:** `T17MonoBehaviour`

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public static` | `T17TooltipManager` | `m_Instance` | Singleton |
| `public` | `T17ItemTooltip` | `TooltipPrefab` | Tooltip prefab |

**Methods**

| Signature | Description |
|---|---|
| `void ShowTooltip(string text, Vector3 position)` | Shows tooltip at position |
| `void HideTooltip()` | Hides current tooltip |

---

### T17ItemTooltip.cs

`Assembly-CSharp/T17ItemTooltip.cs`

Tooltip specialised for item display (name, description, stats).

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public` | `T17Text` | `ItemName` | Item name text |
| `public` | `T17Text` | `ItemDescription` | Item description text |
| `public` | `T17Text` | `ItemStats` | Item stats text |

**Methods**

| Signature | Description |
|---|---|
| `void SetItemData(string name, string description, string stats)` | Populates tooltip content |

---

## Customisation System

### Customisation.cs

`Assembly-CSharp/Customisation.cs`

**Enum — describes customisable slots.**

| Member | Description |
|---|---|
| `BodyType` | Character body type |
| `SkinColour` | Skin colour |
| `Hair` | Hair style |
| `Hat` | Hat/headwear |
| `UpperFaceAccessory` | Upper face (eyes, eyebrows) |
| `LowerFaceAccessory` | Lower face (mouth, beard) |
| `Outfit` | Full outfit |

---

### CustomisationManager.cs

`Assembly-CSharp/CustomisationManager.cs`

Central manager for loading, saving, and applying customisation.

**Inherits:** `T17MonoBehaviour`

**Fields / Properties**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public static` | `CustomisationManager` | `m_Instance` | Singleton |
| `public` | `bool` | `IsLoaded` | Whether data has been loaded |
| `public` | `CustomisationData` | `Data` | All loaded customisation data |

**Methods**

| Signature | Description |
|---|---|
| `void LoadData()` | Loads customisation data from resources |
| `void ApplyCustomisation(CharacterCustomisation charCustom, CustomisationSet set)` | Applies a full set to a character |
| `bool IsUnlocked(CustomisationSlot slot, long id)` | Checks if item is unlocked |

---

### CustomisationData.cs

`Assembly-CSharp/CustomisationData.cs`

Container for customisation configuration, defining available options per slot.

**Inherits:** `ScriptableObject`

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public` | `CustomisationConfig[]` | `Configs` | One config per slot |
| `public` | `string[]` | `NameFilters` | Profanity filter list |

**Methods**

| Signature | Description |
|---|---|
| `CustomisationConfig GetConfig(Customisation slot)` | Returns config for a given slot |
| `bool IsNameValid(string name)` | Checks name against profanity filter |

---

### CustomisationConfig.cs

`Assembly-CSharp/CustomisationConfig.cs`

Configuration for a single customisation slot.

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public` | `Customisation` | `Slot` | Which slot this config belongs to |
| `public` | `CustomisationSet[]` | `Sets` | Available sets for this slot |
| `public` | `long` | `DefaultID` | Default item ID |
| `public` | `string` | `DefaultName` | Default name/label |

---

### CustomisationSet.cs

`Assembly-CSharp/CustomisationSet.cs`

A specific customisation option (e.g. "Short Hair", "Red Outfit").

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public` | `long` | `ID` | Unique identifier |
| `public` | `string` | `Name` | Display name |
| `public` | `CustomisationCategorisedSet` | `CategorisedSet` | Optional category assignment |
| `public` | `CustomisationConstraint` | `Constraint` | Compatibility constraint |

---

### CustomisationCategorisedSet.cs

`Assembly-CSharp/CustomisationCategorisedSet.cs`

Categorisation data for a set (groups items by sub-category).

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public` | `string` | `CategoryName` | Category label |

---

### CustomisationConstraint.cs

`Assembly-CSharp/CustomisationConstraint.cs`

Defines compatibility constraints between customisation slots (e.g. certain hats conflict with certain hair).

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public` | `Customisation` | `ConflictingSlot` | Slot that conflicts |
| `public` | `long[]` | `ConflictingIDs` | Conflicting item IDs |

**Methods**

| Signature | Description |
|---|---|
| `bool IsConflict(CustomisationSet other)` | Checks if this set conflicts with another |

---

### CustomisationSerialiser.cs

`Assembly-CSharp/CustomisationSerialiser.cs`

Serialises/deserialises customisation data for save/network transport.

**Methods**

| Signature | Description |
|---|---|
| `static string Serialise(CustomisationNetData data)` | Converts net data to JSON |
| `static CustomisationNetData Deserialise(string json)` | Parses JSON to net data |

---

### CustomisationNetData.cs

`Assembly-CSharp/CustomisationNetData.cs`

Network-transportable customisation data.

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public` | `long` | `BodyType` | Body type ID |
| `public` | `long` | `SkinColour` | Skin colour ID |
| `public` | `long` | `Hair` | Hair ID |
| `public` | `long` | `Hat` | Hat ID |
| `public` | `long` | `UpperFaceAccessory` | Upper face ID |
| `public` | `long` | `LowerFaceAccessory` | Lower face ID |
| `public` | `long` | `Outfit` | Outfit ID |

---

### CustomisationModifiedNetData.cs

`Assembly-CSharp/CustomisationModifiedNetData.cs`

Tracks which fields have been modified (for delta updates).

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public` | `CustomisationNetData` | `Data` | The net data |
| `public` | `BitField` | `ModifiedFields` | Bitfield tracking which slots changed |

---

### CustomisationCollectionNetData.cs

`Assembly-CSharp/CustomisationCollectionNetData.cs`

Collection of multiple customisation data entries (e.g. for NPCs).

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public` | `CustomisationNetData[]` | `Entries` | Array of net data entries |

---

### CustomisationGeneratorTools.cs

`Assembly-CSharp/CustomisationGeneratorTools.cs`

Utility methods for procedurally generating customisation.

**Methods (static)**

| Signature | Description |
|---|---|
| `static CustomisationNetData GenerateRandom(PRNG prng)` | Generates random customisation from a seeded PRNG |
| `static CustomisationNetData GenerateRandom()` | Generates random customisation (no seed) |

---

### CharacterCustomisation.cs

`Assembly-CSharp/CharacterCustomisation.cs`

Component applied to character GameObjects. Holds and applies a customisation set.

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public` | `CustomisationNetData` | `CurrentCustomisation` | Currently applied customisation |
| `public` | `Renderer` | `TargetRenderer` | The renderer to apply materials to |

**Methods**

| Signature | Description |
|---|---|
| `void ApplyCustomisation(CustomisationNetData data)` | Applies new customisation to renderer |
| `void ApplyMaterial(Material material, Customisation slot)` | Applies material for a specific slot |

---

### PrisonCustomisationManager.cs

`Assembly-CSharp/PrisonCustomisationManager.cs`

Manages NPC customisation assignment within a prison.

**Inherits:** `T17MonoBehaviour`

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public static` | `PrisonCustomisationManager` | `m_Instance` | Singleton |
| `public` | `int` | `Seed` | Seed for deterministic customisation generation |

**Methods**

| Signature | Description |
|---|---|
| `void GenerateNPCCustomisation()` | Generates customisation for all NPCs |
| `CustomisationNetData GetCustomisationForNPC(int npcID)` | Returns customisation for a specific NPC |
| `void SerialiseToSave(SaveData data)` | Serialises NPC customisation for save |
| `void DeserialiseFromSave(SaveData data)` | Restores NPC customisation from save |

---

### VisitorCustomisationManager.cs

`Assembly-CSharp/VisitorCustomisationManager.cs`

Manages visitor NPC customisation and gift data.

**Inherits:** `T17MonoBehaviour`

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public static` | `VisitorCustomisationManager` | `m_Instance` | Singleton |

**Methods**

| Signature | Description |
|---|---|
| `void GenerateVisitorCustomisation()` | Generates random customisation for visitors |
| `CustomisationNetData GetVisitorCustomisation(int visitorID)` | Returns visitor's customisation |
| `void SetVisitorCustomisation(int visitorID, CustomisationNetData data)` | Sets visitor's customisation |

---

### CustomisationDialogFrontendMenu.cs

`Assembly-CSharp/CustomisationDialogFrontendMenu.cs`

Frontend dialog for the customisation menu.

**Inherits:** `T17DialogBox`

---

### CustomisationDialogTabMenu.cs

`Assembly-CSharp/CustomisationDialogTabMenu.cs`

Tabbed menu UI for selecting customisation categories.

**Inherits:** `T17MenuBody`

---

### CustomisationFrontendMenu.cs

`Assembly-CSharp/CustomisationFrontendMenu.cs`

Main frontend customisation screen.

**Inherits:** `T17MenuBody`

---

### CustomisationUnlockedHUD.cs

`Assembly-CSharp/CustomisationUnlockedHUD.cs`

HUD element displayed when new customisation item is unlocked.

**Inherits:** `T17MonoBehaviour`

---

### CustomisationOptionsFE.cs

`Assembly-CSharp/CustomisationOptionsFE.cs`

Option items displayed in the customisation menu.

**Inherits:** `BaseOptionItem`

---

### CustomisationToggleOption.cs

`Assembly-CSharp/CustomisationToggleOption.cs`

Toggle option for binary customisation choices (e.g. show hat).

**Inherits:** `BaseOptionItem`

---

### CustomisationCharacterInfoFE.cs

`Assembly-CSharp/CustomisationCharacterInfoFE.cs`

Displays character info panel in customisation screen.

**Inherits:** `T17MonoBehaviour`

---

## Global Game Flow

### GlobalStart.cs

`Assembly-CSharp/GlobalStart.cs`

Main game state machine controlling the entire lifecycle: Boot → Frontend → Level → Results → (loop).

**Inherits:** `T17MonoBehaviour`

**Fields / Properties**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public static` | `GlobalStart` | `Instance` | Singleton |
| `public static` | `GlobalStartMode` | `CurrentMode` | Current game mode (enum) |

**Enum: GlobalStartMode**

| Member | Description |
|---|---|
| `None` | Uninitialised |
| `Boot` | Boot sequence running |
| `FrontEnd` | In frontend menus |
| `Loading` | Level loading |
| `InGame` | In a level |
| `Results` | Results screen active |

**Methods**

| Signature | Description |
|---|---|
| `void SetMode(GlobalStartMode mode)` | Transitions to a new mode |
| `bool IsMode(GlobalStartMode mode)` | Checks current mode |
| `void RequestLevelLoad(string levelName)` | Queues a level load |
| `void RequestFrontEnd()` | Returns to frontend |

---

### GlobalSave.cs

`Assembly-CSharp/GlobalSave.cs`

Persistent key-value save system backed by JSON.

**Inherits:** `T17MonoBehaviour`

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public static` | `GlobalSave` | `m_Instance` | Singleton |
| `private` | `Dictionary<string, object>` | `m_SaveData` | In-memory save dictionary |

**Methods**

| Signature | Description |
|---|---|
| `void Save()` | Writes `m_SaveData` to disk as JSON |
| `void Load()` | Reads JSON from disk into `m_SaveData` |
| `void SetInt(string key, int value)` | Stores int |
| `int GetInt(string key, int defaultValue = 0)` | Reads int |
| `void SetFloat(string key, float value)` | Stores float |
| `float GetFloat(string key, float defaultValue = 0f)` | Reads float |
| `void SetString(string key, string value)` | Stores string |
| `string GetString(string key, string defaultValue = "")` | Reads string |
| `void SetBool(string key, bool value)` | Stores bool |
| `bool GetBool(string key, bool defaultValue = false)` | Reads bool |
| `void SetIntArray(string key, int[] value)` | Stores int array |
| `int[] GetIntArray(string key)` | Reads int array |
| `bool HasKey(string key)` | Checks if key exists |
| `void DeleteKey(string key)` | Removes key |
| `void DeleteAll()` | Clears all save data |

---

### GlobalLoader.cs

`Assembly-CSharp/GlobalLoader.cs`

Manages scene loading with loading screen.

**Inherits:** `T17MonoBehaviour`

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public static` | `GlobalLoader` | `m_Instance` | Singleton |
| `public` | `string` | `LoadingScreenScene` | Loading screen scene name |

**Methods**

| Signature | Description |
|---|---|
| `void LoadScene(string sceneName)` | Loads scene via loading screen |
| `void LoadSceneDirect(string sceneName)` | Loads scene directly (no loading screen) |
| `float GetLoadingProgress()` | Returns 0–1 loading progress |

---

### GlobalHintManager.cs

`Assembly-CSharp/GlobalHintManager.cs`

Manages hint/tip display system.

**Inherits:** `T17MonoBehaviour`

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public static` | `GlobalHintManager` | `m_Instance` | Singleton |

**Methods**

| Signature | Description |
|---|---|
| `void ShowHint(string hintKey)` | Shows a hint by key |
| `void HideHint()` | Hides current hint |
| `bool IsHintActive()` | Whether a hint is currently displayed |

---

### GlobalVision.cs

`Assembly-CSharp/GlobalVision.cs`

Manages vision/visibility queries for characters.

**Inherits:** `T17MonoBehaviour`

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public static` | `GlobalVision` | `m_Instance` | Singleton |

**Methods**

| Signature | Description |
|---|---|
| `bool HasLineOfSight(Vector3 from, Vector3 to, LayerMask blockingLayers)` | Raycast check between two points |
| `bool IsInViewCone(Vector3 observer, Vector3 target, Vector3 forward, float angle, float range)` | Cone-of-vision check |

---

### GlobalCombatConfig.cs

`Assembly-CSharp/GlobalCombatConfig.cs`

Global combat configuration constants.

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public` | `float` | `BaseDamage` | Base melee damage |
| `public` | `float` | `KnockoutDuration` | KO recovery time in seconds |
| `public` | `float` | `CombatRange` | Max combat range |
| `public` | `float` | `AttackCooldown` | Time between attacks |

---

## Flow Infrastructure

### BaseFlowBehaviour.cs

`Assembly-CSharp/BaseFlowBehaviour.cs`

Abstract base class for flow state machines.

**Inherits:** `T17MonoBehaviour`

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `protected` | `bool` | `m_IsComplete` | Whether flow has completed |

**Methods**

| Signature | Description |
|---|---|
| `abstract void Enter()` | Called when flow becomes active |
| `abstract void Exit()` | Called when flow transitions away |
| `virtual void Update()` | Called each frame while active |
| `bool IsComplete()` | Returns completion state |

---

### BaseComponentSetup.cs

`Assembly-CSharp/BaseComponentSetup.cs`

Base class for level component setup routines.

**Inherits:** `T17MonoBehaviour`

**Methods**

| Signature | Description |
|---|---|
| `abstract void Setup()` | Performs setup logic |
| `abstract void TearDown()` | Reverses setup |

---

### BaseZoneSetup.cs

`Assembly-CSharp/BaseZoneSetup.cs`

Base class for zone-specific setup.

**Inherits:** `BaseComponentSetup`

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public` | `string` | `ZoneName` | Name of the zone being set up |

---

### PersistentScripts.cs

`Assembly-CSharp/PersistentScripts.cs`

Container for scripts that should persist across scene loads.

**Inherits:** `T17MonoBehaviour`

**Methods**

| Signature | Description |
|---|---|
| `override void Init()` | Marks GameObject as `DontDestroyOnLoad` |

---

## Flow State Machines

### BootFlow.cs

(Included in TelemetryAnalytics wiki — boot state machine.)

### FrontEndFlow.cs

`Assembly-CSharp/FrontEndFlow.cs`

Frontend flow state machine.

**Inherits:** `BaseFlowBehaviour`

---

### LevelFlow.cs

`Assembly-CSharp/LevelFlow.cs`

In-game level flow state machine.

**Inherits:** `BaseFlowBehaviour`

---

### HUDMenuFlow.cs

`Assembly-CSharp/HUDMenuFlow.cs`

HUD menu flow state machine.

**Inherits:** `BaseFlowBehaviour`

---

### InGameMenuFlow.cs

`Assembly-CSharp/InGameMenuFlow.cs`

In-game pause/menu flow state machine.

**Inherits:** `BaseFlowBehaviour`

---

### ResultsFlow.cs

`Assembly-CSharp/ResultsFlow.cs`

Results screen flow state machine.

**Inherits:** `BaseFlowBehaviour`

---

### LoadingFlow.cs

`Assembly-CSharp/LoadingFlow.cs`

Loading screen flow state machine.

**Inherits:** `BaseFlowBehaviour`
