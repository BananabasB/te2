# The Escapists 2 — UI, Menus & HUD System Reference

> Source: `Assembly-CSharp/` (decompiled, global namespace).  
> Base: `T17MonoBehaviour : MonoBehaviour` (wraps common T17 lifecycle).  
> Input: Rewired + `Team17UIInputModule` with per-gamer `T17EventSystem`.  
> Localization: `T17Text.SetLocalisedTextCatchAll()` with tags like `"Text.UI.ShadowsOff"`.  
> Persistence: `GlobalSave` with string keys (e.g. `"Settings:VSync"`, `"Audio:MusicVol"`).

---

## 1. Architecture Overview

```
GlobalStart
 ├─ BootFlow
 ├─ LoadingFlow
 ├─ FrontEndFlow (BaseFlowBehaviour)
 │   ├─ FrontendRootMenu (RootMenu)
 │   └─ EditorRootMenu (RootMenu)
 ├─ LevelFlow
 ├─ InGameMenuFlow (BaseFlowBehaviour)
 │   └─ InGameRootMenu (RootMenu) × N players
 ├─ HUDMenuFlow (BaseFlowBehaviour)
 │   └─ HUDRootMenu (RootMenu) × N players
 └─ ResultsFlow (BaseFlowBehaviour)
      └─ ResultsRootMenu (RootMenu)
```

Each **RootMenu** owns a `T17TabPanel` + a `Dictionary<enum, MenuList_Container>`. Switching the active type (e.g. `FrontendMenuTypeToOpen.Campaign`) repopulates the tab panel's bodies and shows the default tab.

---

## 2. Flow System

### `BaseFlowBehaviour : T17MonoBehaviour`
- `Assembly-CSharp/BaseFlowBehaviour.cs`
- `m_FlowType` (`FlowType` enum): `NotSet`, `Boot`, `Loading`, `Frontend`, `Level`, `HUD`, `InGameMenu`, `Results`
- Registers with `GlobalStart` via `HookUpFlow()`; signals completion via `SignalDoneWithFlow()`.

### `FrontEndFlow : BaseFlowBehaviour`
- `Assembly-CSharp/FrontEndFlow.cs`
- **Enum `MenuType`**: `GameFrontend`, `LevelEditor`, `Unassigned`
- **Private `MODE`**: `MODE_INIT` → `MODE_SHOW_MENUS`/`MODE_SHOW_LEVEL_EDITOR` → `MODE_RUNNING`
- Singleton `Instance`
- Owns `FrontendRootMenu m_MainMenu`, `EditorRootMenu m_EditorMenu`
- Manages background video drone (`VideoDrone`), slide-in/out animations, frontend music
- Key methods: `StartFrontEnd()`, `StartEditorFrontEnd()`, `SwitchToFrontEndMenuType()`, `ShowMenus()`, `HideMenus()`, `ToggleBackgroundVideo()`
- Routes: restores previous `FrontendUserPath` (versus lobby return, etc.)

### `InGameMenuFlow : BaseFlowBehaviour`
- `Assembly-CSharp/InGameMenuFlow.cs`
- Singleton `Instance`
- `List<PlayerIGMData> m_PlayersIGMData` — one per camera/splitscreen slot
- **`PlayerIGMData`** nested class holds per-player references:
  - `Canvas m_ParentObject`, `InGameRootMenu m_PlayerRootMenu`
  - `MainMapMenu m_Map`, `CalendarMenu m_Calendar`, `JobBoardMenu m_JobBoard`
  - `PayphoneMenu m_Payphone`, `PlayerSelectMenu m_PlayerSelect`
  - `PauseMenu m_PauseMenu`, `GuardBoard m_GuardBoardMenu`
  - `InformationBoard m_InformationBoardMenu`, `SignPost m_SignPostMenu`
  - `BedSaveMenu m_BedSaveMenu`, `JobTutorialMenu m_JobTutorialMenu`
  - `PlayerInventoryMenu PlayerInventory` (lazy getter)
  - `OpenMenuCount` tracks stacked menus; `AnyMenusOpen` / `ClickOffCloseContainer()`
  - `HideActiveMenus()` hides all child menus
- Dynamically instantiates IGM canvases for splitscreen (3-4 players)
- Resizes/positions each per-player canvas from `HUDItemsLayout` data
- Input categories: `InputCateogryStates.InGame`, `InGameMenu`, `InGamePaused`, `InGameMainMap`
- Open/hide methods: `OpenMenu()`, `HideMenu()`, `OpenMap/HideMap`, `OpenCalendar/HideCalendar`, `OpenJobsBoard/HideJobsBoard`, `OpenGuardBoard/HideGuardBoard`, `OpenInformationBoard/HideInformationBoard`, `OpenPayphone/HidePayphone`, `OpenPauseMenu/HidePauseMenu`, `OpenPlayerSelect/HidePlayerSelect`, `OpenSignPost/HideSignPost`, `OpenBedSave/HideBedSave`, `OpenJobTutorialBoard/HideJobTutorialBoard`

### `HUDMenuFlow : BaseFlowBehaviour`
- `Assembly-CSharp/HUDMenuFlow.cs`
- Singleton `Instance`
- `List<PlayerHUDData> m_PlayersHUDData` — one per player
- **`PlayerHUDData`** nested class holds per-player HUD refs:
  - `Canvas m_ParentObject`, `Canvas m_WorldSpace_ParentObject`
  - `HUDRootMenu m_PlayerRootMenu`, `UIAnimatedEffectController m_FadeEffects`
  - `RoutineAndTimeTrackerHUD m_MiniMapParent`, `FloorIndicatorHUD m_FloodIndicator`
  - `PlayerInventoryHUD PlayerInventory` (lazy), `PlayerSolitaryHUD PlayerSolitaryHUD` (lazy)
  - `ObjectiveTrackerHUD m_PlayerObjectiveTrackedHUD`, `TutorialSpeechHUD m_TutorialSpeechHUD`
  - `ChatFeedHUD m_ChatFeedHUD`, `PerPlayerTrackedUIElements PerPlayerTrackedItems`
  - `Camera m_PlayerCamera`, `T17RawImage m_PIPImage`
  - Tutorial popup state: `ActivePopupInstance`, `PopupTimer`
- Creates world-space canvases per floor (`WorldCanvasTrackedUIElements`)
- Manages split-screen HUD layout via `SplitscreenHUDHandler` + `HUDItemLayoutGroup`/`HUDItemsLayout`
- Speech-bubble facade-shift test (`DoShiftTestForSpeechBubble`) for multi-floor visibility
- Methods: `OpenPlayerHUD()`, `HideMenu()`, `HideAllHUDs/ShowAllHUDs`, `Add/RemoveMouseHUDItem()`, `ShowPopupDialogue()`, `PlayGlobalEffect()`

### `ResultsFlow : BaseFlowBehaviour`
- `Assembly-CSharp/ResultsFlow.cs`
- Singleton `Instance`
- Owns `ResultsRootMenu m_MainMenu`
- `MODE`: `MODE_INIT` → `MODE_SHOW_MENUS` → `MODE_RUNNING`
- Picks `CoopResults` vs `VersusResults` based on `ConfigManager.gameType`
- `ReturnToMainMenu()` / `ReturnToLobby()` set exit flag + frontend route

---

## 3. Root Menu Hierarchy

### `RootMenu : BaseMenuBehaviour`
- `Assembly-CSharp/RootMenu.cs`
- **`RootMenuType`**: `FrontEnd`, `InGame`, `HUD`, `Results`, `LevelEditor`
- `T17TabPanel m_MainTabPanel` — drives body switching
- `LegendButtonsManager m_LegendButtonsManager`
- `MenuList_Container` — groups of `BaseMenuBehaviour` per tab, with `m_DefaultTab`
- `EditorHack_BaseMenuBehaviour[] m_EditorTabAbleMenuTypes` — serialised tab-mapping from editor
- `TextFontTypes m_FontTypesForRootMenu` — applies fonts to all `T17Text` children
- `PlayerInventoryMenu m_PlayerInventoryOnThisRoot`
- `InitializeData()` collects all child `BaseMenuBehaviour`/`IT17EventHelper`, applies fonts, calls `DoSingleTimeInitialize()` on each
- `Show()` sets `IT17EventHelper` gamers, shows player inventory, updates legends
- `SetGamePlayerForMenus()` propagates `Player` to all child menus

### `FrontendRootMenu : RootMenu`
- `Assembly-CSharp/FrontendRootMenu.cs`
- **`FrontendMenuTypeToOpen`**: `MainMenu`, `Campaign`, `Versus`, `BrowseGamesMenu`, `PrisonSetupMenu`, `Customization`, `Collectables`, `Leaderboards`, `Settings`, `Credits`, `Shop`, `Editor`
- `Dictionary<FrontendMenuTypeToOpen, MenuList_Container> m_FrontEndTabableMenuTypes`
- `m_PCBackButton` — shown/hidden based on last active controller type
- `SetFrontEndMenuTypeToOpen()` handles online-area exit for non-online menus
- `OpenFrontendChildOfCurrent()` opens sub-menus (index > 0)
- `PromptGameExit()` shows T17DialogBox quit confirmation

### `EditorRootMenu : RootMenu`
- `Assembly-CSharp/EditorRootMenu.cs`
- **`EditorMenuTypeToOpen`**: `EditorHomepageMenu`, `MyPrisonsMenu`, `BrowseGamesMenu`, `SubscribedMenu`, `PrisonSetupMenu`
- Singleton `m_Instance`
- `ReturnToNormalFrontend()` delegates to `FrontEndFlow.Instance.StartFrontEndFromLevelEditor()`

### `InGameRootMenu : RootMenu`
- `Assembly-CSharp/InGameRootMenu.cs`
- **`InGameMenuTypeToOpen`**: `MainSelf`, `Inmate`, `DownedInmate`, `FavourInmate`, `ShopInmate`, `Guard`, `DownedGuard`, `Desk`, `Toilet`, `SwagBag`, `Cutlrey`, `RobinsonFavour`, `RobinsonContinueFavour`
- `Dictionary<InGameMenuTypeToOpen, MenuList_Container> m_InGameTabableMenuTypes`
- `m_EnabledMenuTypeMask` — bitmask of `InGameMenuTypes` flags
- `CheckMenuEnabled()` / `SetMenuEnabled()` control per-menu visibility
- `HasPanelsToShow()` checks if any panel in a type set is enabled
- Shows/hides `TabLeft`/`TabRight` based on panel count

### `HUDRootMenu : RootMenu`
- `Assembly-CSharp/HUDRootMenu.cs`
- **`HUDMenuTypeToOpen`**: `PlayerInfo`, `PlayerInfoTutorial`
- `Dictionary<HUDMenuTypeToOpen, MenuList_Container> m_HUDMenuTypes`
- `Show()` — if no `m_MainTabPanel`, shows all menus in the set simultaneously

### `ResultsRootMenu : RootMenu`
- `Assembly-CSharp/ResultsRootMenu.cs`
- **`ResultsMenuTypeToOpen`**: `CoopResults`, `VersusResults`
- `Dictionary<ResultsMenuTypeToOpen, MenuList_Container> m_ResultMenuTypes`

---

## 4. Base Menu Classes

### `BaseMenuBehaviour : T17MonoBehaviour, IMenuEventDelegate`
- `Assembly-CSharp/BaseMenuBehaviour.cs`
- **`InGameMenuTypes`** flags enum: `UnSet = -1`, `SelfCharacterInfo = 1`, `CraftingMenu = 2`, `JournalFavours = 4`, `JournalTips = 8`, `ControlsMenu = 16`, `SettingsMenu = 32`, `InmateCharacterInfo = 64`, `InmateGifting = 128`, `InmateShop = 256`, `InmateFavour = 512`, `InmateLooting = 1024`, `DeskInventory = 2048`, `ToiletInventory = 4096`, `SwagBagInventory = 8192`, `CutlreyInventory = 16384`, `MAX = 16385`
- `Player CurrentGamePlayer`, `Gamer CurrentGamer`, `Rewired.Player CurrentRewiredPlayer` — derived from current gamer
- `T17EventSystem CachedEventSystem` — per-gamer event system
- `Selectable m_Top/Bottom/Left/RightSelectable` — navigation anchors for tab-panel linking
- `Sprite m_TabIcon` / `m_TabIconDisabled`
- `NavigateOnUICancel m_NavigateOnUICancel` — invoked on `UI_Cancel` input
- `Animator m_TransitionAnimator` — forward/back transition triggers
- `m_bShouldBlockParentCancelHandler` — when true, parent's cancel handling is suppressed while child is open
- `AllowedCancelHandlers` — static counter
- `m_LegendTextItem` / `m_LegendLocalisationTag` / `m_LegendIconData` — legend/button-hint system
- `Show()` sets gamer, manages cancel-blocking, shows game object, fires `MenuChangedEvent`
- `Hide()` restores invoker state, cleans up children, fires `OnHide`
- Child menu tracking: `AddChildMenu()`, `OnChildHide()`, `GetChildMenus()`
- Transition: `PlayForwardTransition()`, `PlayBackTransition()`, `IsTransitionInProgress()`

### `BaseIngameMenu : BaseMenuBehaviour`
- Base class for overlay menus shown on top of gameplay
- Subclasses: `CraftingMenu`, `LootingMenu`, `PlayerInventoryMenu`, `DeskMenu`, `ToiletMenu`, `SwagBagMenu`, `ControlsMenu`, `SettingsMenu`, etc.

### `BaseIngamePassiveUI : BaseMenuBehaviour`
- Base class for HUD passive UI elements
- `Init(Player player)` called during HUD setup
- Subclasses: `PlayerStatsHUD`, `ProgressBarHUD`, `RoutineAndTimeTrackerHUD`, etc.

### `GameMenuBehaviour : BaseIngameMenu`
- Base class for inventory-interactive menus
- `GameMenuInformation` struct: `m_MenuRepresentative`, `m_MenuRepresentativeContainer`, `m_Player`, `m_PlayerItemContainer`, `m_PlayerInventoryBehaviour`, `m_PlayerInventoryMenu`
- `SetGameMenuInformation()` receives container/player data

### `FrontendMenuBehaviour : BaseMenuBehaviour`
- Base class for frontend menu panels
- `InvokeNavigateOnUICancel()` — called when `UI_Cancel` is pressed in a frontend context

### `BaseOptionItem : BaseMenuBehaviour`
- `Assembly-CSharp/BaseOptionItem.cs`
- Persistent option with dirty tracking: `SetOptionDirty()`, `ApplyOption()`, `ResetOption()`
- Saves/loads via `GlobalSave` with string keys
- Subclasses: `ToggleOptionItem`, `ResolutionOptionItem`, `BlurOptionItem`, `ShadowDetailOptionItem`, `VSyncOptionItem`, `VibrationOptionItem`, `MusicOptionItem`, `SFXOptionItem`, `ProfanityFilterOptionItem`, `InfluencersOptionItem`, `PCControlOptionItem`, `PhotonRegionOptionItem`

### `BaseTooltip : BaseMenuBehaviour`
- Base class for tooltip popups

### `BaseResultsScreen : BaseMenuBehaviour`
- Base for results screens (`Results_CoopMenu`, `Results_VersusMenu`, `Results_CharacterProfile`)

### `BaseContextMenu : BaseMenuBehaviour`
- Base for context menus (e.g. `FriendsContextMenu`)

### `BaseComponentSetup`
- Non-MonoBehaviour utility for component lookup and configuration

---

## 5. T17 Widget Library

### Core Widgets

| Class | File | Description |
|-------|------|-------------|
| `T17Button` | `T17Button.cs` | Extended `Button` with gamer-aware event system, T17 sound events |
| `T17Text` | `T17Text.cs` | Extended `Text` with localization (`SetNewLocalizationTag`), inline icon support (`TextPic`), `m_PCIconOverrideSize`, `m_ImagesAttached` |
| `T17Image` | `T17Image.cs` | Extended `Image` for T17 theming |
| `T17RawImage` | `T17RawImage.cs` | Extended `RawImage` |
| `T17Toggle` | `T17Toggle.cs` | Extended `Toggle` |
| `T17Slider` | `T17Slider.cs` | Extended `Slider` |
| `T17ScrollView` | `T17ScrollView.cs` | Extended `ScrollRect` |
| `T17Scrollbar` | `T17Scrollbar.cs` | Extended `Scrollbar` |
| `T17InputField` | `T17InputField.cs` | Extended `InputField` |
| `T17DropDown` | `T17DropDown.cs` | Extended `Dropdown` |
| `T17Selectable` | `T17Selectable.cs` | Extended `Selectable` base |
| `T17StatsSlider` | `T17StatsSlider.cs` | Slider variant for stats display |
| `T17TabPanel` | `T17TabPanel.cs` | Tab panel with button navigation, cycling, disabled-tab skipping, navigation linking |

### Layout & Containers

| Class | File | Description |
|-------|------|-------------|
| `T17MenuBody` | `T17MenuBody.cs` | Container for a single menu panel |
| `T17NavigableGrid` | `T17NavigableGrid.cs` | Grid navigation helper |
| `T17AspectRatioFitter` | `T17AspectRatioFitter.cs` | Aspect-ratio-aware resizer |

### Overlays & Dialogs

| Class | File | Description |
|-------|------|-------------|
| `T17DialogBox` | `T17DialogBox.cs` | Confirmation/decline/cancel dialog with `OnConfirm`/`OnDecline` events |
| `T17DialogBoxManager` | `T17DialogBoxManager.cs` | Manages dialog queue per-gamer (`HasDialogsForGamer()`, `GetDialog()`) |
| `T17TooltipManager` | `T17TooltipManager.cs` | Tooltip display manager |
| `T17ItemTooltip` | `T17ItemTooltip.cs` | Inventory item tooltip |

### UI Helpers

| Class | File | Description |
|-------|------|-------------|
| `T17CounterObject` | `T17CounterObject.cs` | Numeric counter display |
| `T17FavourObject` | `T17FavourObject.cs` | Favour/relationship display |
| `T17HintObject` | `T17HintObject.cs` | Hint/notification display |
| `T17InfoObject` | `T17InfoObject.cs` | General info display |
| `T17TrackedUIElement` | `T17TrackedUIElement.cs` | World-space tracked element (speech bubbles, nameplates) |
| `T17UIAlphaFade` | `T17UIAlphaFade.cs` | Alpha fade animation |
| `T17IconManager` | `T17IconManager.cs` | Icon management utility |
| `T17OverTrigger` | `T17OverTrigger.cs` | Hover/over event trigger |
| `T17BehaviourManager` | `T17BehaviourManager.cs` | Behaviour lifecycle manager |

### Event System

| Class | File | Description |
|-------|------|-------------|
| `T17EventSystem` | `T17EventSystem.cs` | Per-gamer event system with `InputCateogryStates` and `ApplyCategories()` |
| `T17EventSystemsManager` | `T17EventSystemsManager.cs` | Singleton manager; `GetEventSystemForGamer()` |
| `T17UISelectDeselectEvents` | `T17UISelectDeselectEvents.cs` | Selection event hooks |
| `T17UIPointerOverExitEvents` | `T17UIPointerOverExitEvents.cs` | Pointer enter/exit events |
| `T17BlockKeyboardAutoFocus` | `T17BlockKeyboardAutoFocus.cs` | Blocks automatic keyboard focus |
| `T17RewiredStandaloneInputModule` | `T17RewiredStandaloneInputModule.cs` | Rewired input module, clears previous selectables |
| `Team17UIInputModule` | `Team17UIInputModule.cs` | Custom UI input module |
| `T17ControlMapper` | `T17ControlMapper.cs` | Rewired control remapping UI |
| `T17Regex` | `T17Regex.cs` | Input validation regex helpers |

### Input Categories (`InputCateogryStates`)
- `Frontend`
- `InGame`
- `InGameMenu`
- `InGamePaused`
- `InGameMainMap`
- `InGameMouseOnHUD`
- `Loading`

---

## 6. Frontend Menus

All frontend menu classes extend `FrontendMenuBehaviour : BaseMenuBehaviour`.

| Menu | File | Description |
|------|------|-------------|
| `MainFrontendMenu` | `MainFrontendMenu.cs` | Main title screen (Play, Editor, Settings, Quit) |
| `CampaignFrontendMenu` | `CampaignFrontendMenu.cs` | Campaign/co-op prison selection |
| `CoopFrontEndMenu` | `CoopFrontEndMenu.cs` | Cooperative mode lobby/setup |
| `VersusFrontendMenu` | `VersusFrontendMenu.cs` | Versus mode menu |
| `VersusLobbyFEMenu` | `VersusLobbyFEMenu.cs` | Versus lobby with player slots |
| `PrivateVersusFEMenu` | `PrivateVersusFEMenu.cs` | Private versus game setup |
| `PublicVersusFEMenu` | `PublicVersusFEMenu.cs` | Public versus matchmaking |
| `SelectPrivateVersusFEMenu` | `SelectPrivateVersusFEMenu.cs` | Private versus selection |
| `BrowseGamesFrontendMenu` | `BrowseGamesFrontendMenu.cs` | Browse available online games |
| `SettingsFrontendMenu` | `SettingsFrontendMenu.cs` | Settings hub (controls, video, audio, gameplay) |
| `DLCStoreFrontendMenu` | `DLCStoreFrontendMenu.cs` | DLC store/listing |
| `CollectablesFrontendMenu` | `CollectablesFrontendMenu.cs` | Collectables viewer |
| `CustomisationFrontendMenu` | `CustomisationFrontendMenu.cs` | Character customisation hub |
| `CustomisationDialogFrontendMenu` | `CustomisationDialogFrontendMenu.cs` | Customisation item selection dialog |
| `CustomisationDialogTabMenu` | `CustomisationDialogTabMenu.cs` | Tab within customisation dialog |
| `CustomisationOptionsFE` | `CustomisationOptionsFE.cs` | Customisation option controls |
| `ShopMenu` | `ShopMenu.cs` | Inmate shop / commissary |
| `ProgressFrontendMenu` | `ProgressFrontendMenu.cs` | Progress tracking (milestones, stats) |
| `LeaderboardsFrontendMenu` | `LeaderboardsFrontendMenu.cs` | Leaderboard display |
| `Credits` | `Credits.cs` | Credits roll |
| `MainEditorFrontendMenu` | `MainEditorFrontendMenu.cs` | Level editor homepage |
| `EditorBrowseGamesMenu` | `EditorBrowseGamesMenu.cs` | Browse community prisons |
| `EditorMyPrisonsMenu` | `EditorMyPrisonsMenu.cs` | My prisons list |
| `EditorPublishMenu` | `EditorPublishMenu.cs` | Publish/submit prison |
| `EditorSubscribedMenu` | `EditorSubscribedMenu.cs` | Subscribed prisons list |
| `SlotSelectionMenu` | `SlotSelectionMenu.cs` | Save slot selection |
| `PrisonSetupMenu` | `PrisonSetupMenu.cs` | Prison startup configuration (difficulty, inmates, etc.) |
| `PlayerSelectMenu` | `PlayerSelectMenu.cs` | Player character selection (split-screen join) |
| `MainMapMenu` | `MainMapMenu.cs` | Full-screen map view |

---

## 7. In-Game (Overlay) Menus

| Menu | File | Base | Description |
|------|------|------|-------------|
| `PauseMenu` | `PauseMenu.cs` | `BaseIngameMenu` | Pause overlay (resume, settings, quit) |
| `SettingsMenu` | `SettingsMenu.cs` | `BaseIngameMenu` | In-game settings (controls, video, audio) |
| `OptionsControlsMenu` | `OptionsControlsMenu.cs` | `BaseIngameMenu` | Control rebinding |
| `OptionsSettingsMenu` | `OptionsSettingsMenu.cs` | `BaseIngameMenu` | Video/audio settings |
| `OptionsHelpMenu` | `OptionsHelpMenu.cs` | `BaseIngameMenu` | Help/controls reference |
| `ControlsMenu` | `ControlsMenu.cs` | `GameMenuBehaviour` | Inventory: player's own inventory |
| `CraftingMenu` | `CraftingMenu.cs` | `GameMenuBehaviour` | Crafting interface |
| `LootingMenu` | `LootingMenu.cs` | `GameMenuBehaviour` | Looting another inmate/container |
| `PlayerInventoryMenu` | `PlayerInventoryMenu.cs` | `GameMenuBehaviour` | Combined inventory panel |
| `SwagBagMenu` | `SwagBagMenu.cs` | `GameMenuBehaviour` | Swag bag inventory |
| `BedSaveMenu` | `BedSaveMenu.cs` | `BaseIngameMenu` | Save game at bed |
| `DeskMenu` | `DeskMenu.cs` | `GameMenuBehaviour` | Desk/container inventory |
| `ToiletMenu` | `ToiletMenu.cs` | `GameMenuBehaviour` | Toilet hiding place inventory |
| `CalendarMenu` | `CalendarMenu.cs` | `BaseIngameMenu` | Calendar / schedule viewer |
| `PayphoneMenu` | `PayphoneMenu.cs` | `BaseIngameMenu` | Payphone (crafting recipes, quests) |
| `FavourMenu` | `FavourMenu.cs` | `GameMenuBehaviour` | Inmate favour interactions |
| `JournalFavoursMenu` | `JournalFavoursMenu.cs` | `BaseIngameMenu` | Favour journal |
| `JournalHintsMenu` | `JournalHintsMenu.cs` | `BaseIngameMenu` | Hints journal |
| `GiftingMenu` | `GiftingMenu.cs` | `GameMenuBehaviour` | Gift items to inmates |
| `RobinsonFavourMenu` | `RobinsonFavourMenu.cs` | `GameMenuBehaviour` | Robinson (quest giver) favour |
| `RobinsonMidQuestFavourMenu` | `RobinsonMidQuestFavourMenu.cs` | `GameMenuBehaviour` | Mid-quest favour |
| `JobBoardMenu` | `JobBoardMenu.cs` | `BaseIngameMenu` | Prison job board |
| `JobTutorialMenu` | `JobTutorialMenu.cs` | `BaseIngameMenu` | Job tutorial step display |
| `GuardBoard` | `GuardBoard.cs` | `BaseIngameMenu` | Guard duty roster/interaction |
| `InformationBoard` | `InformationBoard.cs` | `BaseIngameMenu` | Information notice board |
| `SignPost` | `SignPost.cs` | `BaseIngameMenu` | Sign post (directional/story info) |
| `ShopMenu` | `ShopMenu.cs` | `GameMenuBehaviour` | Inmate commissary shop |
| `PasswordDialogMenu` | `PasswordDialogMenu.cs` | `BaseIngameMenu` | Password entry dialog |

---

## 8. HUD Widgets

| Widget | File | Description |
|--------|------|-------------|
| `HUD` | `HUD.cs` | Root HUD controller |
| `HUDItemsLayout` | `HUDItemsLayout.cs` | Named position/scale configuration for all HUD elements |
| `HUDItemLayoutGroup` | `HUDItemLayoutGroup.cs` | Groups layouts per aspect-ratio; contains `m_MasterWorldHUDScale`, per-player console/PC scales |
| `PlayerInventoryHUD` | `PlayerInventoryHUD.cs` | Quick-access item bar (hotbar) |
| `PlayerStatsHUD` | `PlayerStatsHUD.cs` | Player stats display (health, energy, etc.) |
| `PlayerSolitaryHUD` | `PlayerSolitaryHUD.cs` | Solitary confinement overlay |
| `ProgressBarHUD` | `ProgressBarHUD.cs` | Generic progress bar |
| `NamePlateHUD` | `NamePlateHUD.cs` | Character nameplate |
| `NameTagIconHud` | `NameTagIconHud.cs` | Name tag with icon |
| `SpeechBubbleHUD` | `SpeechBubbleHUD.cs` | Speech bubble (world-space); facade offset support |
| `AlertnessStarHUD` | `AlertnessStarHUD.cs` | Guard alertness indicator |
| `ChatFeedHUD` | `ChatFeedHUD.cs` | Text chat feed |
| `VoiceChatFeedHUD` | `VoiceChatFeedHUD.cs` | Voice chat indicator |
| `TargetHUD` | `TargetHUD.cs` | Targeted character info |
| `EmoteCategoryHUD` | `EmoteCategoryHUD.cs` | Emote wheel category |
| `EmoteDisplayHUD` | `EmoteDisplayHUD.cs` | Emote selection display |
| `IconDisplayHUD` | `IconDisplayHUD.cs` | Generic icon display |
| `JobProgressHUD` | `JobProgressHUD.cs` | Active job progress |
| `FloorIndicatorHUD` | `FloorIndicatorHUD.cs` | Current floor indicator |
| `RoutineAndTimeTrackerHUD` | `RoutineAndTimeTrackerHUD.cs` | Time/routine/minimap display |
| `ObjectiveTrackerHUD` | `ObjectiveTrackerHUD.cs` | Active objective tracker |
| `ObjectiveSubGoalHUD` | `ObjectiveSubGoalHUD.cs` | Sub-goal within an objective |
| `QuestCompletedHUD` | `QuestCompletedHUD.cs` | Quest completion popup |
| `MiniMap` | `MiniMap.cs` | Minimap renderer |
| `TutorialSpeechHUD` | `TutorialSpeechHUD.cs` | Tutorial speech bubble |
| `CustomisationUnlockedHUD` | `CustomisationUnlockedHUD.cs` | Customisation unlock notification |

### HUD Layout Data

`HUDItemsLayout` (in `Assembly-CSharp/HUDItemsLayout.cs`) contains `Vector2` fields for every positioned HUD element:
- `m_MiniMapPosition/Scale`
- `m_StatsPosition/Scale`
- `m_QuestPosition/Scale`
- `m_EmotePosition/Scale`
- `m_BottomRightPosition/Scale`
- `m_VoiceChatFeedPosition/Scale`
- `m_ChatFeedPosition/Scale`
- `m_CentreCanvasPosition/Scale`
- `m_IGMPosition/Scale`
- `m_MaskContainerSize/Position`
- `m_CalendarPosition`
- `m_JobsBoardPosition/Scale`
- `m_PayphonePosition/Scale`
- `m_BedSaveMenuPosition/Scale`
- `m_FullScreenMapKeyOffset/Scale`
- `m_FullScreenMapFloorsOffset/Scale`
- `m_FullScreenMapLegendOffset/Scale`
- `m_InformationMenuPosition/Scale`
- `m_TutorialPopupPosition/Scale`
- `m_FadingCanvasPosition/Scale`

---

## 9. World-Space UI & Tracked Elements

### `WorldCanvasTrackedUIElements`
- Per-floor world-space canvas with object pooling (`m_PoolSize`)
- Contains `T17TrackedUIElement` instances for nameplates, speech bubbles, icons
- `GetUsedAlwaysVisibleElements()` returns active speech bubbles for facade shifting

### `PerPlayerTrackedUIElements`
- Per-player world-space HUD elements (health bars, oven indicators)
- `SetTrackingCamera()` / `SetLayer()` for per-player culling
- `m_OvenHudContainer` reference

### `T17TrackedUIElement`
- Base tracked element attaching to world objects via `Transform AttachedTo`
- `m_SpeechBubble` reference for facade offset management

### `TrackableUIElementsReporter`
- Update controller that reports tracked element positions

### `WorldSpaceHudScalePODO`
- Plain-old-data object for world HUD scaling

---

## 10. UI Effects & Animation

| Class | File | Description |
|-------|------|-------------|
| `UIAnimatedEffect` | `UIAnimatedEffect.cs` | Single animated effect |
| `UIAnimatedEffectController` | `UIAnimatedEffectController.cs` | Controller managing multiple effects per player; `PlayEffect(Enum, float)` |
| `UIAnimatedCoinTicker` | `UIAnimatedCoinTicker.cs` | Coin-count ticker animation |
| `UIAnimatedPagination` | `UIAnimatedPagination.cs` | Pagination dots |
| `UIShimmerManager` | `UIShimmerManager.cs` | Shimmer/highlight effect manager |
| `UIButtonShine` | `UIButtonShine.cs` | Button shine overlay |
| `UIShineRegister` | `UIShineRegister.cs` | Registers shine targets |
| `UICarousel` / `UICarouselBase` | `UICarousel*.cs` | Carousel/scrollable list widgets |
| `TextCarousel` | `TextCarousel.cs` | Carousel for text items |
| `LoopingDragScroll` | `LoopingDragScroll.cs` | Infinite looping scroll |
| `FadeManager` | `FadeManager.cs` | Screen fade controller |
| `CanvasAlphaChanger` | `CanvasAlphaChanger.cs` | Canvas alpha control with `Copy()` for cloned canvases |
| `AnimatedEffectPingPong` | `AnimatedEffectPingPong.cs` | Ping-pong animation |
| `UI_AnimationToRenderTexture` | `UI_AnimationToRenderTexture.cs` | Renders animation to render texture |
| `UI_DrawCharacterToRenderTexture` | `UI_DrawCharacterToRenderTexture.cs` | Character portrait renderer |
| `UI_DrawRenderTextureToRawImage` | `UI_DrawRenderTextureToRawImage.cs` | Displays render texture on RawImage |

---

## 11. UI Carousels & Friend Activity

| Class | File | Description |
|-------|------|-------------|
| `DLCCarousel` | `DLCCarousel.cs` | DLC item carousel |
| `MilestoneCarousel` | `MilestoneCarousel.cs` | Achievement/milestone progression carousel |
| `MilestonePage` | `MilestonePage.cs` | Single milestone page |
| `MilestoneDisplayObject` | `MilestoneDisplayObject.cs` | Milestone display item |
| `PlaylistDataCarousel` | `PlaylistDataCarousel.cs` | Playlist data carousel |
| `UIFriendActivitySlot` | `UIFriendActivitySlot.cs` | Friend activity slot |
| `UIFriendCampaignCarousel` | `UIFriendCampaignCarousel.cs` | Friend campaign progress carousel |
| `UIFriendCampaignArrows` | `UIFriendCampaignArrows.cs` | Friend campaign navigation arrows |
| `UIJoinFriendCarousel` | `UIJoinFriendCarousel.cs` | Join friend game carousel |
| `UIJoinFriendSlot` | `UIJoinFriendSlot.cs` | Join friend slot |
| `FriendsContextMenu` | `FriendsContextMenu.cs` | Friend context menu (invite, join, etc.) |
| `FriendInfo` | `FriendInfo.cs` | Friend data object |
| `ChatFeedManager` | `ChatFeedManager.cs` | Chat message manager |

---

## 12. Settings Options

All options extend `BaseOptionItem`.

| Option | File | Key | Description |
|--------|------|-----|-------------|
| `ToggleOptionItem` | `ToggleOptionItem.cs` | Generic | Boolean toggle backed by `GlobalSave` |
| `ResolutionOptionItem` | `ResolutionOptionItem.cs` | `"Settings:Resolution"` | Screen resolution |
| `BlurOptionItem` | `BlurOptionItem.cs` | `"Settings:Blur"` | Blur quality toggle |
| `ShadowDetailOptionItem` | `ShadowDetailOptionItem.cs` | `"Settings:ShadowDetail"` | Shadow quality (`ShadowLevel` enum) |
| `VSyncOptionItem` | `VSyncOptionItem.cs` | `"Settings:VSync"` | VSync toggle |
| `VibrationOptionItem` | `VibrationOptionItem.cs` | `"Settings:Vibration"` | Controller vibration toggle |
| `MusicOptionItem` | `MusicOptionItem.cs` | `"Audio:MusicVol"` | Music volume slider |
| `SFXOptionItem` | `SFXOptionItem.cs` | `"Audio:EffectsVol"` | SFX volume slider |
| `ProfanityFilterOptionItem` | `ProfanityFilterOptionItem.cs` | `"Settings:ProfanityFilter"` | Profanity filter toggle |
| `InfluencersOptionItem` | `InfluencersOptionItem.cs` | `"Settings:Influencers"` | Social media influencers toggle |
| `PCControlOptionItem` | `PCControlOptionItem.cs` | `"Settings:PCControlScheme"` | PC control scheme (`ControlOption` enum) |
| `PhotonRegionOptionItem` | `PhotonRegionOptionItem.cs` | `"Settings:PhotonRegion"` | Cloud region (`CloudRegionCode`) |
| `BackgroundVideoOptionItem` | `BackgroundVideoOptionItem.cs` | `"Settings:BackgroundVideoEnabled"` | Frontend background video |

---

## 13. Controllers & Remapping

### `ControlsRemapEntry`
- Individual control remapping entry (action → key/button binding)

### `ControllerSupportLegend`
- Legend images for controller bindings

### `LegendButtonsManager`
- Manages legend/button-hint display per root menu; `RequestButtonUptate()`

### `T17ControlMapper`
- Rewired `ControlMapper` integration for in-game rebinding UI

### `AlternateButtonMasher`
- Masher for alternate input detection

### Input Map Data
- `InputMapData.cs` — serialised input mapping configuration

### `SwitchControllerType`
- Enum for controller type switching

### `ControlSetting`
- Enum of control setting categories

### `ControlOption`
- Enum of control scheme options (e.g. `SchemeA`, `SchemeB`)

---

## 14. Navigation Helpers

| Class | File | Description |
|-------|------|-------------|
| `NavigateOnUICancel` | `NavigateOnUICancel.cs` | `UnityEvent m_DoThisOnUICancel` invoked when `UI_Cancel` is pressed |
| `T17NavigableGrid` | `T17NavigableGrid.cs` | Grid-based directional navigation |
| `SelectableGroup` | `SelectableGroup.cs` | Group of selectables for managed navigation |
| `UIProxyLink` | `UIProxyLink.cs` | Proxy navigation link |
| `T17_PassThroughNavigation` | `T17_PassThroughNavigation.cs` | Pass-through navigation to parent |

---

## 15. Tutorial & Hint System

| Class | File | Description |
|-------|------|-------------|
| `TutorialPopup` | `TutorialPopup.cs` | Tutorial popup prefab |
| `TutorialSpeechHUD` | `TutorialSpeechHUD.cs` | Tutorial speech bubble |
| `HUDTutorialArrowController` | `HUDTutorialArrowController.cs` | HUD tutorial arrow controller (per `HUDTutorial` type) |
| `IGMTutorialArrowController` | `IGMTutorialArrowController.cs` | In-game menu tutorial arrow controller |
| `HUDTutorialArrowHandler` | `HUDTutorialArrowHandler.cs` | HUD arrow handler |
| `IGMTutorialArrowHandler` | `IGMTutorialArrowHandler.cs` | IGM arrow handler |
| `TutorialGuidedUIObjective` | `TutorialGuidedUIObjective.cs` | Objective that guides UI interaction |
| `TutorialInputTrigger` | `TutorialInputTrigger.cs` | Input-based tutorial trigger |
| `TutorialTrigger` | `TutorialTrigger.cs` | General tutorial trigger |
| `GlobalHintManager` | `GlobalHintManager.cs` | Global hint display manager |
| `T17HintObject` | `T17HintObject.cs` | Hint UI element |
| `T17FavourObject` | `T17FavourObject.cs` | Favour/relationship hint |
| `HintButton` | `HintButton.cs` | Hint activation button |
| `HintConfig` | `HintConfig.cs` | Hint configuration |

---

## 16. Guide Arrows

| Class | File | Description |
|-------|------|-------------|
| `GuideArrow` | `GuideArrow.cs` | Directional guide arrow to objective |
| `ArrowManager` | `ArrowManager.cs` | Manages all guide arrows; `CheckArrowInstances()` |
| `MapItemTracker` | `MapItemTracker.cs` | Item tracking on map |
| `SetObjectiveArrowObjective` | `SetObjectiveArrowObjective.cs` | Objective that sets a guide arrow |

---

## 17. Utility Enums & Data Classes

### `ShadowLevel`
```csharp
Off, Low, High
```

### `ControlSetting`
```csharp
LeftStick, RightStick, DPad, FaceButtons, LeftShoulder, RightShoulder,
LeftTrigger, RightTrigger, Start, Back, ActionBottom, ActionRight,
ActionLeft, ActionTop, LeftStickClick, RightStickClick
```

### `ControlOption`
```csharp
SchemeA, SchemeB
```

### `SwitchControllerType`
```csharp
ProController, JoyCons
```

### `PCPlatform`
- Platform abstraction for PC-specific UI

### `PerPlatformActivator`
- Activates/deactivates game objects per platform

---

## 18. Key Patterns

### Tab-Panel Menu Switching
Each `RootMenu` subclass has a dictionary mapping a menu-type enum → `MenuList_Container` (list of `BaseMenuBehaviour` + default index). When the flow calls `SetXxxMenuTypeToOpen()`, the `RootMenu.Show()` repopulates `T17TabPanel.SetMenuBodies()` and selects the default tab.

### Single-Player Menu Hierarchy
`FrontendRootMenu`, `EditorRootMenu`, `ResultsRootMenu` operate on a single gamer. `InGameRootMenu` and `HUDRootMenu` have per-player instances cloned from a template canvas.

### Cancel Handling Stack
`BaseMenuBehaviour.m_bShouldBlockParentCancelHandler` + static `AllowedCancelHandlers` form a stack. When a child opens with blocking enabled, the parent's cancel handler is temporarily disabled. On child hide, the parent's handler is restored.

### Legend Text System
`T17Text` supports inline icons via `TextPic`. `BaseMenuBehaviour.UpdateLegendText()` converts localisation tags with icon size/offset data into formatted text. Legend data persists across show/hide cycles.

### Options Dirty-Track Pattern
`BaseOptionItem` → `SetOptionDirty()` marks pending; `ApplyOption()` writes to `GlobalSave` and applies; `ResetOption()` restores saved value. Used by all settings toggles/sliders.

### Input Category Management
`T17EventSystem.ApplyCategories()` switches Rewired action categories based on UI state (e.g. `InGame` → `InGameMenu` → `InGamePaused`). This enables/disables relevant input bindings per context.

### HUD Splitscreen Scaling
`HUDMenuFlow.CheckMenuInstances()` clones the HUD canvas for each player, then applies position/scale from `HUDItemsLayout` (selected by `SplitscreenHUDHandler` based on camera count + player index). World-space HUD scale adjusts for 3/4-player splitscreen via `m_MasterWorldHUDScale` and per-platform multipliers.

### T17EventSystem Per-Gamer
Each gamer gets their own `T17EventSystem` with a dedicated `T17RewiredStandaloneInputModule`. `T17EventSystemsManager` maps gamer → event system. All UI interactions use the gamer-specific event system to support split-screen input isolation.

---

## 19. File Index

(Key files by functional area)

| Area | Files |
|------|-------|
| Flows | `BaseFlowBehaviour.cs`, `FrontEndFlow.cs`, `InGameMenuFlow.cs`, `HUDMenuFlow.cs`, `ResultsFlow.cs`, `BootFlow.cs`, `LoadingFlow.cs`, `LevelFlow.cs` |
| Root Menus | `RootMenu.cs`, `FrontendRootMenu.cs`, `InGameRootMenu.cs`, `HUDRootMenu.cs`, `ResultsRootMenu.cs`, `EditorRootMenu.cs` |
| Base Classes | `BaseMenuBehaviour.cs`, `BaseIngameMenu.cs`, `BaseIngamePassiveUI.cs`, `BaseOptionItem.cs`, `BaseTooltip.cs`, `BaseResultsScreen.cs`, `BaseContextMenu.cs`, `GameMenuBehaviour.cs`, `FrontendMenuBehaviour.cs` |
| T17 Widgets | `T17Button.cs`, `T17Text.cs`, `T17Image.cs`, `T17RawImage.cs`, `T17Toggle.cs`, `T17Slider.cs`, `T17StatsSlider.cs`, `T17ScrollView.cs`, `T17Scrollbar.cs`, `T17InputField.cs`, `T17DropDown.cs`, `T17Selectable.cs`, `T17TabPanel.cs`, `T17MenuBody.cs`, `T17DialogBox.cs`, `T17DialogBoxManager.cs`, `T17TooltipManager.cs`, `T17ItemTooltip.cs`, `T17CounterObject.cs`, `T17FavourObject.cs`, `T17HintObject.cs`, `T17InfoObject.cs`, `T17TrackedUIElement.cs`, `T17UIAlphaFade.cs`, `T17NavigableGrid.cs`, `T17IconManager.cs`, `T17AspectRatioFitter.cs` |
| Event System | `T17EventSystem.cs`, `T17EventSystemsManager.cs`, `T17RewiredStandaloneInputModule.cs`, `Team17UIInputModule.cs`, `T17BlockKeyboardAutoFocus.cs`, `T17UISelectDeselectEvents.cs`, `T17UIPointerOverExitEvents.cs` |
| HUD | `HUD.cs`, `HUDItemsLayout.cs`, `HUDItemLayoutGroup.cs`, `HUDRootMenu.cs`, `HUDMenuFlow.cs`, `PlayerInventoryHUD.cs`, `PlayerStatsHUD.cs`, `PlayerSolitaryHUD.cs`, `ProgressBarHUD.cs`, `NamePlateHUD.cs`, `NameTagIconHud.cs`, `SpeechBubbleHUD.cs`, `AlertnessStarHUD.cs`, `ChatFeedHUD.cs`, `VoiceChatFeedHUD.cs`, `TargetHUD.cs`, `EmoteCategoryHUD.cs`, `EmoteDisplayHUD.cs`, `IconDisplayHUD.cs`, `JobProgressHUD.cs`, `FloorIndicatorHUD.cs`, `RoutineAndTimeTrackerHUD.cs`, `ObjectiveTrackerHUD.cs`, `ObjectiveSubGoalHUD.cs`, `QuestCompletedHUD.cs`, `MiniMap.cs` |
| Frontend Menus | `MainFrontendMenu.cs`, `CampaignFrontendMenu.cs`, `CoopFrontEndMenu.cs`, `VersusFrontendMenu.cs`, `VersusLobbyFEMenu.cs`, `PrivateVersusFEMenu.cs`, `PublicVersusFEMenu.cs`, `SelectPrivateVersusFEMenu.cs`, `BrowseGamesFrontendMenu.cs`, `SettingsFrontendMenu.cs`, `DLCStoreFrontendMenu.cs`, `CollectablesFrontendMenu.cs`, `CustomisationFrontendMenu.cs`, `CustomisationDialogFrontendMenu.cs`, `CustomisationDialogTabMenu.cs`, `CustomisationOptionsFE.cs`, `ShopMenu.cs`, `ProgressFrontendMenu.cs`, `LeaderboardsFrontendMenu.cs`, `Credits.cs`, `MainEditorFrontendMenu.cs`, `EditorBrowseGamesMenu.cs`, `EditorMyPrisonsMenu.cs`, `EditorPublishMenu.cs`, `EditorSubscribedMenu.cs` |
| In-Game Menus | `PauseMenu.cs`, `SettingsMenu.cs`, `OptionsControlsMenu.cs`, `OptionsSettingsMenu.cs`, `OptionsHelpMenu.cs`, `ControlsMenu.cs`, `CraftingMenu.cs`, `LootingMenu.cs`, `PlayerInventoryMenu.cs`, `SwagBagMenu.cs`, `BedSaveMenu.cs`, `DeskMenu.cs`, `ToiletMenu.cs`, `CalendarMenu.cs`, `PayphoneMenu.cs`, `FavourMenu.cs`, `JournalFavoursMenu.cs`, `JournalHintsMenu.cs`, `GiftingMenu.cs`, `RobinsonFavourMenu.cs`, `RobinsonMidQuestFavourMenu.cs`, `JobBoardMenu.cs`, `JobTutorialMenu.cs`, `GuardBoard.cs`, `InformationBoard.cs`, `SignPost.cs`, `PasswordDialogMenu.cs` |
| Options | `BaseOptionItem.cs`, `ToggleOptionItem.cs`, `ResolutionOptionItem.cs`, `BlurOptionItem.cs`, `ShadowDetailOptionItem.cs`, `VSyncOptionItem.cs`, `VibrationOptionItem.cs`, `MusicOptionItem.cs`, `SFXOptionItem.cs`, `ProfanityFilterOptionItem.cs`, `InfluencersOptionItem.cs`, `PCControlOptionItem.cs`, `PhotonRegionOptionItem.cs`, `BackgroundVideoOptionItem.cs` |
| World UI | `WorldCanvasTrackedUIElements.cs`, `PerPlayerTrackedUIElements.cs`, `T17TrackedUIElement.cs`, `TrackableUIElementsReporter.cs`, `WorldSpaceHudScalePODO.cs`, `SpeechBubbleHUD.cs`, `NamePlateHUD.cs` |
| Effects | `UIAnimatedEffect.cs`, `UIAnimatedEffectController.cs`, `UIAnimatedCoinTicker.cs`, `UIAnimatedPagination.cs`, `UIShimmerManager.cs`, `UIButtonShine.cs`, `UIShineRegister.cs`, `UICarousel.cs`, `UICarouselBase.cs`, `TextCarousel.cs`, `LoopingDragScroll.cs`, `FadeManager.cs`, `CanvasAlphaChanger.cs` |
| Tutorials | `TutorialPopup.cs`, `TutorialSpeechHUD.cs`, `HUDTutorialArrowController.cs`, `IGMTutorialArrowController.cs`, `HUDTutorialArrowHandler.cs`, `IGMTutorialArrowHandler.cs`, `GlobalHintManager.cs`, `T17HintObject.cs`, `T17FavourObject.cs`, `HintConfig.cs` |
| Arrows | `GuideArrow.cs`, `ArrowManager.cs`, `MapItemTracker.cs` |
| Navigation | `NavigateOnUICancel.cs`, `T17NavigableGrid.cs`, `SelectableGroup.cs`, `UIProxyLink.cs`, `T17_PassThroughNavigation.cs` |
| Split-screen | `SplitscreenHUDHandler.cs`, `SplitscreenDividerHandler.cs`, `HUDItemLayoutGroup.cs`, `HUDItemsLayout.cs` |
| Carousels/Friends | `DLCCarousel.cs`, `MilestoneCarousel.cs`, `UIFriendActivitySlot.cs`, `UIFriendCampaignCarousel.cs`, `UIJoinFriendCarousel.cs`, `FriendsContextMenu.cs` |
