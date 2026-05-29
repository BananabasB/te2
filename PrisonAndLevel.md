# Prison, Level & Map System

## Overview

The Escapists 2 uses a layered floor-based prison system composed of **tile grids**, **rooms**, **building blocks**, **facades**, **lighting**, **weather**, **cameras**, and **maps** — all orchestrated by **managers** (singletons) that handle data loading, save/load, networking, and level editor operations. Prisons are defined by **PrisonData** (ScriptableObject) and **PrisonConfig** (ScriptableObject) and are built dynamically at runtime from **building instructions** stored in a serialised binary format.

---

## 1. Prison Definitions & Enums

### LevelScript.cs (`LevelScript`)
- **Class**: `LevelScript : MonoBehaviour`
- Provides `GetInstance()` singleton
- **Inner enums**:

#### `PRISON_ENUM` — All built-in prison IDs
| Value | ID | Notes |
|-------|----|-------|
| 1 | `Centre_Perks` | — |
| 2 | `OldWestFort` | — |
| 3 | `POW_Camp` | — |
| 4 | `Space_Prison` | — |
| 5 | `Gulag_Prison` | — |
| 6 | `Oil_Rig` | — |
| 7 | `Transport_Train` | — |
| 8 | `Transport_Boat` | — |
| 9 | `Transport_Plane` | — |
| 10 | `Area_17` | — |
| 11 | `Dictator` | — |
| 12 | `GDC_Centre_Perks` | — |
| 13 | `Tutorial` | — |
| 14–18 | `DLC02`–`DLC06` | DLC prisons |
| 99 | `JamesTest` | Debug |
| 100 | `AITest` | Debug |
| 1000 | `ImportedPrison` | Custom import |
| –1 | `CustomPrison` | Player-made |
| 0 | `Unassigned` | Default/unset |

#### `PRISON_ENUM_MASK` — Bitmask flags
| Flag | Value |
|------|-------|
| `PlayerMade` | 0x800 |
| `Tutorial` | 0x1000 |
| `DLC` | 0x40000 |
| `DLC02` | 0x10000 |
| `DLC03` | 0x20000 |
| `DLC04` | 0x80000 |
| `DLC05` | 0x100000 |
| `DLC06` | 0x200000 |

#### `PRISON_TYPE` — Prison category
- `Normal` — Standard prison
- `Transport` — Moving transport (train/boat/plane)
- `Tutorial` — Tutorial level

#### `LEADERBOARD_PRISON_ENUM`
- `m_LeaderboardPrisonFirst` through `m_LeaderboardPrisonLast` (1..kMaxLeaderboardPrisons)

#### Other enums
- **`GAME_STATE`**: `NotPlaying=0, Playing, Escaped, Over`
- **`ePrisonEscapeMethod`**: `UNASSIGNED, Key, PickedLock, CutFence, DrilledVent, DugTunnel, GenuineVisit, UseHelicopter, UseSpeedboat, Disguise, WalkOut, InmateLabour_Outside_CutFence, InmateLabour_Outside_DigChase, UseParachute, UseRocket, UseTeleporter, UsePortal, UseDragon, UseYeti`
- **`ESCAPE_TYPE`**: `ESCAPE_INVALID, ESCAPE_VAN, ESCAPE_HELICOPTER, ESCAPE_SPEEDBOAT, ESCAPE_CUT_FENCE, ESCAPE_EXIT, ESCAPE_DIG_ESCAPE, ESCAPE_PARACHUTE, ESCAPE_ROCKET, ESCAPE_TELEPORTER, ESCAPE_PORTAL, ESCAPE_DRAGON, ESCAPE_YETI`
- **`TutorialState`**: `OFF, Movment, Disguise, Escape, Guard, Contraband, Attribute, Routine, Checklist, Clean`
- **`CHECKLIST_TYPE`**: `CHECKLIST_MOVEMENT, CHECKLIST_DISGUISE, CHECKLIST_ESCAPE, CHECKLIST_GUARD, CHECKLIST_CONTRABAND, CHECKLIST_ATTRIBUTE, CHECKLIST_ROUTINE, CHECKLIST_CLEAN`
- **`TutorialItem`**: `OFF, MOVEMENT_DISGUISE, DISGUISE_GUARD, ESCAPE_CONTRABAND, CONTRABAND_ATTRIBUTE, ATTRIBUTE_ROUTINE, ROUTINE_CLEAN, CLEAN_COMPLETE`

---

### PrisonData.cs (`PrisonData`)
- **Class**: `PrisonData : ScriptableObject`
- `[CreateAssetMenu]` asset definition
- **`LevelInfo`** inner class: `m_PrisonEnum` (PRISON_ENUM), `m_PrisonType` (PRISON_TYPE), `m_AssociatedFile` (scene name for built-in, save file path for custom)
- **`PrisonDifficulty`** enum: `Invalid=-1, Easy, Medium, Hard, Count`
- **Key fields**:
  - `m_NameLocalizationKey`, `m_DescriptionLocalizationKey` — Localised name/description
  - `m_ImagePath`, `m_PrisonSetupImagePath`, `m_ImageLockedPath`, `m_RoundResultsImagePath`
  - `m_bIsDLC`, `m_DLCData` — DLC ownership
  - `m_bIsDebug` — Debug-only prison
  - `m_PrisonDifficulty` — Difficulty rating
  - `m_bAddRobinsonCharacter` — Add extra Robinson NPC
  - `m_CustomisationOutfitCivilians`, `m_CustomisationBodyguardOutfit` — Outfit configs
  - `m_StarterItems` — Starting items for player
  - `m_TotalJobs`, `m_JobSamples`, `m_TotalJobTime` — Job configuration
  - `m_RoutineOverrides` — Routine overrides
  - `m_SpawnedGuards` — Custom guard placement
  - `m_MusicBank`, `m_AmbientBank`, `m_EffectsBank` — Audio banks

### PrisonConfig.cs (`PrisonConfig`)
- **Class**: `PrisonConfig : ScriptableObject`
- **`ConfigType`** enum: `Cooperative`, `Versus`, `Singleplayer`
- **Contains**:
  - `GlobalCombatConfig` — Combat settings
  - `AIConfig` — AI behaviour
  - `JobConfig` — Job settings
  - `CharacterConfig[]` — Player, Inmate, Guard, RiotGuard, Dog configs
  - `ItemContainerConfig` — Desk/locker contents
  - `RoutineConfig` — Daily routines
  - `OpinionConfig` — NPC opinions
  - `VendorConfig` — Vendor/item shop
  - `QuestConfig` — Quest system
  - `MinigameConfig` — Minigame settings
  - `GeneralMinigameConfig` — Global minigame config
  - `ScoreSystemConfig` — Scoring
- **Versus duration**: `m_VersusDays`, `m_VersusHours`, `m_VersusMinutes`
- **Override lists**: `m_ItemDataOverrides`, `m_AIEventOverrides`, `m_QuestOverrides`

---

## 2. Level Data & Flow

### LevelScript.cs (role)
- Stores `m_LevelSetup` (level data), `m_SubLevels` (SubLevel[] with root Transform + scene name)
- References: controllers, net views, dynamic objects, escape colliders

### LevelDataManager.cs (`LevelDataManager`)
- **Class**: `LevelDataManager : MonoBehaviour`
- **Singleton**: `m_Instance`
- **`PlaylistTypes`**: `Campaign`, `Versus`, `External`
- **Key fields**:
  - `PrisonData[] m_T17Levels` — All built-in prisons
  - `List<PlaylistData> m_CampaignPlaylists` — Campaign playlists
  - `List<PlaylistData> m_VersusPlaylists` — Versus playlists
  - `List<PlaylistData> m_CustomPlaylists` — Custom playlists
  - `m_ForceFirstPrison` — Force first prison (debug/tutorial)
  - `m_Order[]` — Playlist ordering
  - `m_CustomPrisonConfigs[3]` — Custom config per game mode

### LevelDetailsManager.cs (`LevelDetailsManager`)
- **Class**: `LevelDetailsManager : MonoBehaviour`
- **`LevelState` enum** — Main state machine:
  | State | Description |
  |-------|-------------|
  | `Idle` | Doing nothing |
  | `CreateLevel_Pending` | Level creation requested |
  | `CreateLevel_LoadBuilderScene` | Loading builder scene |
  | `CreateLevel_FindManagers` | Finding manager references |
  | `CreateLevel_CollectBuildInstructions` | Collecting instructions (from disk/network) |
  | `CreateLevel_ProcessBuildInstructions` | Processing instructions list |
  | `CreateLevel_GenerateBuildingBlocks` | Generating blocks from instructions |
  | `CreateLevel_PlaySceneLoad` | Loading play scene |
  | `LoadLevel_Pending` | Level load requested |
  | `LoadLevel_Build` | Building level from instructions |
  | `SaveLevel_Pending` | Save requested |
  | `SaveLevel_FindManagers` | Collecting manager data for save |
  | `SetUpLevel_Collect` | Setting up: collect data |
  | `SetUpLevel_Process` | Setting up: process data |
  | `MakeLevel_Init` | Initialise level creation |
  | `MakeLevel_Pending` | Level building pending |
  | `LoadLevel_UpdateLevel` | Updating level |
  | `LoadLevel_UpdateRegenerate` | Regenerating level |
  | `LoadLevel_ValidateZone` | Validating zones |
  | `Success` | Completed successfully |
  | `Failed` | Failed |
  | `UNKNOWN` | Unknown/error state |

- **`LevelEditorDataVersion`** enum: `UNKNOWN`, `V1_InitialRelease`, `V2_AddedZoneEditing`, `ALL_VERSIONS`
- **`LevelMode`**: `Build`, `Play`
- **`DiffecultyLevel`**: `Easy`, `Medium`, `Hard`, `Random`
- **`SerializationFlag`** (byte flags): File/Type/Version/Difficulty/Name/Description/Author headers, then per-manager flags (building blocks, routines, inmates, guards, items, rooms, alertness, power, weather, jobs, vendors, scores, quests, objectives, NPCs, visitors, solitary, guard towers, customisation, time)
- Uses `RequestResult` delegate for async callbacks
- Serialisation format: writes to `PrisonSnapshotIO` via byte stream

### LevelFlow.cs (`LevelFlow`)
- `LevelFlow : BaseFlowBehaviour` — empty/stub class

### LevelBuilder.cs (`LevelBuilder`)
- `LevelBuilder : MonoBehaviour` — stub class

### BaseLevelManager.cs (`BaseLevelManager`)
- **Class**: `BaseLevelManager : MonoBehaviour` (abstract)
- **`LevelLayers` enum**:
  | Layer | Description |
  |-------|-------------|
  | `Underground` | Below ground (sewers, tunnels) |
  | `GroundFloor` | Main prison floor |
  | `GroundFloor_Vent` | Vent layer on ground floor |
  | `FirstFloor` | Upper floor |
  | `FirstFloor_Vent` | Vent layer on upper floor |
  | `Roof` | Roof layer |
  | `TOTAL` | Count sentinel |

- **`TileProperty` flags** (int bitmask):
  | Flag | Bit | Description |
  |------|-----|-------------|
  | Blocked_H | 1 | Blocked horizontally |
  | Blocked_V | 2 | Blocked vertically |
  | NoBlocking | 4 | Cannot be blocked |
  | WallInRoom | 8 | Wall belongs to a room |
  | Room | 16 | Tile is in a room |
  | Scanned | 32 | Visited in scan |
  | ScanBlocked | 64 | Blocked during scan |
  | Available | 128 | Tile is usable |

  Helper constants: `Blocked = Blocked_H | Blocked_V`, `Blocked_All = All`, multiple `Inverse*` masks

- **`TileIDData`** struct: `m_iID` (tile index), `m_iVariant` (tile variant), with static masks (`IDMask = 0xFFFF`, `VariantMask = 0xFFFF0000`)
- **`InterestingLocations`** class: `LocationType` enum (`NowhereSpecial`, `OutsideDoor`), `m_v2Position`, `m_iValue`, `m_Layer`

- **`BuildingLayerData`** nested class (per layer):
  - `m_Tiles` — Ground tile system (Rotorz TileSystem)
  - `m_Walls` — Wall tile system
  - `m_TileProperties` — `TileProperty[14400]` (120×120 flags)
  - `m_ScratchTileProperties` — Temporary copy for scanning
  - `m_NavGraph`, `m_PathGrid` — Pathfinding
  - `m_VoxelMeshes`, `m_GroundTiles` — Mesh data
  - `m_bRebuildNavGraph` — Dirty flag
  - `m_SolidifyGroundTileID` — Default ground tile
  - `m_LightsInLayer` — Light objects
  - `m_ObjectsOnLayer` — Object list
  - `m_InBound`, `m_OutOfBound`, `m_BuildingBoundary` — Boundary definitions
  - `m_DoorsOnLayer`, `m_VentCoversOnLayer` — Doors/vents
  - `m_Voxels`, `m_iVoxelBoundsX/Y` — Voxel grid
  - `RoomObjectCollectionType` — Generic lookup for objects by type in a room

- Abstract methods: `AddSingle()`, `RemoveSingle()`, `GetInstance()`, `IsEverythingSetUp()`
- Handles voxel generation, pathfinding node creation per layer, tile flag manipulation

---

## 3. Prison State Managers

### PrisonAlertness.cs (`PrisonAlertness`)
- **Enum** values:
  | Value | Name |
  |-------|------|
  | 0 | `Stars_0` |
  | 1 | `Stars_1` |
  | 2 | `Stars_2` |
  | 3 | `Stars_3` |
  | 4 | `Stars_4` |
  | 5 | `Stars_5` |
  | 6 | `Lockdown` |

### PrisonAlertnessManager.cs (`PrisonAlertnessManager`)
- **Class**: `PrisonAlertnessManager : MonoBehaviour, IDeserializable, Saveable, INetworkLoadable`
- **Singleton**: `m_Instance`
- **`AlertnessReason` enum**: `UNASSIGNED, MissedRoutine, CharacterBound, NaughtyLocation, StandingOnDesk, Naked, HasContraband, Digging, Chipping, Cutting, Looting, CarryingObject, AttackingInmate, AttackingGuard, ContrabandOnFloor, ContrabandInContainer, DamagedTile, MissingTile, DugHole, Flooded, SearchingDesk, Escaping, Tardy, Disguised, ItemMissing, OutDuringLightsOut, FromMasterClient`
- **`NetSaveData`**: `short Alertness`
- **Events**: `AlertnessChanged` delegate
- **Key fields**: `m_Alertness` (current level), `m_bLockdownActive`, `m_fLockdownTimer`, `m_fMorningRollCallReduction`
- **Key methods**:
  - `IncreaseAlertness(int amount, AlertnessReason reason)` — Raises alertness, triggers responses
  - `DecreaseAlertness(int amount)` — Lowers alertness
  - `StartLockdown()` — Activates lockdown, notifies AI/lighting
  - `EndLockdown()` — Deactivates lockdown
  - `ResetAlertness()` — Resets to 0
  - `ReduceAlertnessForMorningRollCall()` — Routine-based reduction
  - `GetAlertnessLocalisationKey()` — Returns localisation key for current alertness

### PrisonPowerManager.cs (`PrisonPowerManager`)
- **Class**: `PrisonPowerManager : MonoBehaviour`
- **Singleton**: `m_Instance`
- **`GeneratorData`** class: `m_GeneratorColour`, `m_Generator`, `m_ElectricFences` (list)
- **Events**: `PowerChangedHandler` delegate
- **Key fields**: `m_bPowerActive`, `m_GeneratorDataList`
- **Key methods**:
  - `OnGeneratorStateChanged(Generator gen)` — When a generator is disabled/enabled, updates fence state
  - `IsPowerActive()` — Returns overall power state
  - `GetGeneratorsOnFloor(int floorIndex)` — Per-floor generator lookup

### PrisonCustomisationManager.cs (`PrisonCustomisationManager`)
- **Class**: `PrisonCustomisationManager : T17MonoBehaviour, Saveable, IDeserializable`
- **Singleton**: `m_Instance`
- **Static fields**: `m_NpcCustomisations`, `m_CustomisationSeed`, `m_NetNpcCustomisations`, `m_PrisonForCustomisation`, `m_bNpcCustomisationsInit`, `m_bUGCBlockEnforced`
- **Custom byte array serialisation** (Photon `RegisterType`)
- Handles seed-based NPC outfit/colour customisation, enforces UGC content blocks

### PrisonSetupMenu.cs (`PrisonSetupMenu`)
- **Class**: `PrisonSetupMenu : FrontendMenuBehaviour, ICustomisableCharacters`
- Frontend UI for prison setup: game room type, password, customisation dialog, avatar grid
- **Unlock panel**: `ProgressMilestone` + `CriteriaDisplay`
- Handles centre perks popup, character customisation modification

### PrisonAlterationSaveFixer.cs (`PrisonAlterationSaveFixer`)
- **Class**: `PrisonAlterationSaveFixer : MonoBehaviour`
- **Singleton**: `m_Instance`
- **Fields**: `m_InValidTiles` (BoxCollider[] — tiles that are invalid), `m_InValidRoom` (RoomBlob[] — rooms that are invalid), `m_SafeWayPoint`
- **`RunAllChecks()`**: Repositions characters found inside invalid tiles or rooms to safe waypoints

### PrisonEscapeCollider.cs (`PrisonEscapeCollider`)
- **Class**: `PrisonEscapeCollider : ColliderEvents`
- **Fields**: `m_EscapeCutscene` (Cutscene), `m_EscapeMethod` (EscapeMethod enum)
- On trigger, calls `EscapePrisonFunctionality` to trigger escape sequence
- Uses cutscene if specified, otherwise generic escape

---

## 4. Room System

### RoomBlob.cs (`RoomBlob`)
- **Class**: `RoomBlob : T17MonoBehaviour` — **the core room class**
- **`eLocation` enum** (world location types):
  | Location | Description |
  |----------|-------------|
  | `NowhereSpecial` | Default/unassigned |
  | `Corridor` | Hallways |
  | `InmateCell` | Prison cells |
  | `MealHall` | Cafeteria |
  | `Gym` | Exercise yard/gym |
  | `RollCall` | Assembly area |
  | `Shower` | Shower room |
  | `Library` | Library |
  | `Solitary` | Solitary confinement |
  | `Infirmary` | Medical bay |
  | `InfirmaryStockRoom` | Medical storage |
  | `JobOffice` | Job assignment office |
  | `ControlRoom` | Guard control room |
  | `ContrabandRoom` | Contraband checkpoint |
  | `Kitchen` | Kitchen (job) |
  | `Kennels` | Dog kennels |
  | `WardensOffice` | Warden's office |
  | `GuardQuarters` | Guard quarters |
  | `SocialArea` | Social/common area |
  | `Maintenance` | Maintenance (job) |
  | `JobRoom` | Generic job room |
  | `BuildingBoundary` | Edge of building |
  | `RoofArea` | Roof access |
  | `VisitorArea` | Visitor centre |
  | `CarPark` | Car park |
  | `GuardRoom` | Guard room |
  | `GuardTower` | Guard tower |
  | `WasteCollection` | Waste disposal |
  | `ShowTime` | Entertainment stage |
  | `CrowdSeating` | Audience seating |
  | `VisitorsCentre` | Visitor's centre |

- **`RoomAffinity`** enum: `SuperPopular=15, Interesting=8, Meh=5, Dull=2, UtterlyBoring=1`
- **`RoomSubIdentity_Location`**: `Indoors`, `Outdoors`
- **`RoomSubIdentity_Rules`**: `Inbounds`, `OffLimits`
- **`WaypointSortType`**: `HeadsFirst`, `TailsFirst`

- **Key fields**:
  - `m_ID` — Unique room identifier
  - `location` — `eLocation` type
  - `colour` — Room colour (visual)
  - `m_RoomAffinity` — Inmate affinity
  - `m_RoomAffinityGuard`, `m_RoomAffinitySupport` — Separate affinities
  - `m_InmateSafeSpace`, `m_GuardSafeSpace`, `m_SupportSafeSpace` — Safety flags
  - `m_AllowSniping` — Allow sniping in this room
  - `m_FloorMaterial` — Footstep sound material
  - `m_Waypoints` — `List<RoomWaypoint>`
  - `m_InmateRoomObjects`, `m_GuardRoomObjects` — Per-faction object lists
  - `m_InmateSpawnPoints` — Spawn points for inmates

- **Key methods**:
  - `FindObject(InteractionType, bool bFreeTimeObjects, bool bReserve)` — Find interactive object
  - `GetBetterWaypoint(Vector3 pos)` — Get nearest free waypoint
  - `GenerateRoomMesh()` — Create room visual mesh
  - `GenerateAllWaypoints()` — Create pathfinding waypoints from room shape

### RoomBlobData.cs (`RoomBlobData`)
- **Class**: `RoomBlobData : T17MonoBehaviour` (abstract)
- **Fields**: `m_RoomSpecificObjects` — `List<InteractiveObject>`
- **Abstract methods**: `AutoSetup()`, `AutoSetupZone()`, `AutoSetupRoomBlob()`, `AutoSetupZoneBlob()`
- All room subtype classes inherit from this

### RoomBlob Subtypes

| Class | Inherits | Key Fields | AutoSetup collects |
|-------|----------|------------|-------------------|
| `RoomBlob_Cell` | RoomBlobData | `m_SpawnPoints`, `m_Door` | SpawnPoint, DeskInteraction, BedInteraction, ToiletInteraction, Door |
| `RoomBlob_ContrabandRoom` | RoomBlobData | `m_Desk` | DeskInteraction |
| `RoomBlob_ControlRoom` | RoomBlobData | `Computer` | GuardComputerInteraction, InteractiveObject |
| `RoomBlob_CrowdSeating` | RoomBlobData | *(none specific)* | RoomWaypoint |
| `RoomBlob_GuardQuarters` | RoomBlobData | `m_Crates` | GuardOutfitCrateInteraction |
| `RoomBlob_Gym` | RoomBlobData | `GymEquipment` | GymInteraction |
| `RoomBlob_Infirmary` | RoomBlobData | `m_MedicBeds`, `m_Medics` | MedicBedInteraction, AICharacter |
| `RoomBlob_JobOffice` | RoomBlobData | *(via BlockTagger)* | BlockTagger (chairs/officers/desks) |
| `RoomBlob_JobRoom` | RoomBlobData | `m_JobType`, `m_Door`, `m_Dispensers`, `m_Processors`, `m_Collectors`, `m_CustomerWaitObject`, `m_JobBehaviour`, `m_JobTaunters`, `m_TutorialBoard` | Multi-interaction |
| `RoomBlob_Kennel` | RoomBlobData | `m_Bed`, `m_SecondaryBeds` | KennelInteraction, AICharacter_Dog |
| `RoomBlob_MealHall` | RoomBlobData | `Chairs`, `Tray` | ChairInteraction, TrayInteraction |
| `RoomBlob_RollCall` | RoomBlobData | *(none specific)* | RoomWaypoint, AICharacter_Guard |
| `RoomBlob_Shower` | RoomBlobData | `Showers` | ShowerInteraction |
| `RoomBlob_ShowTime` | RoomBlobData | `m_PerformanceInteractions` | *(stub)* |
| `RoomBlob_Solitary` | RoomBlobData | `m_Door`, `m_Bed`, `m_TaskObject`, `m_CharacterInSolitary` | Door, BedInteraction, SolitaryPotatoesInteraction |

### RoomFloor.cs (`RoomFloor`)
- **Class**: `RoomFloor : MonoBehaviour`
- **Constants**: `kFloorWidth = 121`, `kFloorHeight = 121`, `c_iRoomMaxSize = 16`
- **Fields**:
  - `m_Rooms` — `Dictionary<int, RoomBlob>` (room ID → room)
  - `m_RoomTypeLookup` — `Dictionary<RoomBlob.eLocation, List<RoomBlob>>`
  - `m_FloorMap` — `int[14641]` (121×121 array) storing room ID per tile (0 = no room)
  - `m_FloorWidth`, `m_FloorHeight`, `m_FloorIndex`
  - `m_AssociatedNavGraph` — ArrowTracer pathfinding graph
- **Methods**:
  - `SetDims(int w, int h)` — Resize floor map
  - `AddRoom(RoomBlob room)` — Register room, assign ID, update floor map
  - `GetRoom(int id)` — Get room by ID
  - `GetRoomList()` — All rooms on this floor
  - `GetTileRoom(int x, int y)` — Room at tile
  - `FloodFillForRoom()` — Flood fill to detect room boundaries

### RoomManager.cs (`RoomManager`)
- **Class**: `RoomManager : T17MonoBehaviour, INetworkLoadable, IDeserializable, Saveable`
- **Singleton**: `m_Instance`
- **Fields**:
  - `m_Floors` — `List<RoomFloor>`
  - `roomUtil` (RoomUtility), `nextRoomID`, `defaultWidth = 121`, `defaultHeight = 121`
  - `m_InmateSpawnPoints`, `m_SpawnPointForCharacter`, `m_SpawnPointsKeyForRandom`
  - Safe space arrays: `mInmateSafeStart`, `mInmateSafeEnd`, `mGuardSafeStart`, `mGuardSafeEnd`, `mSupportSafeStart`, `mSupportSafeEnd` per floor
- **Methods**:
  - `GetSpawnPointForCharacter(Character c)` — Assign spawn point
  - `AssignInmateToRandomCell(InmateController ic)` — Random cell assignment
  - `GetInmateSafeCell()` / `GetGuardSafeRoom()` — Safe room lookup
  - `FindContrabandDesk()` — Contraband desk lookup
- **Inner `SaveData`**: `v` (int[]) and `s` (int[]) — version and serialised data

### RoomMarker.cs (`RoomMarker`)
- **Class**: `RoomMarker : MonoBehaviour`
- **`MarkerType` enum**: `Normal`, `Escape`, `RollCall`, `Interactive`, `KeepClearSpot`, `BlockEscape`

### RoomWaypoint.cs (`RoomWaypoint`)
- **Class**: `RoomWaypoint : MonoBehaviour`
- **Fields**: `m_ChildToRemove`, `m_FacingDirection` (Direction: `Up`, `Down`, `Left`, `Right`), `m_WaypointSide`, `m_Reservation` (Character ref), `m_bReservable`
- `GetPosition()` — Returns cached Transform.position

### RoomLabel.cs (`RoomLabel`)
- **Enum**: `None`, `A`, `B`, `C`, `D`, `E`, `F`, `G`, `H`, `I`, `J`, `K`, `L`, `M`, `N`, `O`, `P`, `Q`, `R`, `S`, `T`, `U`, `V`, `W`, `X`, `Y`, `Z`, `COUNT`

### RoomInteraction.cs (`RoomInteraction`)
- **Class**: `RoomInteraction : ActionTask<AICharacter>` (NodeCanvas action task)
- **Parameters**: `m_InteractionType`, `m_RoomLocation`, `m_bFreeTimeObjects`, `m_bReserve`, `m_fMinRunDistance`, `m_fMaxRunDistance`
- Agent finds object via `FindObject()` on RoomBlob, moves to it, performs interaction
- Uses `NetObjectLock` for network synchronisation

### RoomFilterButtonToggle.cs
- UI toggle for filtering room types in editor/views

### RoomMeshGenerator.cs
- Generates mesh geometry for rooms (walls, floors)

### RoomOcclusionMesh.cs
- Occlusion culling meshes for room visibility

### RoomProcessingTool.cs
- Editor tool for processing room data

### RoomUtility.cs
- Utility/helper methods for room operations

---

## 5. Floor System

### FloorManager.cs (`FloorManager`)
- **Class**: `FloorManager : T17MonoBehaviour, IDeserializable, INetworkLoadable, Saveable`
- **`FLOOR_TYPE` enum**: `Floor_Roof`, `Floor_Vent`, `Floor_Prison`, `Floor_UnderGround`
- **`TileSystem_Type` enum**: `TileSystem_Ground`, `TileSystem_Wall`, `TileSystem_GroundPlops`, `TileSystem_ObjectPlops`, `TileSystem_Lights`, `TileSystem_WallPlops`
- **`Floor` nested class**:
  `m_FloorName`, `m_FloorType`, `m_zPos`, `m_FloorIndex`, `m_bIsStartFloor`
  `m_FloorRootObject` (Transform root)
  `m_TileSystems[]` (Rotorz TileSystem per type)
  `m_RoomFloor` (RoomFloor ref)
  `m_bLocked` (locked/unlocked)
  `m_MapTexture` (Texture2D for minimap)
  `m_FloorUINumber` (display index)
- **Key fields**:
  `m_Floors` — `List<Floor>`
  `m_FloorCount` — typically 5 (Underground, Ground, Ground Vent, First, Roof)
  `m_DefaultWidth = 120`, `m_DefaultHeight = 120`
  Tile alias dictionaries for block ID ↔ tile ID mapping
- **Methods**:
  - `CreateFloor(FloorType, string, int zPos)` — Creates a new floor
  - `FindFloorByIndex(int idx)` — Lookup by index
  - `FindFloorAtZ(float z)` — Lookup by Z position
  - `GetTileGridPoint(Vector3 worldPos)` — World → tile coords
  - `AddVentCover(VentCover cvr)` — Register vent cover
  - `LoadFloorFromSave(byte[] data)` — Deserialise floor
  - `GenerateAllFloorMeshes()` — Rebuild visual meshes

### FacadesManager.cs (`FacadesManager`)
- **Class**: `FacadesManager : MonoBehaviour`
- **Singleton**: `m_Instance`
- **Fields**: `m_FacadeFloors` — `List<FacadeFloor>`, `defaultWidth = 120`, `defaultHeight = 120`
- `Init()` — Loads/creates facade floors, matching FloorManager floors

### FacadeFloor.cs (`FacadeFloor`)
- **Class**: `FacadeFloor : MonoBehaviour`
- **Constants**: `kFloorWidth = 120`, `kFloorHeight = 120`
- **Fields**: `m_FloorMap` — `int[14400]` (120×120), stores facade tile IDs
- Indexer: `FloorMap[x, y]` get/set

### ZoneDetailsManager.cs (`ZoneDetailsManager`)
- **Class**: `ZoneDetailsManager : MonoBehaviour`
- **`ZoneTypes` enum**: `INVALID, InmateCell, MealHall, Gym, RollCall, Shower, Library, Solitary, Infirmary, JobOffice, ControlRoom, ContrabandRoom, Kitchen, Kennels, WardensOffice, GuardQuarters, Maintenance, GuardRoom, SocialArea, JobRoom, Generators, Job_Woodwork, Job_Blacksmith, TOTAL`
- **`LimitationType`**: `FixedSize`, `FromBlockGroup`
- **`MustBeReachableBy`**: `Player`, `Anyone`
- **`ZoneDetails` class**: Zone definition with size constraints, required block groups, light rules, reachability
- **`LayerLight` class**: Light rules per layer (`AboveBlockGroup`, `DistanceFromStuff`, `LightObject`, `BlockGroup`, nearest allowed distances)
- **`ZoneLimitations`**: Validation rules per zone type

### CullingBuckets.cs
- Organises objects into spatial buckets for efficient culling

### CullingObjectCollector.cs
- Collects objects that should be culled

### CullingForceFloor.cs
- Forces a specific floor to remain visible (not culled)

---

## 6. Destructibles & Vents

### DamagableTile.cs (`DamagableTile`)
- **Class**: `DamagableTile : T17MonoBehaviour, ISaveableTileComponent`
- **`DamageAction` enum**: `Dig`, `Chip`, `Cut`, `Unscrew`, `Hole`
- **Fields**:
  - `m_DamageAction` — How this tile is damaged
  - `m_LimitDamageToItems[]` — Items that can damage this tile
  - `m_LimitCoverToItems[]` — Items that can cover this tile
  - `m_InitialHealth` — HP (default –1)
  - `m_StayVisible` — Stay visible when destroyed
  - `m_AllowRandomRock` — Spawn rocks when damaged
  - `m_Materials[]` — Damage stage materials
  - `m_ReclaimedItem` — Item gained when reclaimed
  - `m_Renderer`, `m_Collider`, `m_filter` — Visual/collision
  - `m_Health` — Current HP
  - `m_ElectricFence` — Linked fence
  - `m_HoldingItemViewID`, `m_HoldingItemName` — Held item (cover)
  - `m_ItemCover` — Cover object
  - `m_DamageStage` — Current visual stage (0–3+)
  - `m_DestroyedBy` — Character who destroyed it
  - `m_TileRow`, `m_TileColumn` — Tile position
  - `m_GroundTileUnder` — Ground tile beneath
  - `m_PinID` — Map pin
  - `m_DiggableNeighbours`, `m_ChippableNeighbours`, `m_IndestructableNeighbours` — Adjacent tiles
- **Neighbour offsets**: 8-directional array `[−1,−1]..[1,1]`
- Health threshold triggers: damage stages at HP thresholds
- On destroy: propagates to neighbours, updates pathfinding, drops items

### DamagableTileLink.cs (`DamagableTileLink`)
- Links damagable tiles together for damage propagation

### IndestructibleTile.cs (`IndestructibleTile`)
- Tile that cannot be damaged/destroyed

### PreventTileDamage.cs (`PreventTileDamage`)
- Component that prevents damage to tiles in its range

### VentCover.cs (`VentCover`)
- **Class**: `VentCover : MonoBehaviour`
- **`CoverType` enum**: `Vent`, `Sewer`
- **Fields**: `m_TileRow`, `m_TileColumn`, `m_TileFloor`, `DamagableTile` ref, light child
- On health changed → can break open → different behaviour depending on cover type (vent vs sewer)

### VentRepresentation.cs (`VentRepresentation`)
- **Class**: `VentRepresentation : BaseLevelEditorKeepers`
- Instantiates visual prefab on the walls layer to represent vent locations
- `Setup()` returns `AfterSetup.Disable`

---

## 7. Building Blocks

### BuildingBlockManager.cs (`BuildingBlockManager`)
- **Class**: `BuildingBlockManager : MonoBehaviour`
- **Singleton**: `m_Instance`
- **`LimitationGroup` inner class**: `m_Perminent`, `m_TextResourceName`, `m_GroupName`, `m_Min`, `m_Max`, `m_Valid`, `m_ErrorResourceID`, `m_Hashcode`, `m_Routine`, `m_AutoMinimums`, `m_ZoneType`, `m_ErrorID`, `m_CurrentTotal`
  - `HasMetRequirements()` / `IsWithinLimits()` — Validation
- **`DefaultLimitationGroups` enum**: `InmateCell, MealHall, Gym, RollCall, Shower, Library, Solitary, Infirmary, JobOffice, ControlRoom, ContrabandRoom, Kitchen, Kennels, WardensOffice, GuardQuarters, Maintenance, Visitor, GuardTower, WasteCollection, GuardRoom, Inmate, Guard, InfirmaryStockRoom, SocialArea, JobRoom, Generators, Job_Woodwork, Job_Shoemaker, Job_Blacksmith, Job_Mining, Job_Plumbing, Job_Electrician, Job_Kitchen, Job_Farming, Job_WasteDisposal, Job_MailSorting, Job_CanineCarer, Job_Painting, Job_PumpkinCarving, Job_VampireLaundry, Job_TrickOrTreat, TOTAL`
- **`DashedBorderEnum` flags**: L, R, T, B and composite (TL, TR, etc.) plus inverse values
- **`FamilyTypes`**: Active flag, FamilyName, Order
- **`BlockThemeData`**: BlockSet, TextResourceTitle, Sprite
- **`DefaultBlocks` struct**: Inside/outside default block IDs per floor
- **Fields**:
  - `m_BuildingBlocks[]` — All building blocks (indexed by ID)
  - `m_LimitationGroups[]` — Limitation groups
  - `m_DashLines_Materials[16]` — Dash line border materials (3 sets)
  - `m_FamilyTypes[63]` — Family type configs
  - `m_BlockThemeData` — Theme data list
  - `m_DefaultTileBlock[6]` — Default inside/outside tiles per layer
  - `m_MaterialPaths`, `m_DoubleHeightMaterialPaths`, `m_BlockIconPaths`, `m_ZoneIconPaths`, `m_StampPaths`, `m_PrefabPaths` — Resource paths
  - `m_DefaultRoutines[24]` — Default routines
  - Audio banks: `m_MusicBank`, `m_AmbientBank`, `m_EffectsBank`
- **Methods**:
  - `RebuildData()` — Re-indexes all building blocks in children
  - `AddBlockTheme()` / `RemoveBlockTheme()`
  - `GetBlock(int id)` — Get block by ID
  - `GetLimitationGroup(int id)` — Get group by index

### BaseBuildingBlock.cs (`BaseBuildingBlock`)
- **Class**: `BaseBuildingBlock : MonoBehaviour` (abstract)
- **`BuildingBlockType` enum**: `UNKNOWN, Tile, Wall, Decoration, Object, Complex, Room, TOTAL`
- **`BuildingBlockDrawingMode` enum**: `INVALID, Stamp, Paint, Marquee, MarqueeLine, TOTAL`
- **`CompletionState` enum**: `Complete, Nearly_Complete, Unfinished, TOTAL`
- **`BlockSet` flags**: `CentrePerks(1), CougarCreek(2), RattleSnake(4), POW(8), HMSOrca(0x10), HMPOffshore(0x20), FortTundra(0x40), Area17(0x80), AirForceCon(0x100), USSAnomaly(0x200), GloriousRegime(0x400), WickedWard(0x800), SantasShakedown(0x1000)`
- **`PurposeGroups` flags**: General, RollCall, InmateCell, SocialArea, Library, Gym, Showers, Kitchen, MealHall, GuardQuarters, GuardRoom, ControlRoom, ContrabandRoom, WardensOffice, Kennels, Solitary, Infirmary, Maintenance, JobOffice, Job_Woodwork, Job_Blacksmith, Escape
- **`GroupFlags`**: 32 group flags with inverse masks

### BuildingBlock Subtypes

| Class | BlockType | Description |
|-------|-----------|-------------|
| `BuildingBlock_Complex` | Complex | Multi-block composite |
| `BuildingBlock_Decoration` | Decoration | Visual-only decoration |
| `BuildingBlock_Object` | Object | Interactive object block |
| `BuildingBlock_Room` | Room | Room-defining block |
| `BuildingBlock_Single` | Tile | Single tile placement |
| `BuildingBlock_Tile` | Tile | Tile with variants |
| `BuildingBlock_TMS` | Tile | Tile Management System tile |
| `BuildingBlock_UIButton` | — | Editor palette button |
| `BuildingBlock_Wall` | Wall | Wall block |

### BuildingBlock_UIButton.cs
- Stores `m_BlockID` reference for palette UI

### BuildingBlock_FilterManager.cs
- Filters available blocks by context (block set, purpose, groups)

### BuildingBlockHelper.cs
- Utility methods for building block operations

### BuildingBlockGroupManager.cs
- Manages groups of building blocks (used for zone requirement validation)

### BaseBuildInstruction.cs (`BaseBuildInstruction`)
- **Class**: `BaseBuildInstruction` (Serializable)
- **`InstructionTypeEnum`**: `UNKNOWN, Draw_Once, Draw_Area, Complex, ChangeLayer, ChangeEnvironment, Command, Draw_OnceWall, Draw_AreaWall, Delete, PreventUndo, IncrementLayer, DecrementLayer, Zone`
- **Fields**: `m_Type`, `m_BuildingBrickID`, `m_XPosition`, `m_YPosition`, `m_iRandomSeed`, `m_XCount`, `m_YCount`, `m_Layer`, `m_bInside`, `m_ZonePrint`
- **Factory methods**:
  - `CreateOnce(sbyte x, sbyte y, int blockID, int seed)` — Single tile
  - `CreateOnceWall(sbyte x, sbyte y, int blockID, int seed)` — Single wall
  - `CreateArea(sbyte x, sbyte y, sbyte w, sbyte h, int blockID, int seed)` — Area fill
  - `CreateAreaWall(...)` — Area wall fill
  - `CreateZone(ZoneTypes, x, y, w, h, zonePrint, id)` — Zone definition
  - `DeleteZone(sbyte x, sbyte y)` — Zone deletion
  - `CreateLayerChange(LevelLayers layer)` — Layer switch
  - `CreateChangeEnvironment(bool inside)` — Inside/outside toggle
  - `IncrementLayer()` / `DecrementLayer()` — Layer offset

### BuildingInstructionManager.cs (`BuildingInstructionManager`)
- **Class**: `BuildingInstructionManager : MonoBehaviour`
- **Instruction data containers** (all serialisable with marker bytes):
  | Container | Marker | Content |
  |-----------|--------|---------|
  | `InstructionList` | 202/102 | Ordered list of `(InstructionTypeEnum, index)` pairs |
  | `Instruction_Complex` | 203/102 | Complex instructions with sub-instructions |
  | `Instruction_Once` | 204/102 | Single tile placements: `(blockID, x, y, seed)` |
  | `Instruction_OnceWall` | 205/102 | Single wall placements: `(blockID, x, y, seed)` |
  | `Instruction_Area` | 206/102 | Area fill: `(blockID, x, y, seed, xCount, yCount)` |
  | `Instruction_AreaWall` | 207/102 | Area wall fill |
  | `Instruction_Delete` | 208/102 | Delete instructions |
  | `Instruction_Environment` | 209/102 | Environment change |
  | `Instruction_Zones` | 210/102 | Zone definitions |

  Each has `SerializeOurData(ref List<byte>)` / `DeserializeOurData(ref List<byte>, ref int)` with marker byte envelopes

- **`InstructionOnceElement`**: `m_BuildingBlockID`, `m_XPosition`, `m_YPosition`, `m_iRandomSeed`, `m_Previous` (for undo)
- **`InstructionAreaElement`**: Same as Once + `m_XCount`, `m_YCount`, `m_Previous[]`
- **`InstructionComplexElement`**: `m_BuildingBlockID` + `m_ComplexInstructions` (InstructionList)

### BuildingInstructionManagerV2.cs
- Updated/refactored version of the instruction pipeline

### EditorLevelEditorManager.cs (`EditorLevelEditorManager : BaseLevelManager`)
- Editor-time level manager
- Overrides `AddSingle()` and `RemoveSingle()` to place/remove tiles, decorations, objects, and walls
- Tracks `m_DeleteingRoom` flag
- `IsEverythingSetUp()` checks all 6 layers for tile, wall, and object data

### EditorLevelEditorManagerV2.cs
- Updated version of editor level manager

### EditorFlowInterface.cs
- Interface for editor flow control

---

## 8. Level Editor

### LevelEditor_Controller.cs (`LevelEditor_Controller`)
- **Class**: `LevelEditor_Controller : MonoBehaviour`
- **Singleton**: `m_Instance`
- **`EditMode` enum** (state machine):
  `INVALID, NoBrush, BlockSelected, FreeDrawing, Marquee, MarqueeLine, Deleting, MovingCamera, SelectingObjectInLevel, SelectedObjectInLevel, MovingBlock, CopyMarquee, CopyMarqueeAdd, CopyMarqueeDelete, CopySelectedObjectInLevel, CopySelectedObjectInLevel_Edit, Zone_WaitingToCreate, Zone_Creating, Zone_Selected, Zone_Editing, Zone_Adding, Zone_Deleting`
- **`DrawingStatus`**: `Nothing, Painting, Marquee`
- **`CopyEnum` flags**: `Empty, Marked, MarkedRoom1..4, Scanned, ScannedRoom1..4` + composites
- **`ScanBits` flags**: `EMPTY, OCCUPIED, SCANISLAND, SCANHOLE, ADDED`
- **`AudioTypes`**: Ambient, floor change, delete, marquee, place, zoom, redo/undo, error, tab, save
- **Key fields**:
  - References: `m_LevelManager`, `m_InstructionManager`, `m_BlockManager`, `m_BrushController`, `m_UIController`, `m_HighlightManager`, `m_LevelDetailsMan`, `m_ZoneManager`, `m_Cursor`
  - `m_MainCamera`, `m_Mouse`, `m_Player` (Rewired)
  - `m_PreviewTexture`, `m_ValidPreviewTexture`
  - `m_EditMode`, `m_PreviousEditMode`
  - `m_CurrentBlock`, `m_CurrentVariation`, `m_NumberOfVariations`
  - `m_CopyArea[14400]`, `m_CopyAreaFlags[14400]`
  - Camera: `m_fOrthographicSize`, zoom levels, pan speed, edge distance
  - `m_Brush`, `m_BrushVisibility`, `m_BrushOffset`
  - Marquee: position, size, audio timeout, resource
  - Zone editing: `m_CurrentZone`, `m_OverZone`, `m_ZoneToCreate`, `m_BadZone`
  - Undo/redo: `m_UndoButton`, `m_RedoButton`, `m_bCanUndo`, `m_bCanRedo`
  - Snapshot: `m_SnapshotDelegate`, `m_SnapshotActionDelegate`, `m_TriggerSnapshot`
- **Methods** (extensive): brush management, marquee operations, zone creation, camera control, undo/redo, copy/paste, audio, snapshot, validation

### LevelEditor_UIController.cs (`LevelEditor_UIController`)
- Editor UI management: tabs, palettes, toolbars

### LevelEditor_ZoneManager.cs (`LevelEditor_ZoneManager : MonoBehaviour`)
- **Singleton**: `m_Instance`
- **`Zone` nested class**:
  - `m_bActive`, `m_bValid`, `m_bReachable`
  - `m_ZoneType`, `m_ZoneDetails`, `m_ID`
  - `m_IconPosition`, `m_Bottom`, `m_Left`, `m_Width`, `m_Height`
  - `m_ZonePrint` (byte[] — bitmask of tiles in zone, 1 bit per tile)
  - `m_Layer`, `m_TotalTiles`, `m_TotalIgnoredTiles`
  - `m_strErrors`, `m_RequiresUpdate`, `m_RequiresZonePrintUpdate`
  - `m_BlocksInZone` (List<ObjectsInZone>), `m_Required`, `m_RequirementsMet`
  - `m_AllocatedRoomID`, `m_ZoneGraphic`, `m_ZoneIcon`
  - Methods: `IsFullyValid()`, `IsGameObjectInZone()`, `GetMap()`, `GetRequireDataForBlockGroup()`

- **`ObjectsInZone`**: `m_X`, `m_Y`, `m_BlockID`, `m_Object`, `m_ComplexID`, `m_InteractPoints`, `m_BeingBlocked`, `m_OnlyPartiallyIn`
- **`StillRequired`**: `m_BlockGroupIndex`, `m_Minimum`, `m_Maximum`, `m_CurrentTotal`, `m_Error`
- **`Errors`**: `m_StrError`, `m_BlockSetIndex`

- **`ZoneMap`**: `int[14400]` — maps tiles to zone ID
- **`ZonesInArea` enum**: `JustOurs, Nothing, Others, OursAndOthers`
- **Key fields**:
  - `m_Zones[]`, `m_TotalZonesInUse`, `m_BlockGroupManager`
  - `m_ZoneMap[6]` — Per-layer zone maps
  - Prefabs: `m_ZoneIconPrefab`, `m_ZoneMarqueePrefab`, `m_FlashingErrorMarqueePrefab`, `m_SolidErrorMarqueePrefab`
- **Methods**:
  - `AddZone(ZoneTypes, x, y, w, h, byte[] zonePrint)` — Create new zone
  - `RemoveZone(int id)` — Delete zone
  - `ValidateZone(int id)` — Check requirements/validity
  - `ValidateAllZones()` — Full validation pass
  - `UpdateZonePrint(int id)` — Rebuild zone bitmap
  - `GetZonesForLayer(LevelLayers layer)` — Per-layer zone list

### LevelEditor_ZoneManager.Zone validation flow:
1. Zone print is updated (converts tile positions to bitmask)
2. Zone is validated: checks block group requirements, size, reachability
3. Results cached in `m_Required` / `m_RequirementsMet`
4. UI updates via zone cards

### LevelEditor_Settings.cs (`LevelEditor_Settings`)
- Editor configuration/settings

### LevelEditor_PrisonSettingsDialog.cs
- UI dialog for prison settings (name, description, difficulty, etc.)

### LevelEditor_PrisonCheckerDialog.cs
- Validation dialog that checks prison completeness

### Additional LevelEditor Components

| File | Class | Purpose |
|------|-------|---------|
| `LevelEditor_BaseTab.cs` | LevelEditor_BaseTab | Base class for editor tabs |
| `LevelEditor_BlockSection.cs` | LevelEditor_BlockSection | Block category UI section |
| `LevelEditor_ButtonToolTip.cs` | LevelEditor_ButtonToolTip | Tooltip component |
| `LevelEditor_ButtonWithToolTip.cs` | LevelEditor_ButtonWithToolTip | Button with tooltip |
| `LevelEditor_CheckList.cs` | LevelEditor_CheckList | Check list widget |
| `LevelEditor_CheckList_Entry.cs` | LevelEditor_CheckList_Entry | Check list item |
| `LevelEditor_CreateTooltip.cs` | LevelEditor_CreateTooltip | Tooltip factory |
| `LevelEditor_Cursor.cs` | LevelEditor_Cursor | Editor cursor visual |
| `LevelEditor_ErrorList.cs` | LevelEditor_ErrorList | Error list panel |
| `LevelEditor_FilterButton.cs` | LevelEditor_FilterButton | Filter toggle |
| `LevelEditor_FlashingMarquee.cs` | LevelEditor_FlashingMarquee | Flashing selection marquee |
| `LevelEditor_GridCellPopulator.cs` | LevelEditor_GridCellPopulator | Grid cell filler |
| `LevelEditor_InvalidZoneCard.cs` | LevelEditor_InvalidZoneCard | Invalid zone display |
| `LevelEditor_Marquee.cs` | LevelEditor_Marquee | Marquee selection |
| `LevelEditor_RequirementsPopulator.cs` | LevelEditor_RequirementsPopulator | Zone requirements display |
| `LevelEditor_RoutineEntry.cs` | LevelEditor_RoutineEntry | Routine entry UI |
| `LevelEditor_SavingIcon.cs` | LevelEditor_SavingIcon | Saving indicator |
| `LevelEditor_ToolTip.cs` | LevelEditor_ToolTip | General tooltip |
| `LevelEditor_UIRequirement.cs` | LevelEditor_UIRequirement | UI requirement display |
| `LevelEditor_ValidZoneCard.cs` | LevelEditor_ValidZoneCard | Valid zone card |
| `LevelEditor_ZoneCard.cs` | LevelEditor_ZoneCard | Zone card base |
| `LevelEditor_ZoneCardNoneSelected.cs` | LevelEditor_ZoneCardNoneSelected | None-selected card |
| `LevelEditor_ZoneControl.cs` | LevelEditor_ZoneControl | Zone control widget |
| `LevelEditor_ZoneCreateButton.cs` | LevelEditor_ZoneCreateButton | Create zone button |
| `LevelEditor_ZoneIconControl.cs` | LevelEditor_ZoneIconControl | Zone icon display |
| `LevelEditor_ZoneInvalidIndicator.cs` | LevelEditor_ZoneInvalidIndicator | Invalid zone indicator |
| `LevelEditor_ZoneTab.cs` | LevelEditor_ZoneTab | Zone tab UI |
| `LevelEditor_ZoneWarning.cs` | LevelEditor_ZoneWarning | Zone warning display |
| `LevelEditorBorderElement.cs` | LevelEditorBorderElement | Border visual |
| `LevelEditorBrushController.cs` | LevelEditorBrushController | Brush controller |
| `LevelEditorBrushElement.cs` | LevelEditorBrushElement | Brush element visual |
| `LevelEditorHighLightManager.cs` | LevelEditorHighLightManager | Highlight management |
| `LevelEditorQuantizer.cs` | LevelEditorQuantizer | Grid snapping |
| `LevelEditorTileHighlight.cs` | LevelEditorTileHighlight | Tile highlight visual |
| `LevelEditorUISetup.cs` | LevelEditorUISetup | UI initialisation |
| `LevelEditor_AutoScale.cs` | LevelEditor_AutoScale | Auto-scaling |

---

## 9. Lighting

### LightingManager.cs (`LightingManager`)
- **Class**: `LightingManager : T17MonoBehaviour, IControlledUpdate, ISerializationCallbackReceiver`
- **`LightGroup` inner class**:
  - `m_Name`, `m_ID`, `m_Lights` (List<LightControl>), `m_Effects` (List<LightEffect>)
  - **`TimeOnOff`**: `m_StartHour/Minutes`, `m_EndHour/Minutes`, `m_bAlwaysOn`, computed `StartInMinutes`/`EndInMinutes`
  - **`SerializedLightEffect`**: `effectType(int)`, `data(string)` — for serialisation
  - `m_Times` (List<TimeOnOff>) — Multiple on/off schedules
  - `m_ChangedMinutes` — Accumulated time change
  - `IsActive`, `Init()`, `Update(float timeInMinutes)`
- **Fields**:
  - `m_LightGroups` — `List<LightGroup>`
  - Serialisation callbacks for custom data
  - `ControlledUpdate` — Frame-rate independent update

### LightControl.cs (`LightControl`)
- Controls individual light state: on/off, dimming, colour

### LightEffect.cs (`LightEffect`)
- **Class**: `LightEffect` — abstract base for light effects

### LightEffect Subtypes

| Class | Description |
|-------|-------------|
| `LightEffect_Lockdown` | Red/alert lighting during lockdown |
| `LightEffect_LockdownFadeOut` | Fade-to-black during lockdown |
| `LightEffect_Party` | Coloured/celebratory lighting |
| `LightEffect_ShowTime` | Stage/performance lighting |

### CustomLight.cs / CustomLightManager.cs / CustomLightRenderer.cs
- Custom light entities with their own rendering pipeline
- Manager handles lifecycle and updates

### LightOcclusionManager.cs / LightOcclusionRenderer.cs
- Light occlusion system: manages and renders occlusion geometry for light sources
- Prevents light from passing through walls

---

## 10. Weather

### WeatherEffectManager.cs (`WeatherEffectManager`)
- **Class**: `WeatherEffectManager : MonoBehaviour`
- **Singleton**: `m_Instance`
- **Constants**: `kMaxFullscreenWeatherEffects = 5`
- **Fields**:
  - `m_TiledFullScreenWeatherEffects[5]` — Active weather effects
  - `m_PlayerCameras[4]` — Player camera refs
  - `m_WeatherRendererPrefab` — Prefab for weather visual
  - `m_WeatherRenders[4]` — Spawned weather renderers per camera
- **Methods**:
  - `Enable()` / `Disable()` — Global toggle
  - `CleanUpWeatherAssets()` — Destroy renderers, stop audio
  - `Start()` — Spawn weather renderers for each camera

### WeatherEffectData.cs (`WeatherEffectData`)
- Weather effect configuration data

### WeatherRenderer.cs (`WeatherRenderer`)
- Renders weather particles/effects for a camera

### WeatherObjectRenderer.cs (`WeatherObjectRenderer`)
- **Class**: `WeatherObjectRenderer : MonoBehaviour`
- `m_ParentCam` — Camera reference
- Renders weather effects on scene objects (rain on surfaces, etc.)

---

## 11. Cameras

### CameraManager.cs (`CameraManager`)
- **Class**: `CameraManager : MonoBehaviour, IControlledUpdate`
- **`CameraOpModes` enum**: `Unassigned, Game, Cutscene`
- **`PlayerBindingID` enum**: `CM_PBID_UNSET=0, CM_PBID_PLAYER_ALPHA=1, CM_PBID_PLAYER_BETA=2, CM_PBID_PLAYER_GAMMA=3, CM_PBID_PLAYER_DELTA=4, CM_PBID_WORLD_CAM_TOGGLE=666, CM_PBID_WORLD_CAM_VISIBLE=999`
- **`CameraBinding` inner class**:
  - `m_PlayerBinding`, `m_Camera`, `m_Character` (bound character)
  - `m_TargetPosition`, `m_NewTargetPosition`
  - `m_ListenerIndex`, `m_CameraID`
  - `m_MaxCameraPos`, `m_MinCameraPos` — Bounds
  - `m_NormalizedViewportHeight` — Split-screen height factor
  - `m_CameraView` — CameraView component
  - `m_CullerUpdateMode` — Culling mode
  - `m_CharacterStencilRenderer`, `m_Blur`, `m_CombatHitShake`
  - `m_OverscanCamera`, `m_CameraPreCuller`
  - Events: `OnBoundCharacterAttacked` → shake
- **Delegates**: `CameraManagerHandler`, `CameraManagerModeChangeHandler`, `ManagerCreationHandler`, `CameraViewChangedHandler`
- **Key fields**:
  - `m_CameraBindings[4]` — Up to 4 player cameras
  - `m_OpMode` — Current operation mode
  - `m_CachedTrackableObject` — Cutscene tracking
  - `m_FollowDeadZone`, `m_Smooth` — Camera follow parameters
  - `m_ZOffsetsFromPlayer` — Z-depth per player
  - `m_SplitThreshold` — Distance to trigger split-screen
  - `m_bAlwaysSplit` — Force split-screen
  - `m_MapBoundsBR`, `m_MapBoundsTL` — Camera bounds
  - `m_bShowFacade` — Facade visibility
  - `m_CombatHitShakeIntensity/Duration` — Shake on damage
  - `m_BlurEffectEnabled/Allowed` — Blur control
  - `m_FixedCameraViewportRects` — Pre-defined viewport layouts for 1–4 players
- **Methods** (1875 lines): Camera creation, binding, split-screen layout, shake effects, cutscene transitions, controlled update loop

### CameraView.cs (`CameraView`)
- Camera view configuration component

### CompositePlayerCameras.cs (`CompositePlayerCameras`)
- Handles split-screen / composite camera setup for multiple players
- Manages viewport rectangles for 1–4 player layouts

---

## 12. Map System

### MainMap.cs (`MainMap`)
- **Class**: `MainMap : MonoBehaviour`
- **Fields**:
  - `m_ActiveRawImage`, `m_BGRawImage` — Map textures
  - `m_UnderImages[]` — Underground layer images
  - `m_InitBGWidth/Height` = 50 — Background dimensions
  - `m_MaxMapZoom = 8f`, `m_MinMapZoom = 1f`, `m_MapZoom = 4f`
  - `m_StepScale = 120f`, `m_mapMovementSpeed = 20f`, `m_mapZoomSpeed = 2f`
  - `m_FloorMan`, `m_Floor` — Floor manager refs
  - `m_PinMan` — Pin manager
  - `m_IconPool` — Object pool for map icons
  - `m_ActiveFilterType` — Current pin filter
  - `m_MapViewScale`, `m_ScaleOfIcons`
  - `m_FilterHeader`, `m_Filter`, `m_KeyRoot` — Filter UI
  - `m_ToolTip`, `m_MouseToolTip` — Tooltip components
  - `FloorButtons[]` — Floor selection buttons
  - Layer objects: `m_PlayerLayerObject`, `m_CharacterLayerObject`, `m_ShopLayerObject`, `m_FavoursLayerObject`, `m_ObjectiveLayerObject`, `m_TagLayerObject`
  - `m_FloorIconPos16x16`, `m_FloorIconPos32x32` — Icon positions per screen size

### MainMapKeyFilter.cs (`MainMapKeyFilter`)
- Filter key/toggle for main map display layers

### MainMapMenu.cs (`MainMapMenu`)
- Menu overlay on the main map screen

### MiniMap.cs (`MiniMap`)
- **Class**: `MiniMap : MonoBehaviour`
- **Fields**:
  - `m_Target` — Follow target transform
  - `m_player` — Player reference
  - `mapTexture` — T17RawImage for texture display
  - `m_MapZoom = 4f`, `m_ScaleOfIcons`
  - `m_FloorMan`, `m_LastFloor` — Floor tracking
  - `m_PinMan`, `m_IconPool` — Pin/icon management
  - `m_FloorIconPos16x16/32x32`
  - Layer objects: player, character, shop, favours, objective, tag
  - `m_ImageAspectRatio`

### MapItemTracker.cs (`MapItemTracker`)
- Tracks items on the map (dynamic item markers)

### MapPinComponent.cs (`MapPinComponent`)
- **Class**: `MapPinComponent` — Map pin marker component

### MapTextureInfo.cs (`MapTextureInfo`)
- Texture data/info for map rendering

### MapToolTip.cs (`MapToolTip`)
- Tooltip displayed on map hover

### PinManager.cs (`PinManager`)
- **Class**: `PinManager : T17MonoBehaviour`
- **`Pin` inner class**:
  - **`PinFilterType` enum**: `All, Characters, Shops, Favours, Objectives, Tags, Count`
  - **`PlayerIcons`**: `m_MainMapIcon`, `m_MiniMapIcon`, icon pool refs
  - `m_Target` (GameObject), `m_TargetCharacter`
  - `m_Floor`, `m_IconSprite`, `m_MapPos`, `m_UpdatePosition`
  - `m_Edgable`, `m_FloorTrackable`, `m_Directional`, `m_Animated`
  - `m_SpriteAnimation`, `m_PinID`, `m_bOverrideIconScale`
  - `m_IconMapWorldPositionOffset`, `m_FilterType`
  - `m_PlayerIcons` (Dictionary<int, PlayerIcons>), `m_ToolTipTag`
  - `m_LocaliseToolTipTag`, `m_bForAll`, `m_bIsPlayer`, `m_PlayerIDToIgnore`
- **`IconPriority`**: `m_Type`, `m_SortingOrder`
- **Methods**: Create/remove pins, update positions, filter management

### UndergroundMaterialMapper.cs (`UndergroundMaterialMapper`)
- Maps underground materials for minimap rendering

---

## 13. Transitions & Spawns

### TransitionPoint.cs (`TransitionPoint`)
- **Class**: `TransitionPoint : MonoBehaviour`
- **Static**: `s_TransitionPointList` — All transition points
- **Fields**: `m_Partner` (GameObject), `m_AINodeLink` (NodeLink for pathfinding), `m_TransitionPosition`
- **Methods**:
  - `FindClosest(Vector3 pos)` — Static: find nearest transition
  - OnTriggerEnter — Teleports character to partner (cross-floor movement)
  - `m_bExitNode` — True if no partner (path endpoint)

### TransitionExitPoint.cs (`TransitionExitPoint`)
- Marks the exit destination of a transition

### SpawnPoint.cs (`SpawnPoint`)
- **Class**: `SpawnPoint : MonoBehaviour`
- **Fields**:
  - `m_StartingItems` — `List<ItemData>` for initial inventory
  - `m_AttachedDesk`, `m_AttachedBed`, `m_AttachedToilet`, `m_AttachedCalendar`
  - `m_SpawnPointID`, `m_CharacterToAddTo`, `m_RoomBlob`
- **Methods**:
  - `SetCharacterOwner(Character c)` — Wire up attached objects to character
  - `AddStartingItems()` — Give items to character via ItemManager

---

## 14. Generator System

### Generator.cs (`Generator`)
- **Class**: `Generator : T17MonoBehaviour, INetworkLoadable, Saveable`
- **Fields**: `m_NetView`, `m_Animator`, `m_Particles`, `m_Disabled`, `m_Switch` (GeneratorInteraction), `m_InactiveTime = 30f`
- **Methods**:
  - `GeneratorActive()` — Returns true if not disabled and timer ≤ 0
  - `DisableGenerator()` — Sets disabled flag, starts recharge timer, notifies `PrisonPowerManager`

### GeneratorInteraction.cs (`GeneratorInteraction`)
- **Class**: `GeneratorInteraction : AnimatedInteraction`
- **Fields**: Linked `Generator`
- On interaction: calls `m_Generator.DisableGenerator()`
- Methods: `SetGenerator()`, `SetState()` (animator parameter)

---

## 15. Culling System

### CullingBuckets.cs (`CullingBuckets`)
- Organises objects into spatial buckets for efficient frustum/occlusion culling

### CullingObjectCollector.cs (`CullingObjectCollector`)
- Collects cullable objects from the scene

### CullingForceFloor.cs (`CullingForceFloor`)
- Forces a specific floor to be visible (ignores culling)

---

## 16. Save/Load System

### SaveManager.cs (`SaveManager`)
- **Class**: `SaveManager : T17MonoBehaviour`
- **`PrisonsSaveInformation` nested class**:
  - **`PrisonData`**: per-prison save info
    - `m_strPrisonName`, `m_strPrisonFileName`
    - `PrisonType` enum: `eDefault`, `eCustomLevel`, `eUGCLevel`
    - `m_bNeedsSaving`, `m_iContinueSlot`
    - `m_strSerializedSlots[10]` — JSON serialised slot data
    - `m_strPrisonTitle`, `m_strPrisonDescription`
    - `m_NumPrisonRoles[2]`, `m_ePrisonDifficultyLevel`
    - `m_OutfitType`, `m_EditorVersion`, `m_bHasFinished`
    - `m_Slots[10]` — SlotData array
    - **`SlotData`**:
      - `SlotStatus` enum: `Empty, Used, Corrupt, OldVersion, INVALID`
      - `m_strFileName`, `m_Status`, `m_strDate`, `m_iDays`, `m_iDataVersion`
      - `m_GameRoomType`, `m_bSomethingChanged`, `m_iDateAsLong`, `m_RoomPassword`
    - Methods: `SerializeData()`, `DeSerializeData()`, `GetSlotFileName()`, `GetMostRecentSave()`, `GetPrisonDirectoryName()`
  - **Top-level**: `m_Prisons`, `m_strSerializedPrisons`
  - Methods: `SerializeData()`, `DeSerializeData()`, `CreatePrison()`, `DeletePrison()`, `LoadPrison()`, `GetPrisonIndex()`
- **`SaveManagerStatus` enum**: `WaitingForLogin, WaitingForPlatform, WaitingToGetDirectory, Ready`
- File naming: `Save{SanitizedName}S{slot}.sav`
- Directories: `ESC2P{name}` (default), `ESC2U{name}` (custom), `ESC2UGC{name}` (UGC)

### PrisonSnapshotIO.cs (`PrisonSnapshotIO`)
- **Class**: `PrisonSnapshotIO : T17MonoBehaviour`
- **`ManagerSaveSecondaryIds` enum** — All saveable managers:
  `RoutineManager=1, ItemManager, PrisonCustomisationManager, FloorManager, RoomManager, JobsManager, VendorManager, ScoreManager, PlayerDataManager, PrisonAlertnessManager, QuestManager, ObjectiveManager, NPCManager, VisitorManager, SolitaryManager, GuardTowerManager, JobCustomerRequester`
- **`SnapshotData_Base`** / **`SnapshotData_SaveGame_Base`** / **`SnapshotData_SaveGame_V2`**:
  - Versioned containers
  - Fields: days in prison, date saved, data version, game room type, password, leaderboard eligibility
  - Contains serialised data for each manager as byte arrays
- Serialisation/deserialisation to/from byte streams

### SaveData.cs (`SaveData`)
- Save data container

### SaveDataRegister.cs (`SaveDataRegister`)
- Registers a component for automatic save/load participation

### GlobalSave.cs (`GlobalSave`)
- **Class**: `GlobalSave : MonoBehaviour`
- **Private serialisable entry types**: `Entry (JSON)`, `EntInt`, `EntFloat`, `EntString`, `EntBool`, `EntInt64Array`, `EntIntArray`
- **`GlobalData`**: Serialisable collection of key-value pairs
- Stores game-wide persistent data (settings, progress, etc.)

### GlobalLoader.cs (`GlobalLoader`)
- Loads global save data on startup

---

## 17. Other Supporting Systems

### RoomInfo.cs / RoomOptions.cs
- Photon networking room info (not prison rooms)
- `Room : RoomInfo` — Network room with Name, IsOpen, IsVisible, MaxPlayers, etc.

### ActorProperties, GamePropertyKey, GameRoomType
- Network room property definitions and game room type enum

---

## 18. Architecture Summary

### Data Flow: Level Creation
```
LevelDetailsManager (Request)
  → Load building scene
  → Collect BuildingInstruction data (from .sav file or network)
  → Process instructions (InstructionList → per-layer lists)
  → Generate building blocks (tiles, walls, objects, zones)
  → Set up level (rooms, spawns, AI, routines)
  → Success callback
```

### Data Flow: Level Save
```
LevelDetailsManager (Request)
  → Find all saveable managers
  → Collect per-manager data
  → Serialise to PrisonSnapshotIO byte stream
  → Write to .sav file via SaveManager
```

### State Management Pattern
Most systems follow a singleton pattern:
```
public class XManager : MonoBehaviour
{
    private static XManager m_Instance;
    public static XManager GetInstance() { return m_Instance; }
    // ...
}
```
Key managers: `FloorManager`, `RoomManager`, `BuildingBlockManager`, `CameraManager`, `LightingManager`, `PinManager`, `SaveManager`, `PrisonAlertnessManager`, `PrisonPowerManager`, `WeatherEffectManager`, `FacadesManager`, `LevelEditor_X`, `LevelDataManager`, `PrisonCustomisationManager`, `PrisonAlterationSaveFixer`

### Room ↔ Building Block ↔ Zone Relationship
1. **Building blocks** are placed on layers (tiles, walls, objects)
2. **Zones** are defined areas with specific block group requirements (e.g., "a cell needs 1 bed + 1 toilet + 1 desk")
3. **Rooms (RoomBlob)** are created from zones at runtime — each zone maps to a RoomBlob with a specific `eLocation` type
4. **RoomBlobData subtypes** provide specialised behaviour for each room type (cell, kitchen, infirmary, etc.)

### Floor Layer Layout
```
Layer 0: Underground (sewers, tunnels)
Layer 1: Ground Floor (main prison)
Layer 2: Ground Floor Vent (ventilation)
Layer 3: First Floor (upper prison)
Layer 4: First Floor Vent (ventilation)
Layer 5: Roof
```

Each layer has its own:
- Tile system (ground, walls, plops, objects, lights)
- Room floor map (121×121 grid mapping tiles to room IDs)
- Pathfinding nav graph
- Voxel mesh
- Zone map (editor)
---
