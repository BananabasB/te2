# Items, Inventory & Crafting

## Overview

The item system is a pooled-object architecture with a 1000-slot `ItemManager` singleton. Items are `T17MonoBehaviour` instances backed by `ItemData` (ScriptableObject) for static configuration. Inventory is handled via `ItemContainer` (max 4 visible + 2 hidden slots). Crafting is a recipe-based system (3 ingredients max, intellect-gated) exposed through `CraftingMenu` (hold-to-craft UI). Functionality is delegated to `BaseItemFunctionality` subclasses (20 types). Networking uses `T17NetView`/`PhotonView` throughout.

---

## Classes

### Item (`Assembly-CSharp/Item.cs`)
- **Base**: `T17MonoBehaviour`, `IControlledUpdate`
- **Purpose**: Runtime item instance; bridge between `ItemData` config and world/container state
- **Fields**:
  - `m_ItemData` (ItemData) — ScriptableObject backing this instance
  - `m_ContainerViewID` (int) — `T17NetView.viewID` of owning container
  - `m_bHidden` (bool) — is in hidden/pass pocket compartment
  - `m_bIsAQuestItem`, `m_QuestItemOwnerID`, `m_QuestItemGroupID` — quest tracking
  - `m_bIsAMagicItem` (bool) — AI magic items (repair/destroy)
  - `m_CoveringTile` (DamagableTile) — tile this item is covering
  - `m_Owner` (Character) — character holding/wearing this
  - `m_FunctionalityToUpdate` (BaseItemFunctionality) — currently active functionality being ticked
  - `m_ProximityPenalty` (float), `m_ProximityPriority` (enum) — UI proximity sorting
  - `m_DroppedByCharacterViewID` (int) — who dropped it (for contraband alerts)
- **Events**: `OnItemContainerChanged`, `OnQuestItemStatusChanged`
- **Key methods**:
  - `Use()` — iterates functionalities, calls `StartUsing` on first usable one
  - `Use(Functionality)` — invoke a specific functionality type
  - `CancelUsing()` — cancels current functionality
  - `SetAsQuestItem(isQuestItem, owner, ref groupID)` — RPC-synced quest marking
  - `DropItemInLevel(character, position)` — master-client RPC chain to drop item in world
  - `ItemDropped()` — adds box collider, `TrackableUIElementsReporter`, culling, ladder behaviour
  - `ItemPickedUp()` — disables renderer/collider, removes reporter
  - `DecreaseHealth(amount)` — RPC-synced durability damage; destroys item at 0 health
  - `LocateAndDestroyItemRPC(context)` — removes from owner or container + releases to pool
  - `PositionOwner(funcData)` — rotates and offsets character for use animation
  - `IsOnInmate()`, `IsOnFloor()`, `GetCharacterHoldingItem()` — query helpers
- **Use animation**: `PositionOwner` applies `UseOffset` rotated by facing direction, sets Z offset (`USEITEM_Z_OFFSET = -0.2f`)
- **ControlledUpdate**: ticks `m_FunctionalityToUpdate` if set; clears if `UpdateUsing()` returns false

### ItemData (`Assembly-CSharp/ItemData.cs`)
- **Base**: `ScriptableObject`
- **CreateAssetMenu**: `"Team17/Items/Create New Item"`
- **Identity**: `m_ItemDataID` (int), `m_ItemLocalizationTag` (string)
- **Stats**: `m_ItemHealth` (100 base), `m_ItemValue` (int), `m_AlertnessIncreaseWhenFound`
- **Flags** (`m_Flags` byte, lazily set):
  - `CONTRABAND_FLAG` (1), `TOOL_FLAG` (4), `COMPONENT_FLAG` (8), `WEAPON_FLAG` (16), `OUTFIT_FLAG` (32), `CONSUMABLE_FLAG` (64)
  - Query methods: `IsContraband()`, `IsTool()`, `IsWeapon()`, `IsOutfit()`, `IsComponent()`, `IsConsumable()`
- **Functionality**: `List<FunctionalityData> m_ItemFunctionalities` — ordered by priority (first = highest priority)
- **FunctionalityData** inner class:
  - `m_Functionality` (BaseItemFunctionality)
  - `m_UseAnimation` (AnimState)
  - `m_UseTime` (float)
  - `m_UseOffset` (Vector2)
- **Gifting**: `GiftValues m_GiftOpinionValues` (Inmate/Guard), `m_bCanBeGiftedToGuards`
- **Visuals**: `m_ItemUIImage`, `m_ItemUIMapImage`, `m_ItemWorldImage/Material`, `m_ItemHeldImage/Material`, `m_ItemUseImage/Material`, `m_ItemBoundMaterial`, tile cover materials, animation type enums
- **Combat/Outfit**: `m_CombatData`, `m_OutfitData`
- **Prison mask**: `m_PrisonMask` (flags enum) controls which prisons can use this item
- **Methods**:
  - `Init()` — sets use type if unset, calls `InitFunctionalities()`, flags contraband
  - `CopyData(data)` — deep copy with `ScriptableObject.Instantiate` for functionalities
  - `ApplyConfigData(config)` — applies `ItemDataConfig` overrides at runtime
  - `HasFunctionality(Functionality)` — linear search by enum type
  - `SetParentItem(item)` — propagates parent reference to all functionalities
  - `ResetHealth()` — restores to base health
  - `SetComponent()` — marks as recipe ingredient

### ItemManager (`Assembly-CSharp/ItemManager.cs`)
- **Base**: `T17MonoBehaviour`, `INetworkLoadable`, `Saveable`, `IDeserializable`
- **Singleton**: static `s_Instance`, enforced in `Awake()`
- **Pool**: `m_ItemPoolSize = 1000`, parallel arrays `m_ItemPool` (free) / `m_UsedItemPool` (active)
- **Prefab**: `m_EmptyItemPrefab` used for `Instantiate` in pool building
- **Data registries**:
  - `m_ExistingItemData` — all `ItemData` loaded from `Resources/Prefabs/Items`
  - `m_AllowedItems` — prison-filtered subset
  - `m_KeyItems` — items with `KeyFunctionality`
  - `m_CoolItems` (public, purpose unclear — possibly for 'cool' item tracking)
- **Magic AI items**: 5 reserved `ItemData` refs for repair/destroy wall/ground/vent
- **Request/Response system**: `AssignItemRPC(ownerID, itemDataID, callback, ref requestID, trackingContainerId)`
  - Uses `REQUEST_ID` counter, `OnItemRequestResponseList` dictionary
  - Master client finds free slot, calls `CreateItemRPC` → `RPC_CreateItem` all-clients
  - Response callback fires via `RPC_ItemResponse`
- **Key methods**:
  - `AssignKeyRPC(ownerID, colour, callback, ref requestID)` — creates key by colour
  - `RequestReleaseItem(item)` — returns to free pool (master only, or RPC to master)
  - `MASTER_ReleaseItemRPC(netviewID)` — handles tracked container reinsertion, contraband cleanup, covering tile reset
  - `GetItemDataWithID(id)` — lookup from `m_ExistingItemData` or fallback `m_AllowedItems`
  - `GiftEquipedItemRPC` / `GiftItemsRPC` — gifting with opinion modifier/money
  - `Serialize()` / `DeserializeItems()` — persistence with `BitField` (12-bit viewID, 11-bit itemDataID, 7-bit health, 3-bit location type, etc.)
  - `SpecialInit()` / `CreatePool()` / `BuildCreatePool(recipes)` — three pool-building paths depending on level config
  - `ValidateItems()` — debug/analysis pass scanning used pool for orphan items
- **Tracking**: `m_TrackedItems_ItemToContainer` / `m_TrackedItems_ContainerToItems` dicts for respawn-into-container logic

### ItemContainer (`Assembly-CSharp/ItemContainer.cs`)
- **Base**: `T17MonoBehaviour`
- **Container types enum**: `Desk`, `DeskGuard`, `DeskInmate`, `Inmate`, `Guard`, `Dog`, `Toilet`, `Vendor`, `Job`, `SwagBag`, `Level`, `LevelObject`, `SolitaryKeys`, `Cutlrey`, `Bed`
- **Capacity**: `m_MaxSize` (default 4), `m_MaxHiddenSize` (default 2)
- **Dual compartments**: `m_ItemObjects` (visible) and `m_HiddenItemObjects`
- **Initialization**: items spawned from `m_StartingItems`, `m_TrackedItems`, `m_RandomGroups` with percentage weights
- **Events**: `OnItemAddedEvent`, `OnItemRemovedEvent`, `OnItemsChangedEvent`
- **Lock**: `m_bIsLocked` / `GrabLock()` / `ReleaseLock()` / `IsNetObjectLocked()`
- **Key methods**:
  - `AddItemRPC(item, intoHidden)` — master-client RPC chain
  - `RemoveItemRPC(item, releaseToManager)` — RPC-synced removal
  - `LOCAL_AddItemToContainer(theItem, bHidden)` — local-only add; triggers tutorials, key setup, owner clearing
  - `MoveItemsToAnotherContainer(destCon)` / `MoveItemToAnotherContainerRPC` — bulk/move operations
  - `CyclicalAdd_AllRPC(item, intoHidden)` — drops oldest item if full (first-in-first-out ejection)
  - `SwitchItemCompartmentToMainRPC` / `SwitchItemCompartmentToHiddenRPC` — hide/show transfer
  - `RefreshItems()` — master-only; removes all non-quest/non-key items, respawns from random groups with weighted percentages
  - `ConsiderRefreshingItems()` — per-`ContainerType` refresh logic (checks desk lock, bed restock)
  - `TryDestroyOneItem()` / `GetItemToDestroy()` — eviction policy (avoids tracked, quest, covering-tile items)
  - `HasOneOfEachItem`, `HasItem`, `HasItemWithFunctionality`, `HasContrabandItems`, `HasQuestItems`, `HasKeyItem` — query helpers
  - `FindFirstContrabandDeskItemContainer()` — static helper to locate contraband desk
- **Gizmos**: debug key icons per container in editor

### ItemContainerManager (`Assembly-CSharp/ItemContainerManager.cs`)
- Singleton managing all `ItemContainer` instances grouped by `ItemContainerType`
- `AddItemContainer`, `RemoveItemContainer`, `GetContainers(type)`
- Handles `RecordDeskItem` / `CheckForDuplicateItems` for spawn limit enforcement

### CraftManager (`Assembly-CSharp/CraftManager.cs`)
- **Base**: `MonoBehaviour`
- **Singleton**: static `m_TheInstance`
- **Recipe list**: `m_Recipes` (serialized), `m_LiveRecipes` (prison-filtered at runtime)
- **Recipe inner class** (`CraftManager.Recipe`):
  - `m_Product` (ItemData)
  - `m_Ingredients[3]` (ItemData[])
  - `m_IngredientsToBeDestroyed[3]` (bool[]) — per-ingredient consume flag
  - `m_PrisonMask` (flags)
  - `m_Intellect` (int, default 10) — crafting requirement
  - `m_CraftedCount` (int) — persisted
  - `m_bHidden`, `m_bDiscovered` (bool) — hidden recipe mechanic
  - `GetIngredientCount()`, `GetDestroyableIngredientCount()`
- **CraftInfo struct**: removal info array + destination container + recipe + photon player + game player view id
- **Key methods**:
  - `CreateLiveList()` — filters recipes by prison mask + ingredient allowlist
  - `GetRecipeForProduct(itemData)` / `GetRecipeForProduct(int)` / `GetRecipeByID(id)` — lookups
  - `HasItemsForRecipe(index, container, ref indices)` — checks container + equipped item; uses `m_UniqueList[8]` scratch array for dedup
  - `GetCraftingIndiciesForRecipe(recipe, ref removalInfos, sourceContainers)` — builds removal info across multiple containers; nulls off matched ingredients
  - `GetRecipeIDFromItems(i1, i2, i3)` — matches 1-3 ingredients to any recipe
  - `HasItemsForAnyRecipe(container)` — O(n³) search (triple nested loop)
  - `ReplaceWithPreferredItems(container, count, ref indices, preferred)` — substitutes preferred container indices
  - `HaveCraftedRecipe(recipe)` — persists craft count to `GlobalSave`
  - `DiscoverHiddenItem(recipe)` — persists discovery
  - `LoadData()` — loads all persisted craft data
- **Save keys format**: `"Craft:R:{productName}{ingredientName[0]}"`, `"Craft:Total"`, `"Craft:Discovered:{...}"`

### BaseItemFunctionality (`Assembly-CSharp/BaseItemFunctionality.cs`)
- **Base**: `ScriptableObject`
- **Abstract** — 20 concretions
- **Functionality enum**: `None = -1`, `Key`, `Dig`, `UNUSED_01`, `Chip`, `Cut`, `Unscrew`, `Repair`, `FillHole`, `BraceTunnel`, `StatChange`, `HideContraband`, `Climb`, `Bind`, `CoverTile`, `ItemTransfer`, `Ladder`, `Keycard`, `Sharpen`, `Garden`
- **Fields**: `m_ActionVerb`, direction-specific HUD sprites (4), `m_PressAndHoldForMultipleUses`
- **Events**: `OnStartOfUse`, `OnEndOfUse`
- **Abstract methods**: `Init()`, `RequiresTargetting()`, `RequiresPositioning()`, `ImmobilisesOwner()`, `IsImmediateUse()`, `CanUse(bool intendsOnUsing)`, `GetFunctionalityType()`
- **Virtual methods**: `StartUsing()` (logs GA event), `UpdateUsing()` (ticks animation timer), `CancelUsing()`, `AnimationSinglePlayDone()`, `IsDegradedByDetector()`
- **Helper**: `CheckForCharactersAtTilePosition(row, col, floor)` — overlap box check

### Concrete Functionalities

| File | Enum | Notable Fields |
|------|------|----------------|
| `KeyFunctionality.cs` | Key | `m_KeyColour`, `SubCode`, `IsDurable`, `IsHidden` |
| `DigFunctionality.cs` | Dig | — |
| `ChipFunctionality.cs` | Chip | — |
| `CutFunctionality.cs` | Cut | — |
| `UnscrewFunctionality.cs` | Unscrew | — |
| `RepairFunctionality.cs` | Repair | — |
| `FillHoleFunctionality.cs` | FillHole | — |
| `BraceTunnelFunctionality.cs` | BraceTunnel | — |
| `StatChangerFunctionality.cs` | StatChange | — |
| `ContrabandHiderFunctionality.cs` | HideContraband | — |
| `ClimbFunctionality.cs` | Climb | — |
| `BindFunctionality.cs` | Bind | — |
| `CoverTileFunctionality.cs` | CoverTile | — |
| `TransferItemFunctionality.cs` | ItemTransfer | — |
| `LadderFunctionality.cs` | Ladder | — |
| `KeycardFunctionality.cs` | Keycard | — |
| `SharpeningFunctionality.cs` | Sharpen | — |
| `GardenFunctionality.cs` | Garden | — |
| `WallBlockFunctionality.cs` | — (no enum?) | blocks wall passage |
| `VentCoverFunctionality.cs` | — (no enum?) | covers vent tiles |
| `EscapePrisonFunctionality.cs` | — | ends game |
| `DebugMaterialFunctionality.cs` | — | debug only |

### ItemProcessor Hierarchy

```
ItemProcessorBase (abstract, T17MonoBehaviour)
├── ImmediateItemProcessor (instant convert, e.g. crafting machine)
│   └── MasherItemProcessorInteraction (TransferItemsInteraction wrapper, minigame + hold-to-convert)
└── DelayedPassiveItemProcessor (timer-based processing)
    ├── CookingItemProcessor (oven — overcook/perfect-cook windows, OvenUI HUD)
    └── DelayedPassiveItemProcessorInteraction (TransferItemsInteraction wrapper)

MultistageItemConverter (abstract, separate hierarchy for multi-step conversion)
```

- **ItemProcessorBase** (`ItemProcessorBase.cs`):
  - `m_InputOutputItems` (Dictionary<ItemData, ItemData>) — conversion map
  - `RequestItemCreation(ownerID, itemDataID)` — delegates to `ItemManager.AssignItemRPC`
  - `WillAcceptInput(item)`, `GetInputItemTypes()`, `GetOutputItemTypes()`
  - `NeedsSaving()`, `Serialise/Deserialise` — save/load via `BitField`
- **DelayedPassiveItemProcessor** (`DelayedPassiveItemProcessor.cs`):
  - State machine: `Idle → StartCreateItem → CreatingItem → ProcessingItem → FinishedCreatingItem → Idle` (plus `Interrupted`)
  - `m_ProcessingTime` (float, default 5)
  - `StartProcessingItem(item)` → `CancelProcessing(removeFromProcessor)` → returns `Item`
  - Animator integration: `m_Animator`, `m_StateAnimatorInt`, `m_AnimatorInterruptedTriggerName`
  - State sync: `RPC_SetState(int)` → `Local_SetState(State)`
- **CookingItemProcessor** (`CookingItemProcessor.cs`):
  - Adds `m_CookedLowerBound`, `m_CookedUpperBound` (perfect window)
  - `m_OvercookedItem` (ItemData) — what it becomes if overcooked
  - `Master_UpdateProducedItemForProcessingTime()` — logic to swap item when timer crosses bounds
  - OvenUI per-player: HUD overlay with progress bar and cook state
  - Animator: `m_AnimatorCookingFlag = "IsCooking"`
- **ImmediateItemProcessor** (`ImmediateItemProcessor.cs`):
  - Instant conversion to recipient character
  - `ConvertItemForCharacter(inputItem, character)` → creates item, adds to container or equips
- **MasherItemProcessorInteraction** (`MasherItemProcessorInteraction.cs`):
  - Adds minigame: `m_NumRepsForCompletion = 5`, `m_TimeForAutoCompletion = 5f`
  - `IMinigameMasher` interface for button-mashing HUD
  - Speech when missing items: `"Text.Emote.ItemNotEquipped"`
- **MultistageItemConverter** (`MultistageItemConverter.cs`):
  - Two-state: `AwaitingInput → AwaitingOutput`
  - Interfaces: `IMultistageTransferInteractionResponder`, `Saveable`, `INetworkLoadable`
  - Abstract callbacks: `OnItemsProduced()`, `OnItemsProducedFailed()`, `OnInputRecieved()`, `OnOutputGiven()`
  - Save data versioned: `SaveData_MultistageItemConverter_V1`

### Carryable Object Interactions

```
InteractiveObject
└── CarryObjectInteraction (physics-based carryable, e.g. boxes)
    └── HazardousCarryableObjectInteraction (requires protective items)

Interface: ICarryableObjectConsumer → CarryableObjectConsumer (receives dropped objects)
```

- **CarryObjectInteraction** (`CarryObjectInteraction.cs`):
  - Static `m_MovedObjects` (Dictionary<int, ulong>) + `m_NetSaveData` — persisted positions
  - `PickUpRPC / RPC_PickUp` → `PutDownRPC / RPC_PutDown` — network pickup/drop
  - `PackIntoULong / Deserialize` — position packed into `BitField` (12-bit viewID + 4-bit floor + X/Y bits)
  - Drop logic: checks adjacent tile for walls, room boundaries, floor clearance
  - `ForceStopInteraction` → `SwagBagManager.FindCleanestPositionInRoom` fallback
- **HazardousCarryableObjectInteraction** (`HazardousCarryableObjectInteraction.cs`):
  - Requires `m_RequiredItems` (List<ItemData>) on character
- **CarryableObjectConsumer** (`CarryableObjectConsumer.cs`):
  - Tag-based acceptance: `m_AcceptedTags` (List<uint>)
  - Events: `InputDroppedOnUsEvent`, `FinishedConsumingEvent`
  - Animator-integrated consumption with `WaitForCurrentClipThenFinishConsuming`

### Inventory UI

- **InventoryItem** (`InventoryItem.cs`) — UI slot component, holds item image, data ID
- **OutfitInventoryItem** / **WeaponInventoryItem** — specialised UI slots
- **PlayerInventoryMenu** — full inventory screen
- **PlayerInventoryHUD** — HUD overlay for quick access
- **TemporaryInventoryMenuBehaviour** — transient menu (used by crafting slot management)
- **ItemCover** — "cover" visual overlay on items
- **ItemEventManager** — event dispatch hub
- **ItemGroupSetting** — grouping logic
- **ItemUpdateController** — `ControlledUpdate` integration

### Crafting UI

- **CraftingMenu** (`CraftingMenu.cs`):
  - Tabbed recipe browser: `OpenRecipePage(page)` — filtered by intellect range (30-39, 40-49, ..., 70+)
  - `m_HoldToCraftLength = 1f`, `m_RecipeButtonClickLength = 0.1f`
  - `m_RecipeSlots` (10 per page), `m_TabUnderlineGraphic` / `m_TabUnderlineSprites`
  - `PopulateRecipeSlots(page)` — iterates live recipes, checks HasItemsForRecipe, sets alpha for unavailable
  - `SelectBestItemsForRecipe()` — prefers quest-group items, then non-quest
  - `ExecuteCraft(recipeSlotID)` — intellect check → remove ingredients via RPC → discover hidden recipe
  - Tooltip: `CraftingTooltip` with recipe ingredients, progress bar for hold-to-craft
  - `CraftingMenuTutorial` — tutorial overlay
- **CraftItem** (`CraftItem.cs`) — probably handles individual crafting execution
- **CraftObjective** (`CraftObjective.cs`) — quest objective trigger on craft/deliver

### Random/Selection Utilities

- **RandomItemGroup** (`RandomItemGroup.cs`):
  - Fisher-Yates shuffle-bag (`m_PoolIndices`, 100 iterations)
  - `GetRandomItem(bUniqueItems)` — with or without replacement
- **SpawnItemLimits** (`SpawnItemLimits.cs`):
  - ScriptableObject (`CreateAssetMenu = "Team17/Items/Create Spawn Item Limits"`)
  - Min/max per `ItemData` (1-20 range)
- **ResourcesItemDataManager** (`ResourcesItemDataManager.cs`):
  - Maps IDs to resource paths for `ItemData` and `RandomItemGroup`
  - Error sentinel: `"::ERROR BAD PATH::"`
- **SignificantItemsStore** (`SignificantItemsStore.cs`):
  - Singleton; `m_ItemsForQuickMoldTutorial` — triggers mold tutorial on pickup

### AI Behaviour Actions

- `PickUpItem.cs` — AI action to pick up an item
- `Pickup.cs` — pickup interaction component
- `UseItem.cs` — AI use action
- `EquipItem.cs` — AI equip action
- `GiveItem.cs` — AI give action
- `RemoveItem.cs` — AI remove action
- `DropCarryableObject.cs` — AI drop carryable action
- `ItemSmokeAnimListener.cs` — smoke animation callback

### Interaction Classes

- `ItemInteraction.cs` — interaction component for generic items
- `ItemSpeechInteraction.cs` — speech-triggered interaction hook
- `CarryInteraction.cs` — carrying interaction logic
- `CarryObjectInteractionDeserialiser.cs` — deserialize carryable state
- `CarriedInputJob.cs` — job handling carried items
- `CarriedObjectDispenser.cs` — dispenses carryable objects
- `CarryItemJobBehaviourInit.cs` — job init for carry tasks
- `CharacterInventoryInteraction.cs` — inventory interaction on characters

---

## Hardcoded Strings

| Value | File(s) | Usage |
|-------|---------|-------|
| `"DynamicMapObject"` | `Item.cs:869` | Layer: ladder items on floor |
| `"Items"` | `Item.cs:903` | Layer: items in inventory |
| `"No ItemData Set"` | `Item.cs:147` | Fallback for `ItemName` getter |
| `"Item_Unused_"` | `ItemManager.cs:327` | Pool item naming convention |
| `"AI_MagicItem_"` | `ItemManager.cs:389` | Magic item naming |
| `"Prefabs/Items"` | `ItemManager.cs:204` | Resources load path |
| `"Text.Emote.ItemNotEquipped"` | `MasherItemProcessorInteraction.cs:53` | Speech key |
| `"Text.Item.ItemName"` | `ItemData.cs:54` | Default localization tag |
| `"Text.Interaction.Use"` | `BaseItemFunctionality.cs:32` | Default action verb |
| `"Text.Crafting.LowIntellect"` | `CraftingMenu.cs:900` | Craft failure speech |
| `"::ERROR BAD PATH::"` | `ResourcesItemDataManager.cs:40,50` | Error sentinel |
| `"Hotkey_CraftingMenu"` | `CraftingMenu.cs:68` | Rewired input action |
| `"Craft:R:"` | `CraftManager.cs:604` | Save key prefix |
| `"Craft:Total"` | `CraftManager.cs:607` | Save key |
| `"Craft:Discovered:"` | `CraftManager.cs:613` | Save key |
| `"IsCooking"` | `CookingItemProcessor.cs:20` | Animator bool |
| `"ProcessorState"` / `"InterruptProcessing"` | `DelayedPassiveItemProcessor.cs:30-32` | Animator params |
| `"HoldSpecialAnim"`, `"AnimState"`, `"SpecialToIdle"` | `DelayedPassiveItemProcessor.cs:231-234` | Animator params |
| Layer `"Items"` | `Item.cs:903` | On pickup |
| Layer `"DynamicMapObject"` | `Item.cs:869` | On drop |
| `"UI_Submit"` | `CraftingMenu.cs:782` | Rewired input |
| `"Gizmo_Key.png"`, `"Gizmo_KeyCyan.png"` etc. | `ItemContainer.cs:1312-1328` | Editor Gizmos |

---

## Mod Hook Opportunities

| Hook Point | Type | File |
|-----------|------|------|
| `ItemManager.OnItemRequestResponseList` | Dictionary<int, ItemManagerEvent> | `ItemManager.cs:54` |
| `ItemManager.OnQuestItemDestroyed` | Event | `ItemManager.cs:66` |
| `Item.OnItemContainerChanged` | Event | `Item.cs:283` |
| `Item.OnQuestItemStatusChanged` | Event | `Item.cs:285` |
| `ItemContainer.OnItemAddedEvent` | Event | `ItemContainer.cs:76` |
| `ItemContainer.OnItemRemovedEvent` | Event | `ItemContainer.cs:78` |
| `ItemContainer.OnItemsChangedEvent` | Event | `ItemContainer.cs:80` |
| `BaseItemFunctionality.OnStartOfUse` | Event | `BaseItemFunctionality.cs:43` |
| `BaseItemFunctionality.OnEndOfUse` | Event | `BaseItemFunctionality.cs:45` |
| `CraftManager.OnItemCrafted` | Static Event | `CraftManager.cs:77` |
| `CarryableObjectConsumer.InputDroppedOnUsEvent` | Event | `CarryableObjectConsumer.cs:31` |
| `CarryableObjectConsumer.FinishedConsumingEvent` | Event | `CarryableObjectConsumer.cs:33` |
| `CreateAssetMenu("Team17/Items/Create New Item")` | Editor integration | `ItemData.cs:6` |
| `CreateAssetMenu("Team17/Items/Create Spawn Item Limits")` | Editor integration | `SpawnItemLimits.cs:5` |
| All `BaseItemFunctionality.StartUsing` (virtual) | Override | `BaseItemFunctionality.cs:95` |
| `ItemProcessorBase.GetPossibleOutputs()` (virtual) | Override | `ItemProcessorBase.cs:94` |
| `ItemProcessorBase.NeedsSaving()` (virtual) | Override | `ItemProcessorBase.cs:137` |
| `DelayedPassiveItemProcessor.Local_SetState()` (virtual) | Override | `DelayedPassiveItemProcessor.cs:199` |
| `DelayedPassiveItemProcessor.GetInitialSpawnItem()` (virtual) | Override | `DelayedPassiveItemProcessor.cs:174` |
| `DelayedPassiveItemProcessor.UpdateProcessingItemState()` (virtual) | Override | `DelayedPassiveItemProcessor.cs:102` |
| `MultistageItemConverter` abstract callbacks (4) | Override | `MultistageItemConverter.cs:57-63` |
| `MasherItemProcessorInteraction.SetupButtonMasher()` (abstract) | Override | `MasherItemProcessorInteraction.cs:24` |
| `ItemContainer.ApplyContainerConfig()` | Override | `ItemContainer.cs:217` |
| `CraftManager.AddNewRecipe()` / `RemoveRecipe()` | Editor tooling | `CraftManager.cs:221-232` |
| `RandomItemGroup.GetRandomItem(bUniqueItems)` | Extensible | `RandomItemGroup.cs:17` |

---

## Bugs & Suspicious Code

- 🐛 **`CraftManager.GetRecipeForProduct` null-safety**: Iterates `m_LiveRecipes` but calls `m_LiveRecipes[i].m_Product.m_ItemDataID` without null-check on `m_Product` despite logging "No final product" — will NPE if product is null (`CraftManager.cs:149`)
- 🐛 **`ItemContainer.RemoveAllItems` hidden list bug**: Iterates `m_HiddenItemObjects` but uses `m_ItemObjects[j]` instead of `m_HiddenItemObjects[j]` for the `if` conditions (`ItemContainer.cs:902`). Keys and conditions refer to the wrong list.
- 🐛 **`CraftingMenu.ExecuteCraft` hidden recipe logic**: `if (recipeByID != null || recipeByID.m_bHidden)` — if `recipeByID` is null, the `||` short-circuit prevents NPE, but if it's non-null, `DiscoverHiddenItem` is called unconditionally for all recipes, not just hidden ones. This means every craft discovery runs always. (`CraftingMenu.cs:928-931`)
- 🐛 **`CraftManager.GetCraftingIndiciesForRecipe`**: `recipe.m_Ingredients.CopyTo(array, 0)` creates a shallow array copy, but `HasItemsForRecipe` mutates `recipeItems[i] = null` when `nullOffRecipeItems` is true — this modifies the **original** recipe's ingredient array permanently, making subsequent crafts fail silently. (`CraftManager.cs:318,436`)
- 🐛 **`ItemContainer.RPC_AddItem` empty try-catch**: `try { ... } catch { }` in `MultistageItemConverter.StartedFromSnapshot` (`MultistageItemConverter.cs:333-337`) and `ItemManager.DeserializeSave` (`ItemManager.cs:1396`) swallows all JSON parse errors.
- 🐛 **`ItemProcessorBase.GetOutputItem`**: If `m_InputOutputItems` has a null key it logs `LogGoogleException` but continues looping (`ItemProcessorBase.cs:127`). A null key should probably be removed instead.
- ⚠️ **`ItemManager.RPC_AssignItemRPC`**: The `RPCID` parameter ordering is non-standard (first param, not last) compared to other RPCs in the codebase (`ItemManager.cs:461`)
- ⚠️ **`CraftManager.m_UniqueList`**: Fixed size `int[8]` but `m_Ingredients` is `ItemData[3]` and there are 3 ingredient slots — 8 is over-allocated but `GetCraftingIndiciesForRecipe` passes `usingItemIndices` of size `new int[8]` — potential silent overflow if ingredients > 3? No, max is 3.
- ⚠️ **`ItemContainer.RPC_MoveItemsToAnotherContainer`**: First item gets priority-equipped to character if equipped slot is empty; the rest go to container. This means drag-all-move from a desk auto-equips whatever is first in visual order, which may surprise the player.
- ⚠️ **`CookingItemProcessor.Master_UpdateProducedItemForProcessingTime`**: The master still runs `UpdateProcessingItemState()` via `Update` monobehaviour loop but the timer is already incremented in `base.UpdateProcessingItemState()` — double timer tick on master? No — the base `DelayedPassiveItemProcessor.UpdateProcessingItemState` increments `m_ProcessingTimer`, and `CookingItemProcessor` calls `base.UpdateProcessingItemState()` then also runs `Master_UpdateProduced...` which triggers another update — but the timer is only incremented in the base, so Master_Update... just checks the timer at the new value. Not a bug, but fragile coupling.
- ⚠️ **`ResourcesItemDataManager`**: Uses `Start()` to set singleton, not `Awake()` — race condition if other components access it in Awake.
- ⚠️ **`SignificantItemsStore`**: `m_ItemsForQuickMoldTutorial` is named for "Mold" but the method is `ShouldItemTriggerQuickMoldTutorial` — likely intended as "QuickMold" not "QuickMold"?

---

## Dependencies

| Dependency | Used By | Purpose |
|-----------|---------|---------|
| `T17NetView` / `PhotonView` | All networked files | RPC sync, viewID finding |
| `T17MonoBehaviour` / `T17BehaviourManager` | Item, ItemContainer, ItemProcessorBase | Init lifecycle, manager registration |
| `UpdateManager` | Item, DelayedPassiveItemProcessor, ItemManager | `ControlledUpdate`, deltaTime |
| `ItemManager` (singleton) | Everything | Item creation/release/lookup |
| `ItemContainerManager` (singleton) | ItemContainer | Container registry |
| `CraftManager` (singleton) | CraftingMenu, ItemManager | Recipe data, craft checks |
| `FloorManager` (singleton) | Item, CarryObjectInteraction, ItemManager | Tile grid, floor queries |
| `RoomManager` (singleton) | ItemContainer, CarryObjectInteraction | Room lookup, contraband desk |
| `AIEventManager` (singleton) | Item, ItemManager | Contraband alerts, tile coverage |
| `LevelScript` (singleton) | ItemManager, ItemContainer | Prison config, item list, drop handling |
| `ConfigManager` (singleton) | ItemManager, ItemContainer | Runtime overrides (ItemDataConfig, ItemContainerConfig) |
| `QuestManager` (singleton) | Item, CraftingMenu | Quest item tracking, group scoring |
| `TutorialManager` (singleton) | ItemContainer, CraftingMenu | Tutorial triggers |
| `OpinionManager` (singleton) | ItemManager | Gift value modifier |
| `SpeechManager` (singleton) | MasherItemProcessorInteraction, CraftingMenu | Character speech |
| `HUDMenuFlow` (singleton) | CookingItemProcessor | Oven UI, splitscreen |
| `GlobalSave` (singleton) | CraftManager | Persistence |
| `JobsManager` (singleton) | CookingItemProcessor | Kitchen job employee check |
| `SwagBagManager` (singleton) | CarryObjectInteraction | Fallback position finder |
| `DoorManager` (singleton) | ItemContainer | Key re-setup |
| `EffectManager` (singleton) | ItemManager | Opinion change VFX |
| `ScoreManager` | CraftingMenu | Craft scoring event |
| `CameraManager` (singleton) | CraftingMenu | Tooltip scaling |
| `CullingObjectCollector` (singleton) | Item | Render culling |
| `NavMeshUtil` | Item, CarryObjectInteraction | Navmesh position queries |
| `NetLoadManagerSync` | ItemManager, MultistageItemConverter | Network state sync |
| `PrisonSnapshotIO` | ItemContainer, ItemManager | Save data detection |
| `SaveHelpers.BitField` | ItemManager, ItemProcessorBase, CarryObjectInteraction, MultistageItemConverter | Binary serialization |
| `JsonUtility` | ItemManager, MultistageItemConverter | JSON save/load |
| `T17RewiredStandaloneInputModule` | CraftingMenu | Controller detection |
| `T17EventSystemsManager` | CraftingMenu | Event system per-gamer |
| `T17TabPanel`, `T17Button`, `T17Image`, `T17Text` | CraftingMenu | UI components |
| `Localization` (static) | Item | Display name lookup |
| `GoogleAnalyticsV3` | BaseItemFunctionality | Item usage analytics |
| `StatSystem` | ItemManager | Stats tracking (tea item) |
| `ConfigManager` | ItemManager, ItemContainer | Runtime config overrides |
