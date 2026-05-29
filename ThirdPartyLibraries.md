# Third-Party Library Inventory

Every external namespace found in the decompiled codebase, with a brief description of its role.

---

### Epic.OnlineServices.* (EOS SDK by Epic Games)
Full Epic Online Services SDK integration for cross-platform multiplayer. Includes sub-namespaces for Sessions (lobby creation, search, invitations), Stats (leaderboards, ingest), UserInfo (player profile queries), Presence (friend status), Auth (authentication), Achievements, Leaderboards, UI (social overlay), Ecom (purchases), PlayerDataStorage, TitleStorage, AntiCheatClient, KWS (parental), Reports, Sanctions, ProgressionSnapshot, and more. This is the backbone of The Escapists 2's crossplay between Steam, Xbox, PlayStation, and Switch.

### Pathfinding.* (A* Pathfinding Project Pro by Aron Granberg / A* Pathfinding Project)
Complete pathfinding solution providing GridGraph, NavMeshGraph (Recast), LayerGridGraph, and PointGraph. Sub-namespaces include Pathfinding.RVO (Reciprocal Velocity Obstacles for crowd avoidance), Pathfinding.Voxels (recast voxelization), Pathfinding.Serialization, and Pathfinding.Util. Used by all AI for navigation. The game also has a custom `T17PathModifier` in the Pathfinding namespace.

### Newtonsoft.Json.* (Json.NET by James Newton-King)
High-performance JSON serialization framework. Used throughout for data serialization, configuration parsing, and network message formatting.

### NodeCanvas.* (NodeCanvas by ParadoxNotion)
Complete AI and behaviour system. See [[NodeCanvasAI]] for full details. Covers:
- **NodeCanvas.Framework** — Graph, Blackboard, Task, Node, Connection, Variable, GraphOwner
- **NodeCanvas.BehaviourTrees** — BehaviourTree, BehaviourTreeOwner, composites, decorators, action/condition nodes
- **NodeCanvas.StateMachines** — FSM, FSMOwner, states, transitions
- **NodeCanvas.DialogueTrees** — DialogueTree, DialogueTreeController, Statement, choice/condition nodes
- **NodeCanvas.Tasks.Actions/Conditions** — Library of built-in game-agnostic tasks (movement, Mecanim, blackboard, etc.)

### ParadoxNotion.* (Foundation Library by ParadoxNotion)
Core utility and serialization library underlying both NodeCanvas and Slate. Includes:
- **ParadoxNotion.Serialization** / **FullSerializer** — Custom JSON serialization (`JSONSerializer`) with recovery support, used for graph persistence
- **ParadoxNotion.Design** — Editor attributes (`[Name]`, `[Category]`, `[Description]`, `[Icon]`)
- **ParadoxNotion.Services** — `MonoManager`, `MessageRouter`
- **ParadoxNotion** — Utility classes (`ReflectionTools`, `StringUtils`, `OperationTools`, `EventData`)

### Slate.* (Slate Cutscene Editor by ParadoxNotion)
Full timeline-based cutscene system. See [[CutscenesAndSlate]] for full details. Includes camera animation, audio tracks, animator tracks, property tracks, easing library, and 78+ built-in action clips.

### Rewired.* (Rewired Input System by Guavaman Enterprises)
Advanced input management system handling keyboard, mouse, gamepad, and key remapping. Includes:
- **Rewired** — Core InputManager and Player classes
- **Rewired.Integration.UnityUI** — RewiredStandaloneInputModule for UI navigation
- **Rewired.UI.ControlMapper** — Full rebinding UI
- **Rewired.Data** — UserDataStore_PlayerPrefs for saving remaps
- **Rewired.Demos** — Demo scenes (ControlMapperDemoMessage)

### Photon* / ExitGames.* (Photon Unity Networking / PUN)
Photon PUN (Photon Unity Networking) used for real-time multiplayer. Includes `PhotonView`, `PhotonNetwork`, `PunBehaviour`, and RPC infrastructure. The game's `T17NetView` is built on top of this.

### PrefabEvolution (Prefab Evolution by Team Utopia)
Prefab instance handling and evolution system. Manages prefab override tracking and prefab-to-prefab upgrades.

### CodingJar / CodingJar.MultiScene (Cross-Scene References by CodingJar)
Multi-scene editing and cross-scene reference resolution. `AmsCrossSceneReferences`, `AmsMultiSceneSetup`, `UniqueObject`, `RuntimeCrossSceneReference` — used for the prison level editor where objects reference each other across additive scenes.

### GameAnalytics (GameAnalytics SDK)
Analytics and telemetry SDK. Includes `GA_Setup`, `GameAnalyticsBase`, custom dimensions, and custom metrics. Used for tracking player behaviour, crashes, and game events.

### UTJ (Alembic Importer by Unity Technologies Japan)
Alembic animation file support. `AlembicCamera`, `AlembicStreamRoot`, `AlembicTrack` in the Slate namespace — allows cutscenes to use pre-baked Alembic camera animations.

### UnityStandardAssets.CinematicEffects (Depth of Field by Unity)
Cinematic image effects — specifically `DepthOfField` (DOF) used by `DirectorCamera` for focal blur in cutscenes.

### nBitStream (Custom Bit-Level Serialization)
Custom bit-stream reader/writer for compact serialization of AI event memories. `BitStreamWriter` and `BitStreamReader` write/read packed data (19-bit net IDs vs 32-bit full IDs) for efficient network save/load.

### AUTOGEN_T17Wwise_Enums (Auto-generated Wwise Enums)
Auto-generated C# enums matching the Wwise project's SoundBanks, Events, State Groups, States, Switch Groups, and Switches. Used by `AudioController` and the T17.Slate Wwise clips (`SetWwiseState`, `SetWwiseSwitch`, `TriggerAudioEvent`, etc.).

### Custom (TileComposition System)
The `Custom` namespace contains the tile composition system — `Composition`, `CompositionMaterial`, `UVMap`, `TileList` — used by the level editor for tile rendering.

### DustinHorne.Json.Examples (Json.NET Examples)
Example/test JSON files from Json.NET's documentation. Not used by game logic.

### Peter.UnityEngine.UI (InputField Caret Fix)
A single-file fix for Unity's InputField caret positioning. Referenced as `Peter.UnityEngine.UI` — a community patch.

### System.Collections.Generic (FastList)
The decompiled code includes a `FastList<T>` class (a faster `List<T>` variant) in the `System.Collections.Generic` namespace. Used extensively in performance-critical paths (AI event serialization, item management).

### System.Runtime.Serialization (DataContract Attributes)
`DataContract` and `DataMember` attributes used for serialization of some data classes, likely for JSON or XML interchange.

### Unity.IL2CPP.CompilerServices (IL2CPP Options)
`Il2CppSetOption` attributes controlling IL2CPP code generation (e.g. `NullChecks(false)`, `ArrayBoundsChecks(false)`, `DivideByZeroChecks(false)`) for performance optimization in the IL2CPP build.

### UnityEngine.UI (T17GridLayoutGroup)
Custom `T17GridLayoutGroup` extending Unity's `GridLayoutGroup` for the crafting/inventory grid UI.

### SaveHelpers (BitField Serialization)
`BitFieldSerialization` helpers for compact save data encoding.

### DataHelpers / DataPlatform (Conversion Utilities)
Helper classes for data type conversion (`DataConversions`, `DataPlatform`) used across the serialization layer.

### NetworkLoadable (Load State Enum)
Enum for network object load states (`NotLoaded`, `Loading`, `Loaded`). Used by the networked object management system.
