# Character & AI System

## Overview

The Character & AI system in The Escapists 2 handles all NPC behavior, player characters, pathfinding, event memory, routines, combat, speech, opinions, and prison alertness. The codebase is decompiled from `Assembly-CSharp.dll` (ILSpy) and targets Unity with Photon networking.

---

## Classes

### Inheritance Hierarchy

```
T17NetworkBehaviour
 └─ Character (6365 lines) — Core character class
     └─ Player — Player-controlled characters
     └─ AIPlayer — AI-controlled characters that use Character as base

T17MonoBehaviour
 └─ AICharacter — Base class for all AI characters
     ├─ AICharacter_Generic — Generic NPCs
     │   ├─ AICharacter_Snooty — Snooty NPC with quest trigger on gift
     │   └─ AICharacter_SpecificQuestGiver — Quest-giving NPC with time-served display
     ├─ AICharacter_Guard — Guard-specific AI
     ├─ AICharacter_Inmate — Inmate-specific AI
     ├─ AICharacter_Dog — Dog AI with contraband detection
     ├─ AICharacter_Medic — Medic AI (handles KO/bound events)
     ├─ AICharacter_MaintenanceMan — Repairs tiles, toilets
     ├─ AICharacter_JobCustomer — Job system customer NPC
     ├─ AICharacter_JobOfficer — Job system officer NPC
     ├─ AICharacter_Ghost — Ghost NPC (fades in/out, uses ghost tags)
     └─ AICharacter_CrowdNPC — Showtime crowd NPC (seated waving)
```

---

### Character — Core Class (`Character.cs`)

The central class for all characters (players and NPCs). Inherits from `T17NetworkBehaviour`.

**Key Fields:**

| Field | Type | Description |
|---|---|---|
| `m_CharacterStats` | `CharacterStats` | Health, energy, strength, intellect, cardio, heat, money |
| `m_CharacterMovement` | `CharacterMovement` | Movement speeds and state |
| `m_CharacterAnimator` | `CharacterAnimator` | Animation state machine |
| `m_CharacterCustomisation` | `CharacterCustomisation` | Visual appearance (body, skin, hair, hat, outfit, name) |
| `m_CharacterEventManager` | `CharacterEventManager` | AI events attached to this character |
| `m_CharacterRole` | `CharacterRole` | Role enum (Inmate, Guard, Medic, Dog, etc.) |
| `m_CharacterOpinions` | `CharacterOpinions` | Opinion scores toward other characters |
| `m_CharacterUtil` | `CharacterUtil` | Line-of-sight and vision cone utilities |
| `m_ItemContainer` | `ItemContainer` | Inventory |
| `m_InteractingObject` | `InteractiveObject` | Current interaction target |
| `m_NetView` | `T17NetView` | Photon network view |
| `m_Transform` | `Transform` | Cached transform |
| `m_bIsKnockedOut` | `bool` | KO state |
| `m_bIsBound` | `bool` | Bound/restrained state |
| `m_bIsDisguised` | `bool` | Disguise state |
| `m_bIsPlayer` | `bool` | Is this a player character? |
| `m_fGetToRoutineTimer` | `float` | Timer for routine location arrival |
| `m_CachedCurrentPosition` | `Vector3` | Cached position (updated every frame) |
| `m_CharacterID` | `float` | Unique character identifier |

**Combat System:**
- `StartAttack()`, `StopAttack()` — Begin/end attack animation
- `DoDamage()` — Apply damage to target
- `BlockDamage()` — Block incoming damage
- `DamageCharacterEvent()` — Networked damage application
- `DamageSelf()` — Self-damage (used by guard towers)
- Three attack types: Normal, Heavy, Smash
- Energy-based attack costs, block costs
- Knockback on hit/block
- Charge attack system with `m_fSmashAttackFullChargeTime`

**Networking/Serialization:**
- `NetworkSerializeWrite()` / `NetworkSerializeRead()` — Bitstream serialization
- `SerializePosition()` / `DeserializePosition()` — Network position sync with float compression
- `SerializeAnimation()` / `DeserializeAnimation()` — Animation state sync
- Save/load via JSON snapshots (`SaveData_Character_V1`)
- `CompressFloat()` / `UnCompressFloat()` — 16-bit float compression for networking
- Interest-group based serialization (Players/High/Medium/Low priority)

**Interaction System:**
- `SetInteractingObjectRPC()` — Networked interaction assignment
- `RequestStopInteraction()` — End current interaction
- `SetBusyRPC()` — Set character busy state
- Face-to-face interactions with direction checking

**Door Access:**
- `AddAllowedDoor()`, `RemoveAllowedDoor()`, `ClearAllowedDoors()`
- `IsAllowedThroughDoor()` — Check if character can pass
- Key color system matching door key types

**Pin/Map System:**
- `SetPinImage()`, `ResetPinImage()`, `ShowNPCPin()`, `HideNPCPin()`
- Multi-filter pin icons on the map

**Events:**
- `OnInteractEvent` — Fired when interaction starts
- `OnEquipedItemChanged` — Equipped item changes
- `OnOutfitChanged` — Outfit changes
- `OnRoomChanged` — Room transition
- `OnCharacterKnockedOut` — KO notification

---

### AICharacter — Base AI (`AICharacter.cs`)

Base class for all AI characters. Manages event memory, alertness, reporting, and behavior tree integration.

**Key Fields:**

| Field | Type | Description |
|---|---|---|
| `m_Character` | `Character` | Reference to the Character component |
| `m_AIMovement` | `AIMovement` | Pathfinding and movement |
| `m_AIBlackboard` | `Blackboard` | NodeCanvas blackboard for BT |
| `m_AIPatrols` | `AIPatrols` | Patrol path definitions per routine |
| `m_ItemContainer` | `ItemContainer` | AI inventory |
| `m_CharacterUtil` | `CharacterUtil` | Vision utilities |
| `m_ActiveAlertness` | `PrisonAlertness` | Current alertness level |
| `m_bIsInCombat` | `bool` | Combat state |
| `m_bIsTemporaryBlind` | `bool` | Temporary blindness (e.g., flashbang) |

**Key Methods:**

| Method | Description |
|---|---|
| `AddEvent()` | Add an AIEvent to character's memory |
| `ForgetEvent()` | Remove an event from memory |
| `GetEventMemories()` | Get memories filtered by event type |
| `ReportToGuard()` | Report an event to the nearest guard |
| `ReportToGuardEvent()` | Create report event for a guard |
| `SetRunning()` | Control running state |
| `IsInCombatState()` | Check combat status |
| `OnKnockedOut()` | Handle KO state changes |
| `OnEscapeBindings()` | Handle escaping from bindings |
| `AddEventsAsGuard()` | Guard-specific event handling |
| `FirstContactGuard()` | Handle first contact with inmate during routine |

**Virtual Methods:**
- `OnAddingEventToMemory()` — Hook when event added (overridden by subclasses)
- `OnMemoryForgotten()` — Hook when event forgotten (overridden by subclasses)

---

### AICharacter_Guard (`AICharacter_Guard.cs`)

Guard-specific AI with roll call, shakedowns, banter, and reporting mechanics.

**Key Fields:**
- `m_GuardShakedownItem` — Item check during shakedowns
- `m_bFirstCallDone` — First roll call tracking
- `m_CharacterWeHaveNotForgotten` — Character memory for event reporting
- `m_BanterSentences` — List of banter speech lines
- `m_BanterCooldown` — Time between banter triggers
- `m_bIsPerformingRollCall` — Roll call animation state

**Key Methods:**
- `ShakedownCharacter()` — Search inmate for contraband during shakedown
- `PerformRollCall()` — Execute morning/mid-day/evening roll call
- `AssignReportableEvent()` — Assign events for investigation to other guards
- `CallGuardsToReport()` — Call nearby guards to report
- `FirstContactGuard()` — Handle inmate interactions during routines
- `PlayGuardSpeech()` — Guard-specific speech with banter
- `OnLocateMissingCharacter()` — Handle found missing inmate during roll call

**Integration:** NPCManager tracks all guards. Guards support routine-based behaviour (RollCall, JobTime, FreeTime, Lockdown). They detect contraband, escort prisoners, and man guard towers.

---

### AICharacter_Inmate (`AICharacter_Inmate.cs`)

Inmate-specific AI with random attacks, snitch behavior, and routine compliance.

**Key Fields:**
- `m_SnitchInmateReaction` — Reaction string to snitches
- `m_SnitchInmateReactionTone` — Speech tone for snitch reaction
- `m_SnitchInmateCompleteReaction` — String reaction to being a complete snitch

**Key Methods:**
- `OnAttackFromFellowInmate()` — Handle attacks from other inmates (fight or flee based on opinion)
- `OnInmateAttackPlayer()` — Handle inmate attacking player
- `OnSnitchSpotted()` — React to snitch detection
- `OnEscapeAttempt()` — Join or report escape attempts

---

### AICharacter_Dog (`AICharacter_Dog.cs`)

Dog AI with contraband detection, owner following, and kennel routines.

**Key Fields:**
- `m_DogBowl` — Reference to assigned dog bowl
- `m_Owner` — Guard who owns this dog
- `m_bIsFollowingOwner` — Following state
- `m_bHasDetectedContraband` — Contraband alert state

**Key Methods:**
- `SniffCharacter()` — Detect contraband on nearby characters
- `LeadGuardToContraband()` — Guide guard to detected contraband location
- `GoToKennel()` — Return to kennel during LightsOut
- `GetFirstItemOfType()` — Dog-specific item detection

---

### AICharacter_Medic (`AICharacter_Medic.cs`)

Handles medical emergencies, transports KO'd/bound characters.

**Key Methods:**
- `GetInfirmaryBed()` — Find nearest available infirmary bed
- `GetSolitaryBed()` — Get solitary cell bed for bound inmates
- `StartSolitaryForCharacter()` — Initiate solitary confinement
- `IsCharacterBound()` — Check if target is bound
- `PauseMedicOnFirstKOEvent()` — Pause movement on first KO event (3 second wait)

---

### AICharacter_MaintenanceMan (`AICharacter_MaintenanceMan.cs`)

Repairs damaged tiles, dug holes, missing tiles, and flooded toilets.

**Key Methods:**
- `RepairEvent()` — Execute repair based on event type
- `RepairToilet()` — Equip plunger and fix flooded toilet
- `TeleportToCorrectFloor()` — Move to correct floor level for repair
- `SkipLastNodeWhenFixing()` — Determine path end behavior per event type
- `GetRepairTime()` — Get remaining repair time

---

### AICharacter_JobCustomer (`AICharacter_JobCustomer.cs`)

Customer NPC for the job system. Supports service-type jobs.

**Fields:**
- `PatronTypes` — A/B/C/D patron grouping
- `m_CustomerJob` — Current job assignment
- `m_bIsBeingUsed` — Currently in use by job system
- `m_bIsReadyToBeServed` — Ready for service interaction
- Proximity speech for requesting service

**Methods:**
- `SetupForJob()` — Assign job and behaviour tree
- `SetIsBeingUsed()` — Toggle usage state
- `ReadyToBeServed()` — Mark ready for service
- `SetProximitySpeech()` — Configure proximity-based speech
- `SetWaitingPoint()` — Set exit/wait position

---

### AICharacter_JobOfficer (`AICharacter_JobOfficer.cs`)

Job officer NPC that assigns jobs and gives rewards.

**Methods:**
- `GiveReward()` — Give money reward for completing job
- `CanSpeekToCharacter()` — Check if can speak (on time, not already spoken, no job)
- `GetSpeechLines()` — Get random speech from config
- `CharacterHaveJob()` — Static check if character has a valid job
- `AssetBundleBehaviourOverride()` — Override behaviour tree from asset bundle

---

### AICharacter_Ghost (`AICharacter_Ghost.cs`)

Ghost NPC that fades in/out with alpha lerp. Scares players when seen.

**Key Fields:**
- `m_MeshRenderer` — Skinned mesh for alpha control
- `m_RandomInterval` — Random interval range for fade transitions
- `m_LerpSpeed` — Speed of alpha transitions
- `m_GhostNodeTag` — Ghost-specific navmesh node tag

**Behavior:**
- Fades between opaque and transparent states randomly
- `QueryCurrentNode()` — If player is in same room when ghost is opaque, increments scare stat
- Uses ghost key access for door/node traversal

---

### AICharacter_CrowdNPC (`AICharacter_CrowdNPC.cs`)

Showtime crowd NPC with seating, waving, and delayed participation.

**Key Fields:**
- `m_bSeated` — Seated state
- `m_bWaving` — Waving animation state
- `m_fShowTimeDelay` — Delay before joining showtime
- `m_fShowTimeDelayVariance` — Random variance on delay

**Methods:**
- `DoWave()` — Toggle mexican wave animation
- `SetIsSeated()` — Enter/exit seated state
- `GetCrowdSeatingPosition()` — Calculate seating position from waypoint
- `ControllAnimatorFromNPCManager()` / `ControllAnimatorFromCulling()` — Animator enable/disable management

---

### AIPlayer (`AIPlayer.cs`)

Extends Character for AI-driven characters. Integrates AICharacter with Character base.

**Key Methods:**
- `TogglePhysicsControl()` — Toggle between kinematic and physics-based movement
- `SetJobRoom()` — Assign job room and behavior tree
- `AddAllowedDoor()` / `RemoveAllowedDoor()` — Door access with AI movement sync

---

### CharacterStats (`CharacterStats.cs`)

Health, energy, strength (0-100), intellect (0-100), cardio (0-100), heat (0-100), money, sentence.

**Key Fields:**
- `m_fHealth`, `m_fEnergy`, `m_fStrength`, `m_fIntellect`, `m_fCardio`
- `m_fHeat` — Suspicion heat level
- `m_fMoney` — Current money
- `m_SentenceBaseLine` — Total sentence in days
- `m_bIsPlayer` — Player flag
- Stat decay rates (per second) from CharacterConfig

**Methods:**
- `IncreaseHealth()`, `DecreaseHealth()`, `IncreaseEnergy()`, `DecreaseEnergy()`
- `IncreaseHeat()`, `DecreaseHeat()` — Heat management
- `IncreaseMoney()`, `DecreaseMoney()` — Money management
- `SetCharacterState()` — Apply stat modifiers (eating, exercise, etc.)
- Serialize/Deserialize for network sync

---

### CharacterMovement (`CharacterMovement.cs`)

Movement controller with walk, run, dash, block speeds.

**Key Fields:**
- `m_fWalkSpeed`, `m_fRunSpeed`, `m_fDashSpeed`, `m_fBlockSpeed`
- `m_eCurrentSpeed` — Current speed state enum

**Methods:**
- `SetSpeed()`, `GetSpeed()` — Speed state management
- `Immobile()` — Full stop movement
- `PauseMovement()` — Temporary immobilization

---

### CharacterAnimator (`CharacterAnimator.cs`)

Large animation state machine (~55K chars). Handles:
- Animation state transitions (Idle, Walk, Run, Attack, Block, Knockout, etc.)
- Material management for character rendering
- Weapon visibility control
- Tray carrying animation
- Facing direction management (Directionx4/Directionx8)
- Combat animation states
- Network state synchronization
- Charging attack animation
- Animator hijacking for cutscenes

---

### CharacterCustomisation (`CharacterCustomisation.cs`)

Visual appearance configuration:
- Body type, skin color, hair, hat/helmet, outfit
- Display name (localized)
- Network synchronization of appearance data

---

### CharacterRole (`CharacterRole.cs`)

Enum of 20 roles:

```
Inmate, Guard, Medic, Dog, Maintenance, JobGuy, Visitor, 
Warden, Generic, Cameraman, CameraFirstSupportCrew, 
CameraSecondSupportCrew, Dolphin, Ghost, SpecificQuestGiver, 
Crowd, Invisible, COUNT
```

---

### CharacterOpinions (`CharacterOpinions.cs`)

Opinion system per character pair (0-100 scale, default 50).

**Key Methods:**
- `GetOpinionOf()`, `SetOpinionOf()`, `IncreaseOpinionOf()`, `DecreaseOpinionOf()`
- `GetAllLikedCharacters()`, `GetAllHatedCharacters()` — Filtered lists
- `Serialize()` / `Deserialize()` — Bit-packing 12-bit viewID + 8-bit opinion into ulong
- Dog love tracking (stat increment on high opinion)

---

### CharacterEventManager (`CharacterEventManager.cs`)

Extends `EventManager`. Manages AI events attached to a specific character. Reports events like KO, bound, contraband, digging, etc.

---

### CharacterSerializer (`CharacterSerializer.cs`)

Singleton managing network serialization of all characters.

**Serialization Tiers:**
- Players — Every frame (zero delay)
- High — Every 2 frames (players' targets, carriers)
- Medium — 0.1s delay (nearby characters)
- Low — 1s delay (distant characters)

Key features:
- Interest-group based sending
- Latency-adaptive serialization rate
- MTU-aware packet packing
- MasterClient sorts lists, clients send only players
- Uses RaiseEvent with encryption

---

### CharacterNetEvents (`CharacterNetEvents.cs`)

Combat-related network events using RaiseEvent:

| Event | Code | Description |
|---|---|---|
| SendDamage | 0 | Apply damage from attacker to target |
| SetAttacking | 1 | Mark character as attacking |
| DamageSelf | 2 | Self-damage event |
| SetLooting | 3 | Mark character as looting |

---

### CharacterUpdateController (`CharacterUpdateController.cs`)

IUpdateController implementation. Manages update loops for:
- Character (ControlledUpdate, FixedUpdate, LateUpdate, PreUpdate, PreFixedUpdate)
- AICharacter
- AIMovement
- CharacterAnimator
- CharacterStats
- CharacterSpeechBubbleHandler
- CharacterIconHandler

---

### CharacterSpeed (`CharacterSpeed.cs`)

Enum: `Stand`, `Walk`, `Run`, `COUNT`

---

### CharacterInventoryInteraction (`CharacterInventoryInteraction.cs`)

InteractiveObject for character inventories. Opens different menu types based on container type and KO state:
- Guard → Guard menu / DownedGuard
- Inmate → Inmate menu / ShopInmate / DownedInmate

---

### CharacterSpeechBubbleHandler (`CharacterSpeechBubbleHandler.cs`)

Manages speech bubble display with priority-ordered queue. Features:
- `SpeechData` inner class with tone-based SFX (Positive/Negative/Computer)
- Priority-based insertion into speech buffer
- Duration-based auto-dismiss
- Background/tail sprite customization
- Text colour control per tone

---

### CharacterIconHandler (`CharacterIconHandler.cs`)

Manages icon display above characters. Icon types:
InMenus, RobinsonQuest, Quest, Vendor, ClimbUp, ClimbDown,
GuardReport, GuardInvestigate, GuardAlert, MultiplayerSingle/ Double/ Triple/ Quad, DogMissingKey

- Timer-based icon expiration
- Priority ordering (lower enum value = higher priority)
- RPC-driven display

---

### CharacterUtil (`CharacterUtil.cs`)

Vision system utilities:
- `LineOfSight()` — Raycast-based line-of-sight with door/open check
- `InFieldofViewCheck()` — Field-of-view cone check
- `GetVisionConeVertexPairs()` — Generate vision cone mesh vertices
- Dogs have full 360° FOV
- Layer mask: Wall, AI_Event, BlockVision, Door

---

### CharacterInformation (`CharacterInformation.cs`)

UI menu for displaying character info (stats, equipment, outfit, avatar render). Shows:
- Strength, Cardio, Intellect, Health, Energy, Heat stats
- Money display
- Time served calculation
- Job title based on role
- Equipment/outfit slots with interaction

---

### CharacterBarrier (`CharacterBarrier.cs`)

Zone boundary barrier:
- Tags navmesh nodes with key colour
- Blocks characters during Lockdown
- Reports tardiness during LightsOut
- Triggers speech and pauses movement on collision
- Watchman NPC with cooldown-based speech

---

## AI Event System

### AIEvent (`AIEvent.cs`)

Represents a notable event in the world. 40+ event types in `AIEvent.EventType`:

| Category | Events |
|---|---|
| Character State | KnockedOut, Bound, Attacking, Escaping, Missing, Tardy, NaughtyLocation, StandingOnDesk, Naked |
| Contraband | HasContraband, SearchingDesk, Disguised |
| Actions | Digging, Chipping, Cutting, Looting, CarryingObject |
| Tile | DamagedTile, MissingTile, DugHole, Flooded |
| Items | ContrabandOnFloor, ContrabandInContainer, ItemMissing |
| Combat | Character_Attacking, Character_Attacked, Character_Unconscious |
| Reports | GuardReportedInmate_

**Key Fields:**
- `m_EventData` — Event type, heat values, sight distances, reoccuring heat
- `m_CharacterResponsible` — Character that caused the event
- `m_TargetCharacter` — Target character (if applicable)
- `m_vEventLocation` — World position
- `m_Manager` — EventManager this belongs to
- `m_fTimeSinceSeen` — Time since this event was last observed
- `m_fEventOracleTime` — Total event lifetime
- Responder lists (guards, inmates, support characters)

### AIEventData (`AIEventData.cs`)

ScriptableObject defining event properties:
- `m_eEventType` — Event type enum
- `m_fSightDistance` — Max distance for detection
- `m_fGuardHeatIncrease` — Heat added to character
- `m_fPrisonAlertnessIncrease` — Alertness points
- `m_fReoccuringHeatTime` — Interval for recurring heat
- `m_fEventLifeTime` — How long event persists
- `m_bCanBeDisguised` — Can outfit disguise hide this?
- `m_Responder` — Who responds (Inmates, Guards, Dogs, Support)

### AIEventManager (`AIEventManager.cs`)

Singleton managing all events in the prison. Uses a 3D bucket grid (row/column/floor) for spatial event lookup. Maintains separate handles for:
- CharacterEventManager — per-character events
- LocationEventManager — location-based events (tile damage, contraband on floor)
- InmateEventManager — inmate-specific events
- GenericEventManager — generic events with height (Wall/Ground)

**Methods:**
- `GetBucketPosition()` — Convert world position to grid coordinates
- `GetEventManagers()` — Get event managers within grid range
- Registration for various event manager types

### AIEventMemory (`AIEventMemory.cs`)

Per-character memory of a single AIEvent. Tracks:
- `m_AIEvent` — The event
- `m_TargetCharacter` — Character reference
- `m_fTimeSinceSeen` — Time since last observed
- `m_bEventValid` — Validity flag
- `m_SlotPosition` — Slot for offset calculation during chase
- Forget timers and heat reoccurrence tracking

### AIConfig (`AIConfig.cs`)

ScriptableObject with configurable parameters:
- Attack cooldowns and timers
- Guard heat values per event type
- Roll call setup time
- Dog settings (kennel, love opinion threshold)
- Contraband detection parameters
- Disguiseable events list
- Medic wait-for-pickup time
- Event forget times

---

## Routine System

### Routines (`Routines.cs`)

Enum: `UNASSIGNED=-1, RollCall, MealTime, JobTime, FreeTime, Exercise, ShowerTime, LightsOut, Lockdown, ShowTime, COUNT`

### RoutineSubTypes (`RoutineSubTypes.cs`)

Refined routine types:
- MorningRollCall (5), MidDayRollCall (6), EveningRollCall (7)
- BreakfastTime (15), LunchTime (16), DinnerTime (17)
- JobTime (25)
- MorningFreeTime (35), AfternoonFreeTime (36), EveningFreeTime (37)
- ExcerciseTime (45), ShowerTime (55), LightsOut (65), Lockdown (75), ShowTime (85)

### RoutineManager (`RoutineManager.cs`)

Singleton driving the daily prison schedule. Manages:
- Calendar events (Garbage/Helicopter/Boat days, ShowTime, Visitor days)
- Routine progression with timer
- Purple door lock/unlock status
- First routine after start detection
- Save/load via JSON

**Events:**
- `OnRoutineChanged` — Fired on routine transition
- `OnRoutineEnded` — Fired when a routine ends
- `OnPurpleDoorLockStatusChanged` — Purple lock state changes

### RoutinesData (`RoutinesData.cs`)

ScriptableObject containing `Routine` class with:
- `m_BaseRoutineType` (Routines enum)
- `m_SubRoutineType` (RoutineSubTypes enum)
- `m_fStartTime`, `m_fEndTime` — Time range
- `m_Track` — Music track
- `m_HeatIncrease` — Passive heat during this routine
- `m_AlertnessIncrease` — Alertness change
- `m_ShowTimeTutorialTextID` — Showtime-specific text
- `m_PostLockdownAlertness` — Alertness level after lockdown ends

---

## Speech System

### SpeechManager (`SpeechManager.cs`)

Singleton managing all character speech. Features:
- Queue-based system with `SpeechQueueEntry`
- Token replacement ($guard, $inmate → random character names)
- RPC-based speech distribution over network
- Dog-specific speech suffix (".Doggie")
- Opinion-based speech selection ("Rep" + opinion value suffix)
- Duration defaults to 3 seconds

### SpeechPODO (`SpeechPODO.cs`)

Plain-old-data object for speech configuration:
- `m_TextId` — Localization key
- `m_SpeechTone` — Tone enum
- `m_Duration` — Display duration (-1 = default 3s)
- `m_Priority` — Priority override
- `m_ForcedVariation` — Specific localization variation

### SpeechTone (`SpeechTone.cs`)

Enum: `Positive`, `Negative`, `No_Sound`, `Computer_Positive`, `Computer_Negative`

### SpeechBubbleHUD (`SpeechBubbleHUD.cs`)

UI component for speech bubble rendering. Handles:
- Text colour by tone (Normal/Negative)
- Facade offset correction for screen edge clipping
- Split-screen offset adjustment

---

## Opinion System

### OpinionConfig (`OpinionConfig.cs`)

ScriptableObject defining:
- Like/hate thresholds
- Starting opinions per role
- Item gift value modifier
- Low opinion sight checks (inmate attack timer, guard follow timer)
- Attack opinion loss values

### OpinionManager (`OpinionManager.cs`)

Singleton managing all character opinions. Uses `NetPrisonViewDetails` for serialization.

**Opinion Ranges:** Highest (80-100), High (60-80), Medium (40-60), Low (20-40), Lowest (0-20)

**Methods:**
- `AssignRandomOpinionToAll()` — Assign random opinions to all NPCs when player spawns
- `OnPlayerSpawned()` — MasterClient generates initial opinions
- `GetAttackOpinionLoss()` — Opinion penalty based on character role
- Serialize/Deserialize via JSON

---

## Combat System

### CombatConfig (`CombatConfig.cs`)

ScriptableObject with damage/energy tables indexed by StrengthModifier/EnergyModifier:
- `NormalAttackDamage[5]`, `HeavyAttackDamage[5]`
- `NormalAttackEnergyCost[5]`, `HeavyAttackEnergyCost[5]`
- `NormalAttackBlockCost[5]`, `HeavyAttackBlockCost[5]`
- Damage summaries: Unassigned, Low, Medium, High, Highest

### GlobalCombatConfig (`GlobalCombatConfig.cs`)

ScriptableObject with global combat parameters:
- `m_UnarmedCombatConfig` — Base combat item config
- `m_fCombatNearHitDistance` — 0.9 (dogs: 3.0)
- Smash attack timings (charge 1s, dash 1.8s, attack 0.3s, commit 1s)
- Knockback stun time (0.2s), knockback power on damage (4f) and block (2f)

### CombatState (`CombatState.cs`)

Enum likely defining combat states (Unarmed, Armed, etc.)

---

## Prison Alertness System

### PrisonAlertness (`PrisonAlertness.cs`)

Enum: `ZeroStars` through `FiveStars` (half-star increments), plus `Lockdown`

### PrisonAlertnessManager (`PrisonAlertnessManager.cs`)

Singleton managing prison-wide alertness level (0-10 scale, 10 = 5 stars = lockdown).

**Alertness Reasons (32 total):**
MissedRoutine, CharacterBound, NaughtyLocation, StandingOnDesk, Naked,
HasContraband, Digging, Chipping, Cutting, Looting, CarryingObject,
AttackingInmate, AttackingGuard, ContrabandOnFloor, ContrabandInContainer,
DamagedTile, MissingTile, DugHole, Flooded, SearchingDesk, Escaping,
Tardy, Disguised, ItemMissing, OutDuringLightsOut, FromMasterClient

**Key Methods:**
- `IncrementAlertnessBy()` — Increase with reason, character, optional punishment
- `DecrementAlertnessBy()` — Decrease (blocked during lockdown)
- Morning roll call reduces alertness by 1
- Lockdown ends → post-lockdown alertness level restored
- Chat feed messages for alertness changes
- Triggers solitary confinement at 5 stars (alertness ≥ 10)
- Contraband-aware alertness increase methods

### GuardAlertnessCustomisation (`GuardAlertnessCustomisation.cs`)

Scales guard stats (health, cardio, strength, energy) based on current alertness level. Each alertness tier has its own stat profile.

---

## AI Movement & Pathfinding

### AIMovement (`AIMovement.cs`)

Pathfinding wrapper using A* Pathfinding Project (Seeker). Key features:
- `TravelToPosition()` — Main pathfinding method
- `SetChaseTarget()` — Chase behavior with position prediction
- Door key access management (color-coded navmesh node tags)
- Vent/Underground layer handling
- `CancelCurrentPath()` — Path interruption
- Ghost key access for ghost NPCs

### AIPath (`AIPath.cs`)

Standard A* Pathfinding AI (3D). Uses Seeker for path requests, supports:
- Repath rate (0.5s default)
- Slowdown distance, pick-next-waypoint distance
- End-reached distance (0.2)
- RVOController integration
- Rigidbody/CharacterController movement
- Rotation towards movement direction

### AILerp (`AILerp.cs`)

Alternative path follower using lerp-based movement:
- Interpolated path switches
- 2D/3D rotation support
- Distance-along-segment tracking

### AIPatrols (`AIPatrols.cs`)

Maps Routines → List of PatrolPath objects per character. Used by Patrol action for routine-aware patrolling.

### PatrolPath (`PatrolPath.cs`)

Waypoint-based patrol route with nodes containing:
- Position, facing direction, wait timer, wait variance
- Run-to-node flag
- Per-node character speech
- Bidirectional patrol support

### Patrol (`Patrol.cs`)

NodeCanvas ActionTask. Routes characters along PatrolPath nodes based on current routine. Features:
- Routine-aware path selection
- Bidirectional path traversal
- Waypoint wait timers with variance
- Facing direction at waypoints
- Per-node speech triggers

### Chase (`Chase.cs`)

NodeCanvas ActionTask. Character pursuit with:
- Position prediction for intercept course
- Offset positioning for multi-chaser coordination (slot-based)
- Give-up time based on event oracle time
- Hidden character grace period (0.5s)
- Teleport chase option
- Medic-specific chase behavior
- Spin behavior when target is hidden

### Flee (`Flee.cs`)

NodeCanvas ActionTask. Character panic escape:
- Finds random world position to flee to
- Stops when attacker is out of line-of-sight
- Inmates only (other roles end immediately)
- Speech on flee start

### Wander (`Wander.cs`)

NodeCanvas ActionTask. Randomized wandering:
- Generates patrol points within current room
- Configurable max nodes per room (default 6)
- Spin-around behavior while waiting
- Waypoint precision control
- Room label filtering

### GoTo (`GoTo.cs`)

NodeCanvas ActionTask. Navigate to target:
- Supports GameObject, InteractiveObject, AIEventMemory, Vector3 targets
- Interaction point offset for animated interactions
- Vent layer exclusion option
- Override facing direction on arrival
- Teleport option

### LookAround (`LookAround.cs`)

NodeCanvas ActionTask. Spin through 4 cardinal directions:

---

## Security Systems

### VisionTrigger (`VisionTrigger.cs`)

Per-character vision controller. Updates at different rates (Inmates: slow, others: fast).
- Scans 3x3 grid of event manager buckets around character
- Checks line-of-sight to each visible event
- Filters events: Inmates ignore attacking/searching desk; Dogs see contraband
- Blocked by KO, disabled, medical sleep, temporary blind

### CCTVCamera (`CCTVCamera.cs`)

Full CCTV camera system with sweeping, tracking, and reporting:
- Sweeps between configurable angles with mid-way and endpoint rest
- Tracks detected characters automatically
- Reports misbehavior events (configurable list of reportable types)
- Recurring heat events for continuous violations
- Lights-out detection (catches undisguised missing inmates)
- Disguise-aware filtering (configurable disguiseable events)
- Bindable state (for player disabling)
- Power-aware activation
- Save/load via JSON serialization
- Sounds for movement, scan, activate/deactivate

### GuardTower (`GuardTower.cs`)

Sniper tower system:
- Tracks characters in line-of-sight
- Shoots tracked characters on cooldown
- Multiple gun positions per tower
- Spotlight integration
- Snapshot-based networking for position/state sync
- Cutscene-aware pause/resume

### GuardTowerSpotlight (`GuardTowerSpotlight.cs`)

Spotlight attached to guard towers. Follows characters in line-of-sight. Patrol path for rest state.

### GuardTowerManager

Singleton managing all guard towers.

### ContrabandDetector (`ContrabandDetector.cs`)

Metal detector / contraband scanner:
- Animations: idle(0), alerted(1), no-power(2)
- Light color changes (green idle, red alarm)
- Detects inmates carrying contraband via CharacterEventManager
- Detects contraband-hiding pouches (degrades on detection)
- Calls guards on detection
- Heat increase on detection
- Power-aware (disabled without power)
- Ignores KO'd characters being carried by medics

### GuardBoard (`GuardBoard.cs`)

Guard assignment UI board. Opens menu and handles event system focus.

---

## Door System

### Door (`Door.cs`)

Interactive door with:
- Key color system (None, Silver, Black, Cyan, Red, Green, Yellow, Purple)
- Key sub-code support
- Outfit-based access (guard uniform, etc.)
- One-way door direction when locked (LeftToRight, RightToLeft, TopToBottom, BottomToTop)
- Animator-driven open/close with fast-open for running characters
- Navmesh node tagging per key color
- One-way AI connections via manual navmesh links
- Force-open for cutscenes

### DoorManager (`DoorManager.cs`)

Singleton managing all doors:
- `SetUpCharacterKeys()` — Configures all door access for a character based on inventory items, equipped items, hidden items, and outfit
- Purple lock management (RoutineManager integration)
- Character-door collision ignore management
- Door access change callbacks

---

## File Listing

| File | Lines | Description |
|---|---|---|
| Character.cs | 6365 | Core character class |
| CharacterAnimator.cs | ~2700 | Animation state machine |
| CharacterSerializer.cs | 883 | Network serialization singleton |
| CCTVCamera.cs | 765 | CCTV camera system |
| CharacterUpdateController.cs | 365 | Update loop orchestrator |
| CharacterInformation.cs | 551 | Character info UI |
| GuardTower.cs | 565 | Sniper tower system |
| Door.cs | 523 | Door interaction |
| PrisonAlertnessManager.cs | 522 | Prison alertness system |
| CharacterOpinions.cs | 242 | Per-character opinion system |
| SpeechManager.cs | 336 | Speech system singleton |
| CharacterSpeechBubbleHandler.cs | 344 | Speech bubble display |
| CharacterIconHandler.cs | 361 | Icon display system |
| ContrabandDetector.cs | 360 | Metal detector system |
| CharacterNetEvents.cs | 227 | Combat network events |
| OpinionManager.cs | 439 | Opinion system singleton |
| DoorManager.cs | 357 | Door access management |
| Chase.cs | 280 | Chase BT action |
| Patrol.cs | 254 | Patrol BT action |
| VisionTrigger.cs | 165 | Character vision scanning |
| AICharacter.cs | ~500 | Base AI class |
| AICharacter_Guard.cs | ~300 | Guard AI |
| AICharacter_Inmate.cs | ~250 | Inmate AI |
| AICharacter_Dog.cs | ~200 | Dog AI |
| AICharacter_Medic.cs | 181 | Medic AI |
| AICharacter_MaintenanceMan.cs | 129 | Maintenance AI |
| AICharacter_JobCustomer.cs | 228 | Job customer AI |
| AICharacter_JobOfficer.cs | 141 | Job officer AI |
| AICharacter_CrowdNPC.cs | 267 | Crowd NPC AI |
| AICharacter_Ghost.cs | 115 | Ghost NPC |
| AICharacter_Snooty.cs | 52 | Snooty NPC |
| AICharacter_SpecificQuestGiver.cs | 37 | Quest giver NPC |
| AIMovement.cs | ~300 | Pathfinding wrapper |
| AIPatrols.cs | 64 | Patrol path mapping |
| PatrolPath.cs | 90 | Waypoint path definition |
| AIPath.cs | 322 | A* path follower |
| AILerp.cs | 315 | Lerp path follower |
| AIPlayer.cs | 176 | AI player character |
| Wander.cs | 175 | Wander BT action |
| GoTo.cs | 159 | GoTo BT action |
| Flee.cs | 96 | Flee BT action |
| LookAround.cs | 49 | LookAround BT action |
| Knockout.cs | 11 | Knockout helper |
| Routines.cs | 11 | Routine enum |
| RoutineSubTypes.cs | 19 | Routine subtype enum |
| RoutineManager.cs | ~500 | Routine management singleton |
| RoutinesData.cs | ~200 | Routine definitions ScriptableObject |
| RoutineConfig.cs | 11 | Routine configuration |
| RoutineHelper.cs | 7 | Routine validation utility |
| AIEvent.cs | ~300 | Event type system |
| AIEventData.cs | ~200 | Event data ScriptableObject |
| AIEventManager.cs | ~400 | Event management singleton |
| AIEventMemory.cs | ~200 | Event memory per character |
| AIConfig.cs | ~200 | AI configuration ScriptableObject |
| Personality.cs | ~150 | Personality types and combat styles |
| NPCManager.cs | ~600 | NPC management singleton |
| CharacterStats.cs | ~300 | Stats system |
| CharacterMovement.cs | ~200 | Movement controller |
| CharacterCustomisation.cs | ~200 | Visual appearance |
| CharacterEventManager.cs | ~100 | Character event manager |
| CharacterRole.cs | 21 | Role enum |
| CharacterConfig.cs | 37 | Baseline stats ScriptableObject |
| CharacterInfo.cs | 6 | Character name component |
| CharacterSpeed.cs | 7 | Speed enum |
| CharacterUtil.cs | 189 | Vision/line-of-sight utilities |
| CharacterInventoryInteraction.cs | 161 | Inventory interaction |
| CharacterComparer.cs | 27 | Character equality comparer |
| CharacterBarrier.cs | 135 | Zone boundary barrier |
| CharacterAudioEvents.cs | 21 | Audio event name holder |
| CharacterStencilRenderer.cs | — | Stencil rendering |
| CombatConfig.cs | 58 | Combat damage tables |
| GlobalCombatConfig.cs | 25 | Global combat parameters |
| CombatState.cs | — | Combat state enum |
| CombatObjective.cs | — | Combat objective |
| PrisonAlertness.cs | 15 | Alertness level enum |
| GuardAlertnessCustomisation.cs | 73 | Alertness-scaled guard stats |
| SpeechPODO.cs | 47 | Speech data object |
| SpeechTone.cs | 8 | Speech tone enum |
| SpeechBubbleHUD.cs | 117 | Speech bubble UI |
| SpeechTrigger.cs | 6 | Speech trigger placeholder |
| SpeechDecorations.cs | — | Speech decoration types |
| SpeechObjective.cs | — | Speech objective |
| DogBowl.cs | 248 | Dog feeding bowl |
| DogAnimator.cs | — | Dog animator |
| BedEventManager.cs | — | Bed events |
| GuardBoard.cs | 42 | Guard assignment UI |
| GuardBoardInteraction.cs | — | Guard board interaction |
| GuardTowerManager.cs | — | Guard tower manager |
| GuardTowerSpotlight.cs | — | Tower spotlight |
| RollCallSpeech.cs | — | Roll call speech |
| AIBehaviourRecoveryManager.cs | — | Behaviour recovery |
| RoutineAndTimeTrackerHUD.cs | — | Routine/time tracker UI |
| DoorTextureStamp.cs | — | Door texture |
| DoorSpecialTextureStamp.cs | — | Door special texture |
| CharacterRenderLists.cs | — | Render list management |
| CharacterAnimEventListener.cs | — | Animation event listener |
| OpinionConfig.cs | 23 | Opinion configuration ScriptableObject |

---

## Hardcoded Strings

| String | File | Context |
|---|---|---|
| `"m_HasProximitySpeech"` | AICharacter_JobCustomer.cs:44 | Blackboard key |
| `"m_ProximitySpeech"` | AICharacter_JobCustomer.cs:45 | Blackboard key |
| `"m_ProximitySpeechDistance"` | AICharacter_JobCustomer.cs:46 | Blackboard key |
| `"m_ProximitySpeechCooldown"` | AICharacter_JobCustomer.cs:47 | Blackboard key |
| `"m_JobCustomerBehaviour"` | AICharacter_JobCustomer.cs:52 | Blackboard key |
| `"m_EnactingJob"` | AICharacter_JobCustomer.cs:53 | Blackboard key |
| `"m_IsBeingUsed"` | AICharacter_JobCustomer.cs:54 | Blackboard key |
| `"m_NeedsCustomisationReset"` | AICharacter_JobCustomer.cs:56 | Blackboard key |
| `"m_ExitPoint"` | AICharacter_JobCustomer.cs:57 | Blackboard key |
| `"m_HasExitPoint"` | AICharacter_JobCustomer.cs:59 | Blackboard key |
| `"m_ShouldWanderAtWaitPosition"` | AICharacter_JobCustomer.cs:61 | Blackboard key |
| `"m_ShouldJobWanderExactly"` | AICharacter_JobCustomer.cs:63 | Blackboard key |
| `"m_WanderPrecision"` | AICharacter_JobCustomer.cs:65 | Blackboard key |
| `"m_HasRoutineGoalPosition"` | AICharacter_JobCustomer.cs:67 | Blackboard key |
| `"m_RoutineGoalPosition"` | AICharacter_JobCustomer.cs:69 | Blackboard key |
| `"m_ShouldRunToRoutinePosition"` | AICharacter_JobCustomer.cs:71 | Blackboard key |
| `"m_WaitingForServiceText"` | AICharacter_JobCustomer.cs:73 | Blackboard key |
| `"No Speech Lines"` | AICharacter_JobOfficer.cs:129 | Fallback speech |
| `"Speech Line was empty!"` | AICharacter_JobOfficer.cs:137 | Fallback speech |
| `"TrackableUIElementsReporter is missing from '` | CharacterSpeechBubbleHandler.cs:105 | Debug log |
| `"$guard"` | SpeechManager.cs:109 | Token replacer key |
| `"$inmate"` | SpeechManager.cs:110 | Token replacer key |
| `".Doggie"` | SpeechManager.cs:215 | Dog speech suffix |
| `"DOES THIS GET HIT?"` | CharacterSerializer.cs:65 | Debug log |
| `"Discarding previous character network update as it is from a previous prison! "` | CharacterSerializer.cs:514 | Log message |
| `"Unexpected error when deserializing the Prison Alertness! Got value "` | PrisonAlertnessManager.cs:413 | Error message |
| `"Text.Chase.Missing"` | Chase.cs:132 | Speech text ID |
| `"Text.Inmates.AttackedRunsAway"` | Flee.cs:18 | Speech text ID |
| `"Text.Player.ContrabandDetect"` | ContrabandDetector.cs:179 | Speech text ID |
| `"Text.Player.PouchUsed"` | ContrabandDetector.cs:199 | Speech text ID |
| `"Text.Game.Roles.NoJob"` | CharacterInformation.cs:274 | Localization key |
| `"Text.Game.Roles.Dog"` | CharacterInformation.cs:278 | Localization key |
| `"Text.Stats.TimeServed"` | CharacterInformation.cs:235 | Localization key |
| `"Text.Stats.DaysWorked"` | CharacterInformation.cs:248 | Localization key |
| `"Text.Stats.DolphinDaysWorked"` | CharacterInformation.cs:239 | Localization key |
| `"Text.Format.TimeServed"` | CharacterInformation.cs:266 | Localization key |
| `"Text.Interact.CanineA"` | DogBowl.cs:24 | Interaction text |
| `"Text.Interact.CanineB"` | DogBowl.cs:26 | Interaction text |
| `"aibehaviours"` | AICharacter_JobOfficer.cs:30 | Asset bundle name |
| `"NOName"` | CharacterInfo.cs:5 | Default name |
| `"m_JobBehaviour"` | AIPlayer.cs:150 | Blackboard key |

---

## Mod Hook Opportunities

1. **Character.cs** — The class has virtual methods `OnInteractionStart()`, `OnInteractionExit()`, `BuildingBoundaryCheck()`, `GenerateAdditionalSavePayload()`, `RestoreAdditionalSavePayload()` that subclasses can override.

2. **AICharacter virtual hooks** — `OnAddingEventToMemory()`, `OnMemoryForgotten()`, `OnStart()`, `OnUpdate()`, `OnAwake()`, `OnDestroy()` provide subclass extension points.

3. **AICharacter_Generic** — Base class for simple NPCs; can be extended for custom NPC types (as seen with Snooty and SpecificQuestGiver).

4. **NodeCanvas BehaviourTrees** — All AI decisions use BehaviourTrees from NodeCanvas. The Blackboard system keys documented above (const strings in JobCustomer) show the pattern for extending AI behavior.

5. **CharacterSerialization** — The serialization uses interest groups with configurable delays. Adding a new serialization tier or modifying the SortCharacterLists logic would affect networking performance.

6. **Photon RPC system** — All networked events use `[PunRPC]` attributes and `PostLevelLoadRPC`. Custom RPCs can be added following the existing pattern.

7. **AIConfig ScriptableObject** — Many AI parameters are exposed in ScriptableObjects. Creating custom AIConfig variants changes global behavior.

8. **Personality types** — The Personality class defines FloatSettings per type. New personality types can be added to the Personality enum with custom float settings.

9. **AIEvent system** — New AIEvent.EventType values can extend the detection/reporting system. Requires updating AIEventTypeToAlertnessReason in PrisonAlertnessManager.

10. **CharacterRole** — Adding new roles requires updates across Manager classes that switch on role.

11. **SpeechManager tokens** — The $guard/$inmate token system is extensible. New `TokenReplacer` delegates can be registered in the map.

12. **RoutineSubTypes** — New routine subtypes can be added to extend the daily schedule.

13. **CombatConfig** — The damage tables are indexed by modifier enum. New damage profiles can be added.

---

## Bugs & Suspicious Code

1. **Chase.cs:122-136** — String interpolation `"Text.Chase.Missing"` is hardcoded with a flag check for player characters. The `bAllowTextRecolour` parameter is only set to `true` if the target is a player; this relies on the flag being set correctly.

2. **CharacterSerializer.cs:65** — Debug log `"DOES THIS GET HIT?"` suggests the developer was uncertain about a code path.

3. **CharacterSerializer.cs:514** — Google Analytics exception log when receiving serialization from a previous prison map rotation — suggests edge case handling for late-arriving packets.

4. **Chase.cs:155** — `SameFloorCheck` for hidden character grace period: if the target is on a different floor, the chase action treats it as unreachable, which may cause guards to give up on targets that simply went to another floor.

5. **AIPath.cs:12** — The `HelpURL` points to `arongranberg.com/astar/docs/class_a_i_path.php` — documentation for the A* Pathfinding Project dependency.

6. **AILerp.cs:7** — Similar HelpURL for the lerp variant.

7. **GuardTower.cs:412** — `CheckGunLineOfSight` always returns `true` (hardcoded). The guard tower never fails line-of-sight checks, making it always accurate regardless of obstacles.

8. **DogBowl.cs:63** — Empty `if` block with just curly braces suggesting removed/placeholder code.

9. **AICharacter_JobOfficer.cs:29-36** — The behaviour tree replacement uses `(Clone)` suffix stripping, which may fail if asset naming conventions change.

10. **CCTVCamera.cs:282** — Update cycles are staggered by modulo of `m_uniqueIDcounter` for performance, but the counter is `static` across all cameras — if cameras are created dynamically, the distribution may be uneven.

11. **CharacterInformation.cs:256** — The dolphin "days worked" calculation `1973 + 23 * daysElapsed` is a hardcoded formula with seemingly arbitrary constants.

12. **PrisonAlertnessManager.cs:289** — The Lockdown trigger at alertness 10 (5 stars) does not check if lockdown is already active, potentially causing duplicate triggers.

13. **ContrabandDetector.cs:156** — Power check early exit: if power is off, detection is skipped entirely, but the light color check still runs in `ControlledUpdate`.

14. **Flee.cs:48-51** — If character role is not Inmate, the flee action immediately fails (`EndAction(false)`) with no fallback behavior.

15. **CharacterSerializer.cs:328-358** — The `SortCharacterLists` iteration includes a check for `Vector2.SqrMagnitude(vector2 - vector) < 324f` (18 units distance) for promotion to Medium serialize rate — this is a hardcoded proximity radius.

16. **JobOfficer.cs:23-36** — The null check for `m_CharactersWeHasSpokenTo` in `OnStart` contradicts the static initializer at line 7, which creates a new list — the list should never be null if the static initializer runs before instance creation.

17. **AICharacter_Snooty.cs:10** — Uses old-style `(bool)` cast instead of `UnityEngine.Object` operator override pattern.

---

## Dependencies

| Dependency | Usage |
|---|---|
| **Photon Unity Networking** | Multiplayer networking (`PhotonView`, `PhotonNetwork`, `RaiseEvent`, `PunRPC`) |
| **NodeCanvas** | BehaviourTrees for AI decision-making (`ActionTask`, `Blackboard`, `BehaviourTreeOwner`) |
| **A* Pathfinding Project** | Pathfinding (`Seeker`, `ABPath`, `GraphNode`, `RVOController`, `NavMeshUtil`) |
| **Rotorz Tile System** | Tile-based map (`TileSystem`, `TileGrid`) |
| **T17 Framework** | Team17 internal framework (`T17MonoBehaviour`, `T17NetworkBehaviour`, `T17NetView`, `T17NetManager`, `T17BehaviourManager`) |
| **BitStream** | Network serialization (`BitStreamWriter`, `BitStreamReader`) |
| **Wwise** | Audio system (`AUTOGEN_T17Wwise_Enums`, `AudioController`) |
| **AUTOGEN_T17Wwise_Enums** | Auto-generated Wwise event enums |
| **SaveHelpers** | Save system helpers (`BitField`) |
| **Localization** | Text localization system |
| **PinManager** | Map pin/icon system |
| **EffectManager** | Visual effects (heat increase, money change) |
| **QuestManager** | Quest system integration |
| **JobsManager** | Job system integration |
| **VendorManager** | Vendor/barter system |
| **SolitaryManager** | Solitary confinement system |
| **PrisonPowerManager** | Prison power system |
| **CutsceneManagerBase** | Cutscene hooks |
| **TutorialManager** | Tutorial trigger system |
| **ChatFeedManager** | Chat/alert feed UI |
| **FloorManager** | Multi-floor management |
| **RoomManager** | Room/blob spatial system |
| **RoomUtility** | Room distance/path utilities |
