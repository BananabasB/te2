---
title: Jobs and Quests
description: The Escapists 2 - Jobs and Quests system documentation
---

## Overview

The Jobs, Quests & Objectives system in The Escapists 2 is a three-tier architecture. **Jobs** are prison work assignments (cooking, plumbing, mail sorting, etc.) with quotas, employee tracking, and serialization. **Quests** (Favours) are inmate-given multi-step tasks with rewards, using an expiration/timer system. **Objectives** form the atomic unit of both quests and tutorials, implemented via a tree-based directed graph with 45+ concrete types.

---

## Jobs System

### Class Hierarchy

```
BaseJob (abstract)
├── BaseCustomerJob (abstract) — jobs serving NPC customers
│   └── CustomerJob<CustomerClass> (abstract) — generic customer lifecycle
│       └── ServiceCustomerViaProxyJob — queue/beckon/service workflow
│           └── ServiceItemJob — dispense → craft → deliver to customer
│               ├── BeckonAndServiceCustomerJob — beckon + minigame per interaction
│               ├── ServiceItemAtRandomServicePointJob — floating service point
│               └── FacePaintingJob — applies face customisation on service
├── HandymanJob — repair/fix‑it jobs with random interaction selection
│   ├── PlumberJob — flushes toilets in cells, fixes flooding
│   ├── ElectricianJob — reading‑masher minigame on fuse boxes
│   ├── MinstrelJob — lute minigame with NPC reactions
│   ├── DecayingItemHandymanJob — items degrade each use
│   │   ├── PaintingJob — painting minigame
│   │   └── TreeDecorationJob — decoration minigame
│   └── (PaintJob, TreeDecorationJob — via DecayingItemHandymanJob)
├── ProcessItemJob — dispense → process → collect workflow
│   ├── CookingJob — timed cooking with overcooked/undercooked bounds
│   └── ExtendedProcessItemJob — dual processor (A/B) support
│       └── (HorseshoeMaking — uses ExtendedProcessItemJob)
├── MultistageItemConversionJob — multi‑stage converter chain
│   └── GrowPlantJob — plant patches growing lifecycle
├── CarriedInputJob — carry‑object dispense → deliver to consumer
│   ├── MailSortJob — sorting machines + tag‑matched collectors
│   └── FilteredCarryableIntoConsumerJob — tag‑filtered consumers
├── StoneMasonJob — stone → carving → statue workflow
├── DogFoodJob — bowl → receptacle → feed dog workflow
├── RelightTorchesJob — fuel + lighter → light torches
└── StayInRoomJob — employee stays in job room, earns quota over time
```

### BaseJob (`BaseJob.cs`)

Abstract foundation for all jobs. Key fields and methods:

```csharp
public JobType m_Type;              // Which job this is (Cooking, Plumber, …)
public RoomBlob m_Room;             // Assigned job room
public JobInfo m_Info;              // Display metadata (name, description)
public Character m_Employee;        // Assigned inmate/staff
public int m_QuotaTarget;           // Number of completions needed per shift
public int m_QuotaAchieved;         // Current completions
public float m_fTimeToComplete;     // Seconds per completion
public int m_MoneyReward;           // Payout per completion
public List<JobTutorialStep> m_TutorialSteps;  // Paginated tutorial steps
public List<ItemData> m_OneTimeJobRelatedItems; // Items to init at level load
```

**Core methods:**
- `Init(RoomBlob)` — one‑time room setup; reads `RoomBlob_JobRoom` for dispensers, processors, collectors
- `OnJobTimeStarted(bool isSaveRestore)` — called when daily job period begins; resets state, fills dispensers
- `OnJobTimeEnded()` — called when job period ends; dismisses customers, empties collectors, stops interactions
- `IncrementQuotaAchieved()` — thread‑safe increment; fires `OnJobComplete` when target reached
- `SetRoutineInformationForCharacter(Character)` — updates player UI arrow to next task target
- `DoesEmployeeHaveToReportToJobRoom()` — false if employee already has needed items
- `Serialize()` / `Deserialize(ulong[])` — bit‑packed save data, versioned

**Serialization format:** Base uses 1 `ulong` (64 bits) for core state. Subclasses append their own data. Bit‑packed via `BitField` helper.

### JobsManager (`JobsManager.cs`)

Central singleton managing all job instances.

- Contains a `PrisonJobInfo[]` array configured via `LevelSetup_Jobs` in the level prefab
- `JobType[]` enum of 31 entries (including DLC: Woodwork, Laundry, Library, Gardening, Horseshoe, DogFood, TreeDecoration, FacePainting, StoneMason, Minstrel, etc.)
- `JobCategory` enum: `Repair`, `ProcessItem`, `CarriedInputJob`, `Customer`, `Invalid`
- Allocates reserved `T17NetView` IDs for jobs via `TakeAReservedIdForJobs()`
- Handles lockdown → abort active jobs, clear quotas
- Routes `OnJobAssigned`/`OnJobUnassigned` events

### JobCategory Enum (`JobCategory.cs`)

| Value | Description |
|---|---|
| `Invalid` | Unassigned |
| `Repair` | Handyman‑style (Plumber, Electrician, Minstrel, Painting, TreeDecoration) |
| `ProcessItem` | Process‑style (Cooking, Laundry, Library, Gardening, etc.) |
| `CarriedInputJob` | Carry‑object style (MailSort, FilteredCarryableIntoConsumer) |
| `Customer` | Customer‑serving style (Kitchen, FacePainting, etc.) |

### Job Room Configuration (`RoomBlob_JobRoom.cs`)

Data component on job room `RoomBlob`. Fields:

- `m_JobType` — links to the job prefab type
- `m_Door` — key‑coded door (`m_DoorKeySubCode` auto‑incremented)
- `m_Dispensers`, `m_Processors`, `m_Collectors` — `List<InteractiveObject>` for job stations
- `m_CustomerWaitObject`, `m_CustomerWaitPosition` — customer queue point
- `m_CustomerPatronType` — `GroupA/B/C/D`
- `m_CustomerServicePointLinks` — links between service stations and waiting points
- `m_CustomerIdleActiveRooms` — where customers wander during job time
- `m_CustomerNotActiveRoutinePosition` — where customers go outside job time
- `m_BespokeJobObjects` — extra per‑level objects (statue consumers, etc.)
- `m_JobTaunters` — `FakeCharacter`s that taunt the employee
- `m_TutorialBoard` — `JobTutorialBoardInteraction`
- `m_JobBehaviour` — `BehaviourTree` for AI employee routing

### Level Setup (`LevelSetup_Jobs.cs`)

At level load, creates `PrisonJobInfo[]` from configured `JobInfo[]` entries. Each entry specifies:

- `m_LimitationGroup` — `BuildingBlockManager` group
- `m_JobPrefabRef` — `BaseJob` prefab
- `m_EmployNPCOnStart` — auto‑assign an NPC employee
- `m_DaysKeptVacant` — days before auto‑filling

---

## Customer Job System

### BaseCustomerJob (`BaseCustomerJob.cs`)

Abstract customer‑serving job. Manages customer lifecycle via `JobCustomerRequester`.

- `m_CustomerRequester` — singleton pool of `AICharacter_JobCustomer`
- `m_CustomerType` — patron group filter
- `m_bCustomerWantsRandomCustomisation` — random appearance per customer
- `m_bCustomerWaitsAtExitPoint` — customer waits at room exit
- `m_bInfiniteCustomers` — keep spawning replacements
- `m_IdleActiveRoutines` — routine subtypes where customers roam `m_RoomsWhenIdleActive`
- `m_CustomerWaitingForServiceLines` — speech when waiting (localized key)

**Flow:** `Init()` → register with `RoutineManager.OnRoutineChanged` → on job time, customers roam idle rooms or wait at exit point → `RequestNewCustomerCharacter()` pulls from pool → `DismissCustomerRPC()` returns to pool

### CustomerJob\<CustomerClass\> (`CustomerJob.cs`)

Generic customer lifecycle with type‑safe `CustomerClass` (e.g. `CustomerViaProxy`).

- `BehaviourTree m_CustomerBehaviour` — AI behaviour tree for customer actions
- `List<CustomerClass> m_Customers` — active customers
- Serialization: 5‑bit header for count, then per‑customer serialized data
- Auto‑dismisses all customers on `OnJobTimeEnded()`

### CustomerViaProxy

Saveable data class wrapping an `AICharacter_JobCustomer` with service‑ready flag and serialization support.

### ServiceCustomer (`ServiceCustomer.cs`)

MonoBehaviour on service points. Links to `ServiceCustomerViaProxyJob` via `LinkToJob()`. Methods:

- `ServiceActionPerformed(Character server)` — generic service event
- `ServiceActionPerformed(ItemData item, Character server)` — item‑based service
- `DoesLinkedJobHavePendingCustomer()` — check queue

### ServiceCustomerViaProxyJob (`ServiceCustomerViaProxyJob.cs`)

Full customer queue system.

- `m_ServicePoints` — `List<CustomerServicePointLinker.CustomerServicePoint>` from room config
- `m_CustomerServicePointMap` — maps `AICharacter_JobCustomer → CustomerServicePoint`
- `m_CustomersWaitingForService` — FIFO queue of `CustomerViaProxy` ready for service
- `CustomerWaitingForServiceChangedEvent` — event when queue changes
- Proximity speech: `m_RequestServiceProximitySpeech`, distance, cooldown

**Flow:** `CreateNewCustomer()` → customer arrives → `ReadyToBeServed()` → `CustomerReadyForServicing()` adds to queue → `GetWaitingCustomer()` → `ServiceWaitingCustomerRPC()` → `OnCustomerServiced()` → `IncrementQuotaAchieved()` + `DismissCustomerRPC()`

### ServiceItemJob (`ServiceItemJob.cs`)

Structured item‑based customer service.

- `ItemOptionPODO` — recipe: `List<ItemData> m_Ingredients` → `ItemData m_FinishedProduct` + NPC response speech
- `m_ServiceItemObjects` — `ServiceItemInteractiveObject`s on collectors
- `m_ServiceMaps` — maps `ServiceCustomer → ServiceItemInteractiveObject`
- Dispensers: `TransferItemsInteraction`s filled with ingredients
- Auto‑refills when dispenser empties
- Guides player via `SetRoutineInformationForCharacter()` — arrows to nearest service point or dispenser

### BeckonAndServiceCustomerJob (`BeckonAndServiceCustomerJob.cs`)

Extends `ServiceItemJob` with beckon + minigame per interaction.

- `m_BeckonInteractionMaps` — maps `BeckonCustomer → BeckonAndMinigameServeCustomerInteraction`
- `CallForNextCustomerRPC()` — beckons next customer from pool
- `CancelRequestForCustomerRPC()` — dismisses without service
- Tracks which interactions have been serviced from for finite‑customer mode

### ServiceItemAtRandomServicePointJob (`ServiceItemAtRandomServicePointJob.cs`)

Floating service point that attaches to the customer.

- On ready: attaches `ServiceItemInteractiveObject` as child of customer
- On dismiss: detaches and hides
- Random service point selection per customer

### AICharacter_JobCustomer (`AICharacter_JobCustomer.cs`)

AI character subclass for job customers.

- `PatronTypes`: `Unassigned`, `GroupA`, `GroupB`, `GroupC`, `GroupD`
- Blackboard keys: `m_JobCustomerBehaviour`, `m_EnactingJob`, `m_IsBeingUsed`, `m_ExitPoint`, `m_HasProximitySpeech`, etc.
- `SetupForJob(BaseCustomerJob, BehaviourTree)` — configures blackboard
- `SetIsBeingUsed(bool, bool)` — marks customer as taken
- `ReadyToBeServed()` → `SoftSetReadyToBeServed()` → notifies `ServiceCustomerViaProxyJob`
- `ControlledUpdate()` — proximity speech to employee while waiting

### JobCustomerRequester (`JobCustomerRequester.cs`)

Singleton managing the customer NPC pool.

- `m_AvailableCustomers` / `m_TakenCustomers` — separate pools for free/in‑use customers
- `RegisterCustomerWithSystem()` — called by `AICharacter_JobCustomer.StartInit()`
- `TakeAvailableCustomerRPC(PatronTypes, bool)` — pops from available
- `MarkCustomerAsFreeRPC()` / `MarkCustomerAsTakenRPC()` — network RPCs for pool state
- Random customisation via `m_CustomerAstehticSetups` — seed‑based deterministic appearance
- Save/load via `NetSaveData` with BinaryFormatter

### SetJobCustomerCustomisation (`SetJobCustomerCustomisation.cs`)

NodeCanvas `ActionTask` that applies seeded random appearance from `JobCustomerRequester`.

### AICharacter_JobOfficer (`AICharacter_JobOfficer.cs`)

Officer NPC at job office desk.

- `CanSpeekToCharacter(int)` — checks character on time + not already spoken to + no job
- `GiveReward(int)` — pays `JobConfig.m_MoneyReward` via `m_CharacterStats.IncreaseMoney()`
- `GetSpeechLines()` — picks random speech from `JobConfig.m_SpeechLines`
- Tracks spoken‑to characters per routine cycle

### JobConfig (`JobConfig.cs`)

ScriptableObject config:

- `m_CharacterLateTime` (0–60s) — how late before flagged
- `m_MissedJobOfficerHeatIncrease` (0–100%) — heat penalty
- `m_MoneyReward` — base pay per job completion
- `m_SpeechLines` — officer dialogue pools

### ServiceCustomerViaProxyJob Customer Impatience

Configurable per job:
- `m_RequestServiceProximitySpeech` — speech played when employee is nearby
- `m_RequestServiceSpeechDistance` — trigger radius (default 3.5)
- `m_RequestServiceSpeechCooldown` — seconds between speech (default 10)
- `m_CustomerServicedSound` — Wwise event on service

---

## Job‑Specific Implementations

### HandymanJob (`HandymanJob.cs`)

Repair‑style jobs with random interaction selection.

- `m_MinigameRequirements` — items needed to perform repair
- `m_MinigameRequiredEquippedItem` — must be equipped
- `m_CraftableItemRequirements` — items player can craft for repair
- `m_DispensedStartingItems` — items in room dispensers
- `m_NumItemsPerDispenser`, `m_bDispensersUsableOutsideJobTime`
- `m_NumRepsForMinigameComplete`, `m_TimeForAutoCompletion`

**Flow:** `Init()` → `SearchForAllPossibleInteractions()` (finds matching `HandymanInteraction`s by `m_JobType`) → `OnJobTimeStarted()` → `Master_PickInteractionsAndNotifyRPC()` (randomly picks up to `m_QuotaTarget` interactions) → player fixes → `OnInteractionFixed` → `IncrementQuotaAchieved()` → all fixed → job complete

**Serialization:** Versioned (v0/v1). Saves active and fixed interaction NetView IDs in bit‑packed format (12 bits per ID, up to 4 per `ulong`).

### PlumberJob (`PlumberJob.cs`)

Extends `HandymanJob`. Searches all `InmateCell` rooms for `ToiletInteraction`s, adds `PlumberInteraction` component.

- `SetInteractionForJobTimeActive()` — floods toilet when interaction becomes active
- `CopyPossibleInteractionsForNewJobTime()` — excludes locked interactions

### PlumberInteraction (`PlumberInteraction.cs`)

`HandymanInteraction` subclass. Uses `GymMasher_Threadmill_ExerciseBike` masher.

- Visible only when toilet is flooded
- `OnFixed()` → `UnClogToilet()`, plays Wwise events

### ElectricianJob (`ElectricianJob.cs`)

Extends `HandymanJob`. Minimal — sets `m_MasherSettings` on `ElectricianInteraction`.

### ElectricianInteraction (`ElectricianInteraction.cs`)

Uses `ReadingMasher`. Tracks masher gain/sweetspot states for Wwise audio feedback.

### MinstrelJob (`MinstrelJob.cs`)

Extends `HandymanJob`. Sets `m_MasherSettings` on `LuteInteraction`.

### LuteInteraction (`LuteInteraction.cs`)

`HandymanInteraction` using `SolitaryPotatoMasher`.

- Triggers NPC reactions via `RPC_TriggerNearbyNPCReaction()` every `m_fReactionCooldownTime` (default 3s)
- Finds nearby inmates/guards, plays `m_NPCReactionText` speech, pauses movement
- Wwise loop events for lute music
- Hidden from proximity detector in versus mode

### PaintingJob (`PaintingJob.cs`) / TreeDecorationJob (`TreeDecorationJob.cs`)

Extend `DecayingItemHandymanJob`. Sets masher settings on their respective interactions.

### DecayingItemHandymanJob (`DecayingItemHandymanJob.cs`)

Extends `HandymanJob` — each repair degrades the required items.

- `m_RequiredItemsUsedReplacement` — item given when tool breaks
- `m_ItemHealthDecayPerUse` — health decrement per fix
- `All_OnInteractionFixed()` — decreases item health; replaces broken items

### ProcessItemJob (`ProcessItemJob.cs`)

Dispense → process → collect pipeline.

- `m_DispensedItems` — items in dispensers
- `m_NumItemsPerDispenser`, `m_DispenserUsableOutsideJobTime`, `m_InfintelyDispenseDuringJobTime`
- `m_ProcessorInputItems`, `m_ProcessorOutputItems` — conversion recipe
- `m_ProcessingTime`, `m_ProcessorUsableOutsideJobTime`
- `m_CollectedItems` — items that count toward quota when deposited
- `m_PreCraftItems` — items that must be crafted before processing
- `SetProcessorInputItem()` — assign I/O to `ItemProcessorBase`

**Events:** `OnDepositFinishedItemEvent` increments quota + clears collector. `Dispenser_OnItemRemoved` auto‑refills if `m_InfintelyDispenseDuringJobTime`.

### CookingJob (`CookingJob.cs`)

Extends `ProcessItemJob`. Configures `CookingItemProcessor`s with:

- `m_OvercookedItemData`
- `m_CookedLowerBound`, `m_CookedUpperBound` (seconds)
- Processors set interruptable + UI visible when player is assigned
- Hooks `OnJobAssigned` to toggle cooking UI visibility

### ExtendedProcessItemJob (`ExtendedProcessItemJob.cs`)

Dual‑processor variant. Secondary processor uses `m_Processor_BInputItems` / `m_Processor_BOutputItems`.

### MultistageItemConversionJob (`MultistageItemConversionJob.cs`)

Converter‑chain workflow using `MultistageItemConverter`.

- `m_InputOutputs` — `List<MultistageItemConverter.ItemConverterConversions>`
- `m_CanConvertersBeUsedOutsideJobTime`, `m_MaxConverterInputs`
- `FillDispensers()` → `GetDispenserContentsForFilling()` → spawns items

### GrowPlantJob (`GrowPlantJob.cs`)

Extends `MultistageItemConversionJob`. Manages `PlantPatch` lifecycle.

- `m_Trowel`, `m_Seeds`, `m_PottedPlant` — item definitions
- `m_NumSeedsPerTrowel` — seed multiplier
- Listens to `SeedGrowingEvent` and `GrownPlantTakenEvent` → `MasterPlantQuotaIncrease()`
- `SetRoutineInformationForCharacter()` — prioritises fully grown plants, then patches to dig/seed

### CarriedInputJob (`CarriedInputJob.cs`)

Carry‑object workflow. Dispenses `HazardousCarryableObjectInteraction` prefabs.

- `m_ObjectPrefabToDispense` — prefab with required items
- `m_bCanDispensersBeUsedOutsideJobTime`, `m_NumberEquipmentItemsSpawned`
- `SetupDispensers()` — scans for `CarriedObjectDispenser` and `TransferItemsInteraction`
- `FillDispensers()` — cycles through required items

### MailSortJob (`MailSortJob.cs`)

Extends `CarriedInputJob`. Sorting machine + tag‑matched collector workflow.

- `PostBoxTagMap` — maps `uint m_Tag` → `ItemData m_ItemData`
- `m_SortingMachineMaps` — tag/item mappings for each machine
- `m_SortingMachineNumDispensedItems` — items per batch
- `CarryableConsumer_AcceptedInputEvent` — recycles objects back to spawn pool
- `OnDepositFinishedItemEvent` — increments quota on correct collector deposit

### FilteredCarryableIntoConsumerJob (`FilteredCarryableIntoConsumerJob.cs`)

Extends `CarriedInputJob`. Generic tag‑filtered consumer workflow.

- Scans `m_BespokeJobObjects` for `CarryableObjectConsumer`s
- `CarryableConsumer_AcceptedInputEvent` — increments quota if tag matches `m_ProcessingTags`

### StoneMasonJob (`StoneMasonJob.cs`)

Standalone job: stone dispenser → carving desk → statue consumer.

- `m_StoneDispensers` — carryable stone objects
- `m_StonemasonDesks` — carving stations with state machine (`NoStone`, `WaitingForStone`, `Carving`, `WaitingForPickup`)
- `m_StatueConsumers` — accept carved statues → increment quota
- On `LightsOut` routine → resets all desks to `NoStone`
- Serialization: saves desk NetView IDs + state (12 + 4 bits per entry)

### DogFoodJob (`DogFoodJob.cs`)

Standalone job: receptacle dispenser → dog bowl → dog approval.

- `m_FoodReceptacleItem`, `m_DogFoodItem` — item types
- `m_NumSpareItemsProduced` — extra items beyond bowl count
- `m_DogBowls` — `DogBowl` collectors
- `OnDogBowlFedEvent` — increments quota; when quota reaches target, increases all dog NPCs' opinion of employee by `m_DogApprovalOnCompletion` (default 10)
- On `LightsOut` → resets all bowls to `NoBowl`
- Serialization: bowl NetView ID + stage (12 + 4 bits)

### RelightTorchesJob (`RelightTorchesJob.cs`)

Standalone job: fuel + lighter dispensers → light wall torches.

- `m_FuelItem`, `m_LighterItem` — item types
- `m_NumLighterItemsProduced`, `m_NumFuelItemsProduced` — quantity per fill
- `m_WallTorches` — `WallTorch` collectors with `TorchState` (Unfueled/Lit/FueledExtinguished)
- `OnWallTorchLitEvent` → `IncrementQuotaAchieved()` + delayed routine info recalculation
- On `LightsOut` → resets all torches to `UnfueledTorch`
- `SetRoutineInformationForCharacter()` — arrows to nearest unlit torch (or dispenser if missing items)

### StayInRoomJob (`StayInRoomJob.cs`)

Simplest job — employee earns quota by staying in the job room.

- `IControlledUpdate` — every 1s in room → +1 quota
- `m_TaunterInRoomSpeech`, `m_TaunterInterval` — periodic taunting from `FakeCharacter`s

---

## Job Board & UI

### JobBoard (`JobBoard.cs`)

MonoBehaviour with `m_AllJobKeys[]`. `SwapJob()` — removes the wrong job key from player's hidden inventory when switching jobs.

### JobBoardInteraction (`JobBoardInteraction.cs`)

`InteractiveObject` on job board. `OnStartInteraction()` → `InGameMenuFlow.Instance.OpenJobsBoard()`. Disabled in Versus mode.

### JobBoardMenu (`JobBoardMenu.cs`)

UI for job listing, selection, and confirmation. Shows stat requirements and job details.

### JobMarker (`JobMarker.cs`)

Map/overworld marker for job room locations.

### JobProgressHUD (`JobProgressHUD.cs`)

In‑game HUD element showing current job quota progress.

### JobRoom_ContentsMarker (`JobRoom_ContentsMarker.cs`)

Editor marker classifying room objects as `Dispencer`, `Collectors`, `Processors`, `Behaviour`, or `Objects`. Used by `RoomBlob_JobRoom.AutoSetup()`.

### JobOfficerScreen (`JobOfficerScreen.cs`)

UI screen for job officer interaction — assigning jobs, viewing stats.

### ServiceItemInteractiveObject

`TransferItemsInteraction` subclass for service points. Fields:
- `m_MinigameSettingsContainer`
- `m_NoEquippedItemSpeech`, `m_PlayerSpeechWhenServing`
- `LinkToJob(ServiceItemJob)` — bidirectional linking

### ServiceItemMinigameInteractiveObject

Adds minigame integration to service interactions (e.g. `FacePaintingInteraction`).

---

## Tutorial Jobs

### JobTutorialBoardInteraction (`JobTutorialBoardInteraction.cs`)

`InteractiveObject` on tutorial boards in job rooms. Opens `JobTutorialMenu` via `InGameMenuFlow.Instance.OpenJobTutorialBoard()`.

### JobTutorialMenu (`JobTutorialMenu.cs`)

Paginated tutorial display. Shows steps from `BaseJob.m_TutorialSteps`. Each page shows `m_StepElements.Length` steps with Next/Prev navigation and page counter.

### JobTutorialStep (`JobTutorialStep.cs`)

Data class: `string m_BodyText` + `Sprite m_Image`.

### UIJobTutorialStep (`UIJobTutorialStep.cs`)

UI element: `T17Text m_BodyLabel` + `T17Image m_DisplayImage`. Renders a single step.

---

## Quest System (Favours)

### QuestManager (`QuestManager.cs`)

Singleton managing the entire quest lifecycle.

**QuestGiver Pool:** Fixed array of 24 `QuestGiver` slots. Inmates register via `RegisterQuestableInmate()`. Guards via `RegisterQuestableGuard()`.

**Quest Types:**
- `QuestType` — category with `m_AvailablePercentage`, `m_QuestRefreshTimeInHours`, `m_QuestList`
- `QuestMapping` — specific character→quest bindings (`m_QuestGiver`, `m_Quest`, `m_AutoCreate`)
- Robinson-specific quests (`m_RobinsonDefaultQuest`, `m_RobinsonQuests`, `m_RobinsonMapQuestIcon`)

**Flow:**
1. `Initialise()` → applies `QuestConfig` overrides, registers `Gamer.OnDeleteImminent` + `OnBecameMasterClient`
2. `Begin()` → creates callback timer for `m_TimeInHoursBeforeInmatesHaveQuests`, caches all quest objective trees
3. `StartHandingOutQuests()` → `m_bStartGivingQuests = true`, auto‑creates specific quests, creates Robinson quests
4. `Update()` — every 3s, finds available inmates, assigns random quest type by weighted percentage via `RPC_CreateQuestGiver()`
5. Expired quest givers removed every tick

**QuestGiver lifecycle:**
- `SetQuest(QuestList, typeIndex, randomIndex)` → sets available quest
- `PrepareMenu(FavourMenu, Player)` — deserializes objective tree, sets UI text/rewards
- `OnQuestAccepted()` — fires `OnObjectiveTreeCompleted/Canceled/Failed` events, starts tutorial, adds trees to `ObjectiveManager`, increases active quest count
- `OnQuestDeclined()` — removes quest giver; special handling for typeIndex `-2` (specific) → re‑creates
- `OnObjectiveTreeCompleted()` — plays pass sound, fires `QuestCompletedEvent`, increments stat, advances to next quest in chain via `GotoNextQuest()`
- `OnObjectiveTreeFailed()` — plays fail sound, fires `QuestFailedEvent`, decrements active quests; specific quests get re‑created
- `OnQuestExpired()` — sets `m_bIsExpired` flag (removed next update tick)
- `ShowQuestAvailable(bool)` — toggles `CharacterIconHandler.IconType.Quest` and pin image

**Quest Items:** Tracked via `m_QuestItems` (`Dictionary<int, int>` — item view ID → owner player view ID). Grouped by `PlayerQuestItemGroups`. `AddQuestItem()`, `RemoveQuestItem()`, `DoesPlayerOwnQuestItem()`, `GetItemIDsForGroup()`.

**Serialization:** `Serialize()` saves all 24 quest giver slots as bitfields + quest items string. `DeserializeBinary()` via BinaryFormatter. `CreateSnapshot()` for prison snapshots.

### QuestConfig (`QuestConfig.cs`)

ScriptableObject with:
- `m_OverrideQuests` — replaces default quest pool
- `m_MaxPercentageQuestGivers` (1–100%) — % of inmates with quests
- `m_TimeInHoursBeforeInmatesHaveQuests` — delay before quests start
- `m_bAllowSpecificQuests` — toggle for specific character quests

### QuestCompletedHUD / QuestIntroObjective

UI elements showing quest completion/failure notifications and introductory objective display.

---

## Objectives System

### ObjectiveManager (`ObjectiveManager.cs`)

Singleton managing active objective trees per player.

- `AddActiveTrees(Player, List<ObjectiveTree>)` — registers trees for tracking
- `GetActiveTrees(Player, out List<ObjectiveTree>)` — retrieves per‑player trees
- `LoadObjectiveTreeData(TextAsset, ref List<ObjectiveTree>)` — deserializes JSON‑format objective data
- State machine: `Idle` → `Saving` → `Evaluating`
- Ruckus observation for objectives that trigger on combat/alarms

### ObjectiveTree (`ObjectiveTree.cs`)

Directed graph of `ObjectiveGoal` nodes.

- `m_MainBranch` — root `ObjectiveGoal`
- `ActiveTreeID` — unique identifier for save/network sync
- `BuildOrderList()` — flattens tree to linear execution order
- `Initialize()` — starts all root objectives
- `m_bShowTrackingArrows`, `m_MultiPartText` — for quest UI
- Events: `OnObjectiveTreeCompleted`, `OnObjectiveTreeFailed`, `OnObjectiveTreeCanceled`
- `EndTreeEarly(bool isTreeFailed)` — aborts all active objectives

### ObjectiveGoal (`ObjectiveGoal.cs`)

Wrapper linking a `BaseObjective` to tree position.

- `m_Objective` — the concrete `BaseObjective` instance
- `m_Dependency` — parent goal that must complete first
- `m_BranchOpenCondition` — condition goals for branch activation
- `SetBaseInfo(Player, Character)` — assigns player/quest giver context
- `PickAllRandomTargets()` — randomizes any `[ObjectiveRandom]`‑tagged fields

### BaseObjective (`BaseObjective.cs`)

Abstract base for all 45+ objective types.

- `ObjectiveStatus` enum: `InActive`, `InComplete`, `Done`, `Failed`, `Canceled`, `Invalid`, `Reset`
- `m_Status`, `m_Information`, `m_LocalizedObjectiveName`, `m_LocalizedDescription`
- Events: `OnStatusChanged`, `OnProgressUpdate`
- `Init()`, `UpdateStatus()`, `OnComplete()`, `OnFail()`
- JSON serialization via `ReadFromToken(JsonToken)` / `WriteToToken()`
- `GetProgress()` → returns `(float current, float max, string tooltip)`
- `m_bUsePerObjectiveTitles`, `m_bShouldShowQuestArrow`

### ObjectiveStatus Enum

| Value | Description |
|---|---|
| `InActive` | Not yet started |
| `InComplete` | Active and in progress |
| `Done` | Successfully completed |
| `Failed` | Failed (quest fail) |
| `Canceled` | Aborted |
| `Invalid` | Error state |
| `Reset` | Reset for retry |

### ObjectiveSceneElement (`ObjectiveSceneElement.cs`)

MonoBehaviour for scene‑bound objective references (target items, locations, NPCs). Used by objectives that need inspector assignments.

### ObjectiveTrackerHUD (`ObjectiveTrackerHUD.cs`)

HUD panel listing tracked objectives. Shows progress bars and text per active objective.

### ObjectiveSubGoalHUD (`ObjectiveSubGoalHUD.cs`)

Individual sub‑goal UI element within the tracker.

### TriggerObjectiveObserver (`TriggerObjectiveObserver.cs`)

Trigger collider component used by `TriggerObjective`. Detects player enter/stay/exit with configurable player count and stay time thresholds.

---

## Objective Types (Enum)

45+ types defined in the `ObjectiveType` enum. Key categories:

| Objective | File | Description |
|---|---|---|
| ItemObjective | `ItemObjective.cs` | Acquire item from specific location/drop; delivery target; item spawning |
| CraftObjective | `CraftObjective.cs` | Multi‑state: Collect → Craft → Deliver; recipe management; contraband |
| InteractObjective | `InteractObjective.cs` | Interact with specific interactive object |
| DialogObjective | `DialogObjective.cs` | Speak to specific character; dialog lines |
| TriggerObjective | `TriggerObjective.cs` | Enter/stay in trigger zone for duration |
| SpeechObjective | `SpeechObjective.cs` | Player speech at specific time/place |
| CombatObjective | `CombatObjective.cs` | KnockOut/Punch/TieUp/CauseRuckus with timing |
| DestroyItemObjective | `DestroyItemObjective.cs` | Destroy specific item |
| DamageTileObjective | `DamageTileObjective.cs` | Damage wall/floor tiles with row/col/floor targeting |
| FloodToiletObjective | `FloodToiletObjective.cs` | Flood specific toilet |
| InventoryObjective | `InventoryObjective.cs` | Check inventory contents |
| OutfitObjective | `OutfitObjective.cs` | Equip specific outfit |
| PassiveDialogObjective | `PassiveDialogObjective.cs` | Overhear NPC conversation |
| JobDisruptionObjective | `JobDisruptionObjective.cs` | Disrupt a job (ruckus) |
| SetObjectiveArrowObjective | `SetObjectiveArrowObjective.cs` | Update quest arrow target |
| SpawnVendorObjective | `SpawnVendorObjective.cs` | Spawn/activate vendor |
| UseItemObjective | `UseItemObjective.cs` | Use item on specific target |
| WaitUntilTimeObjective | `WaitUntilTimeObjective.cs` | Wait until specific in‑game time |
| SwapBehaviourObjective | `SwapBehaviourObjective.cs` | Swap AI behaviour tree |
| PlayEscapeCutsceneObjective | `PlayEscapeCutsceneObjective.cs` | Trigger escape cutscene |
| EnableMultistageInteractionObjective | `EnableMultistageInteractionObjective.cs` | Enable multi‑stage interaction |
| EnableInGameMenuObjective | `EnableInGameMenuObjective.cs` | Force open in‑game menu |
| EnableInputObjective | `EnableInputObjective.cs` | Enable/disable player input |
| EnableInteractionObjective | `EnableInteractionObjective.cs` | Enable/disable specific interaction |
| SetRoutineObjective | `SetRoutineObjective.cs` | Change NPC routine |
| SetUsableItemObjective | `SetUsableItemObjective.cs` | Mark item as usable |
| MoveDeskObjective | `MoveDeskObjective.cs` | Move office desk |
| TutorialCompleteObjective | `TutorialCompleteObjective.cs` | Mark tutorial step complete |

---

## AI Behaviour Conditions (Check*.cs)

NodeCanvas `ConditionTask`s used by job AI behaviour trees:

| Class | Category | Purpose |
|---|---|---|
| `CheckHaveItem` | Items | Check if AI has required items (all/any, equipped) |
| `CheckCarryingObject` | Jobs | Check if carrying object with expected tag |
| `CheckCarryObjectOnFloor` | Jobs | Find carryable object on job room floor |
| `CheckJobColouredCarriable` | Jobs | Check consumer for matching tag |
| `CheckDogBowlState` | Jobs | Check DogBowl stage (NoBowl/HasBowl/HasFood/Ready) |
| `CheckWallTorchState` | Jobs | Check WallTorch.TorchState |
| `CheckStonemasonDeskState` | Jobs | Check StonemasonDesk state |
| `CheckItemProcessor` | Jobs | Check if processor is idle/has finished item |
| `CheckObjectConsumer` | Jobs | Check consumer idle/has item |
| `CheckMultiStageTransferStage` | Jobs | Check multistage converter stage |
| `CheckItemTransferable` | Items | Check if item can be transferred to interaction |
| `CheckInteractableReserved` | Events | Check if interaction is reserved |
| `CheckIfHandymanActive` | Action | Check if HandymanInteraction needs fixing |
| `CheckIfAllHandymansInactive` | Action | Check no handyman interactions need fixing |
| `CheckHasTray` | Events | Check if character has tray |
| `CheckHasOutfit` | Events | Check if has default outfit |
| `CheckHasDefaultWeapon` | Events | Check guard has default weapon |
| `CheckIsKnockedOut` | Events | Check character KO state |
| `CheckIsBound` | Events | Check character bound state |
| `CheckFlee` | Events | Combat flee check (energy/health thresholds) |
| `CheckCurrentRoutine` | Events | Check current base routine type |
| `CheckHavePatrol` | Events | Check if patrol exists for current routine |
| `CheckAIEvent` | Events | Check if matching AI event received |
| `CheckAlertness` | Events | Check prison alertness level |
| `CheckCombatEnded` | Events | Check if combat has ended |
| `CheckCrowdShowTime` | Events | Check if crowd show time (CrowdNPC) |
| `CheckVisitorState` | Events | Check visitor state via VisitorManager |
| `CheckCharacterRecievedVisitorGift` | Events | Check if character received gift this free‑time |
| `CheckRollCallSpeech` | Events | Check roll call speech state |
| `DoesServiceJobHaveWaitingCustomer` | Jobs | Check ServiceCustomerViaProxyJob queue |
| `CheckIfHandymanActive`/`CheckIfAllHandymansInactive` | Action | Handyman interaction active state |

---

## AI Behaviour Initialisers (JobInit*.cs)

NodeCanvas `ActionTask`s that populate blackboard variables for AI job behaviours:

| Class | Job Type(s) |
|---|---|
| `HandyManJobInit` | HandymanJob (dispensers, processors, required items/equipment) |
| `ItemProcessingJobInit` | ProcessItemJob (dispensers, processors, collectors, pre‑craft, accepted items) |
| `ServiceItemJobInit` | ServiceItemJob (dispensers, collectors, post‑dispenser craft items, collector accepted) |
| `CarryItemJobBehaviourInit` | CarriedInputJob (carried object dispenser, required items, processors, collectors) |
| `StonemasonJobBehaviourInit` | StoneMasonJob (dispensers, processors, desk, carving/pickup interactions) |
| `HorseshoeMakingJobInit` | ExtendedProcessItemJob (dual processor A/B, collector accepted items) |
| `FarmingJobInit` | GrowPlantJob (dispensers, processors, trowel/seeds/potted plant IDs) |
| `CanineJobInit` | DogFoodJob (bowl dispensers, food dispensers, collectors, dog bowl/food IDs) |
| `RelightTorchesJobInit` | RelightTorchesJob (dispensers, wall torches, lighter/fuel IDs) |

---

## Job Interaction Types

| Interaction | Job | Minigame Type |
|---|---|---|
| `PlumberInteraction` | Plumber | ThreadMill masher (unclog toilet) |
| `ElectricianInteraction` | Electrician | Reading masher (fix fuse box) |
| `PaintingInteraction` | Painter | SolitaryPotato masher (paint) |
| `TreeDecorationInteraction` | TreeDecorator | SolitaryPotato masher (decoration) |
| `LuteInteraction` | Minstrel | SolitaryPotato masher (NPC reactions) |
| `HorseshoeAnvilInteraction` | Horseshoe | Reading masher (smelt horseshoe) |
| `FacePaintingInteraction` | FacePainter | Reading masher (paint face) |
| `StonemasonCarvingInteraction` | StoneMason | Minigame + auto‑pickup |


## Save/Load Architecture

All jobs implement `ISaveable` with bit‑packed `ulong[]` serialization. The format:

1. **BaseJob:** 1 `ulong` — status, employee ID, quota achieved, routine state
2. **CustomerJob:** +1 `ulong` header (5‑bit customer count) + per‑customer `ulong[]` data
3. **ServiceCustomerViaProxyJob:** + waiting customer IDs (12 bits each, up to 4 per `ulong`)
4. **HandymanJob:** + active/fixed interaction IDs (12 bits each, up to 4 per `ulong`), versioned (v0/v1)
5. **StoneMasonJob:** + desk state entries (12 bits ID + 4 bits state, up to 3 per `ulong`)
6. **DogFoodJob:** + bowl stage entries (12 bits ID + 4 bits stage, up to 3 per `ulong`)
7. **RelightTorchesJob:** + torch state entries (12 bits ID + 4 bits state, up to 3 per `ulong`)
8. **ProcessItemJob:** + processor state via `ItemProcessorBase.Serialise()`

Quests serialized via BinaryFormatter + JSON snapshots. `QuestGiver` serialized as 64‑bit bitfield (12 char ID, 12 player ID, 5 pool index, 7 timer, 3 type, 5 list index, 7 tree ID, 6 quest index, 4 tree high bits).

---

## Key Patterns

- **RPC‑first networking:** All state mutations go through `[PunRPC]` methods on `T17NetView`
- **Master‑client authority:** Most job logic gated by `T17NetManager.IsMasterClient`
- **Bit‑packed serialization:** `BitField` helper packs small values (5–12 bits) into `ulong`s for efficient save files
- **Component‑based room config:** `RoomBlob_JobRoom` stores lists of `InteractiveObject` references for dispensers/processors/collectors, populated by `JobRoom_ContentsMarker` in the editor
- **Behaviour tree AI:** Each job type has a `BehaviourTree` that populates its blackboard via `JobInit*` tasks, then uses `Check*` conditions to decide AI actions
- **Quota system:** Jobs track `m_QuotaTarget` / `m_QuotaAchieved`. Completion triggers `OnJobComplete` events. Failure (missed job time) triggers officer heat increase
- **Pooled customers:** `JobCustomerRequester` maintains available/taken pools. Customers are reused across job days
