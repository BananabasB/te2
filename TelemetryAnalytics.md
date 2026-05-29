# Telemetry & Analytics System

## Overview

The Escapists 2 telemetry and analytics stack consists of:

- **Google Analytics V3** implementation supporting Android (native SDK), iOS (native SDK), and other platforms (Measurement Protocol / MPV3).
- **HitBuilder** class hierarchy that mirrors the GA Measurement Protocol parameter set.
- **NetAnalytics** and **EC2AnalyticsHelper** — a lightweight server-side analytics forwarder.
- **StatsTracking** / **STAT_IDS** / **ACTIVITY_FEED_IDS** — in-game stat tracking and activity feed event IDs.
- **ScoreManager** / **ScoreSystemConfig** — scoring subsystem.
- **Error Handling** — error dialog, error levels, crash report generation.
- **Debug / Log** — debug menu, log utilities.
- **Config / Quality** — runtime configuration, quality settings, build version info, server hash checks, profiler control.
- **Boot / Bootstrap** — application entry points.

---

## Google Analytics V3

### GoogleAnalyticsV3.cs

`Assembly-CSharp/GoogleAnalyticsV3.cs`

Namespace: *global*

Static container for the shared GA tracker instance.

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `private static` | `IGoogleAnalyticsV3` | `_instance` | Singleton instance |
| `public static` | `bool` | `AppRunningInBackground` | Whether the app is in the background |

**Properties**

| Name | Type | Description |
|---|---|---|
| `Instance` | `IGoogleAnalyticsV3` | Singleton accessor; lazy-initializes via platform-specific factory |

**Methods**

| Signature | Description |
|---|---|
| `static GoogleAnalyticsV3()` | Static constructor; registers as platform factory via `GoogleAnalyticsMPV3` |
| `static void RegisterPlatformProvider<T>()` | Registers a platform-specific GA provider type for singleton creation |

---

### GoogleAnalyticsAndroidV3.cs

`Assembly-CSharp/GoogleAnalyticsAndroidV3.cs`

Namespace: *global*

Stub Android native GA implementation.

**Implements:** `IGoogleAnalyticsV3`

**Methods (all stubs — no-op)**

| Signature | Description |
|---|---|
| `void InitTracker()` | Initialize GA tracker |
| `void SetTrackingID(string trackingID)` | Set UA tracking ID |
| `void SetAppLevelOptOut(bool optOut)` | App-level opt-out |
| `void SetAnonymizeIP(bool anonymize)` | Anonymize IP addresses |
| `void SetSampleRate(float sampleRate)` | Set sampling rate |
| `void SetSessionTimeout(long timeout)` | Session timeout in seconds |
| `void StartSession()` | Start a new session |
| `void StopSession()` | End current session |
| `void LogScreen(AppViewHitBuilder builder)` | Log a screen view |
| `void LogEvent(EventHitBuilder builder)` | Log an event |
| `void LogException(ExceptionHitBuilder builder)` | Log an exception |
| `void LogSocial(SocialHitBuilder builder)` | Log a social interaction |
| `void LogTiming(TimingHitBuilder builder)` | Log a timing hit |
| `void LogTransaction(TransactionHitBuilder builder)` | Log a transaction |
| `void LogItem(ItemHitBuilder builder)` | Log an item |
| `void DispatchHits()` | Force-dispatch hits |
| `void SetCustomDimension(int index, string value)` | Set a custom dimension |
| `void SetCustomMetric(int index, long value)` | Set a custom metric |

---

### GoogleAnalyticsiOSV3.cs

`Assembly-CSharp/GoogleAnalyticsiOSV3.cs`

Namespace: *global*

Stub iOS native GA implementation.

**Implements:** `IGoogleAnalyticsV3`

Methods identical to GoogleAnalyticsAndroidV3 — all no-op stubs.

---

### GoogleAnalyticsMPV3.cs

`Assembly-CSharp/GoogleAnalyticsMPV3.cs`

Namespace: *global*

Measurement Protocol GA implementation used on all non-Android, non-iOS platforms.

**Implements:** `IGoogleAnalyticsV3`

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `private` | `string` | `m_TrackingID` | GA tracking ID |
| `private` | `string` | `m_UserAgent` | HTTP user-agent string |
| `private` | `float` | `m_SampleRate` | Sampling rate (0–100) |
| `private` | `bool` | `m_AnonymizeIP` | Anonymize IP flag |
| `private` | `long` | `m_SessionTimeout` | Session timeout in seconds |
| `private` | `string` | `m_SessionID` | Current session identifier |
| `private` | `DateTime` | `m_LastSessionTime` | Last session timestamp |
| `private` | `List<Dictionary<Field, string>>` | `m_UnsentHitQueue` | Queue of unsent hits |

**Methods**

| Signature | Description |
|---|---|
| `void InitTracker()` | Sets user-agent from `BuildVersion`, initialises unsent queue |
| `void SetTrackingID(string trackingID)` | Stores tracking ID |
| `void SetAppLevelOptOut(bool optOut)` | Stores opt-out flag |
| `void SetAnonymizeIP(bool anonymize)` | Sets anonymize IP flag, adds `&aip=1` to hits |
| `void SetSampleRate(float sampleRate)` | Clamps 0–100, stores sample rate |
| `void SetSessionTimeout(long timeout)` | Stores session timeout in seconds |
| `void StartSession()` | Creates new session ID via `Guid.NewGuid()`, sets `&sc=start` |
| `void StopSession()` | Sets `&sc=end` |
| `void LogScreen(AppViewHitBuilder builder)` | Builds hit dict, sends via `SendHit` |
| `void LogEvent(EventHitBuilder builder)` | Builds hit dict, sends |
| `void LogException(ExceptionHitBuilder builder)` | Builds hit dict, sends |
| `void LogSocial(SocialHitBuilder builder)` | Builds hit dict, sends |
| `void LogTiming(TimingHitBuilder builder)` | Builds hit dict, sends |
| `void LogTransaction(TransactionHitBuilder builder)` | Builds hit dict, sends |
| `void LogItem(ItemHitBuilder builder)` | Builds hit dict, sends |
| `void DispatchHits()` | Processes unsent hit queue via `SendHitWorker` |
| `void SetCustomDimension(int index, string value)` | Stores in dictionary |
| `void SetCustomMetric(int index, long value)` | Stores in dictionary |
| `void SendHit(Dictionary<Field, string> hit)` | Adds to unsent queue, calls `DispatchHits` |
| `void SendHitWorker(object state)` | `WWW` POST to `https://www.google-analytics.com/collect` with hit payload; retries on failure |

Builds common hit parameters: `v=1`, `tid`, `cid`, `t`, `ul` (language from `Application.systemLanguage`), `sr` (screen resolution), `vp` (viewport), `an` (app name), `aid` (app ID), `av` (app version), `aip` if set, `sc` if session, custom dimensions/metrics.

---

## HitBuilder Class Hierarchy

### IGoogleAnalyticsV3 (implicit interface)

Defined by usage pattern across GA classes.

**Methods:** `InitTracker`, `SetTrackingID`, `SetAppLevelOptOut`, `SetAnonymizeIP`, `SetSampleRate`, `SetSessionTimeout`, `StartSession`, `StopSession`, `LogScreen`, `LogEvent`, `LogException`, `LogSocial`, `LogTiming`, `LogTransaction`, `LogItem`, `DispatchHits`, `SetCustomDimension`, `SetCustomMetric`.

---

### HitBuilder.cs (abstract base)

`Assembly-CSharp/HitBuilder.cs`

**Generic:** `abstract class HitBuilder<T>` where `T : HitBuilder<T>`

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `protected` | `Dictionary<Field, string>` | `m_Dict` | Hit parameter dictionary |

**Methods**

| Signature | Description |
|---|---|
| `void SetCustomDimension(int index, string value)` | Adds `&cd[index]=value` |
| `void SetCustomMetric(int index, long value)` | Adds `&cm[index]=value` |
| `T NewHit()` | Returns `(T)this` |
| `T GenerateHit()` | Returns `(T)this` |
| `string Build()` | URL-encodes `m_Dict` entries as `key=value&` pairs |
| `Dictionary<Field, string> GetHit()` | Returns `m_Dict` |

---

### AppViewHitBuilder.cs

`Assembly-CSharp/AppViewHitBuilder.cs`

**Inherits:** `HitBuilder<AppViewHitBuilder>`

**Methods**

| Signature | Description |
|---|---|
| `AppViewHitBuilder SetScreenName(string screenName)` | Sets `&cd` (screen name) |

---

### EventHitBuilder.cs

`Assembly-CSharp/EventHitBuilder.cs`

**Inherits:** `HitBuilder<EventHitBuilder>`

**Methods**

| Signature | Description |
|---|---|
| `EventHitBuilder SetEventCategory(string category)` | Sets `&ec` |
| `EventHitBuilder SetEventAction(string action)` | Sets `&ea` |
| `EventHitBuilder SetEventLabel(string label)` | Sets `&el` |
| `EventHitBuilder SetEventValue(long value)` | Sets `&ev` |

---

### ExceptionHitBuilder.cs

`Assembly-CSharp/ExceptionHitBuilder.cs`

**Inherits:** `HitBuilder<ExceptionHitBuilder>`

**Methods**

| Signature | Description |
|---|---|
| `ExceptionHitBuilder SetExceptionDescription(string description)` | Sets `&exd` |
| `ExceptionHitBuilder SetFatal(bool fatal)` | Sets `&exf` (1/0) |

---

### SocialHitBuilder.cs

`Assembly-CSharp/SocialHitBuilder.cs`

**Inherits:** `HitBuilder<SocialHitBuilder>`

**Methods**

| Signature | Description |
|---|---|
| `SocialHitBuilder SetSocialNetwork(string network)` | Sets `&sn` |
| `SocialHitBuilder SetSocialAction(string action)` | Sets `&sa` |
| `SocialHitBuilder SetSocialTarget(string target)` | Sets `&st` |

---

### TimingHitBuilder.cs

`Assembly-CSharp/TimingHitBuilder.cs`

**Inherits:** `HitBuilder<TimingHitBuilder>`

**Methods**

| Signature | Description |
|---|---|
| `TimingHitBuilder SetTimingCategory(string category)` | Sets `&utc` |
| `TimingHitBuilder SetTimingInterval(long interval)` | Sets `&utt` |
| `TimingHitBuilder SetTimingName(string name)` | Sets `&utv` |
| `TimingHitBuilder SetTimingLabel(string label)` | Sets `&utl` |

---

### TransactionHitBuilder.cs

`Assembly-CSharp/TransactionHitBuilder.cs`

**Inherits:** `HitBuilder<TransactionHitBuilder>`

**Methods**

| Signature | Description |
|---|---|
| `TransactionHitBuilder SetTransactionID(string id)` | Sets `&ti` |
| `TransactionHitBuilder SetAffiliation(string affiliation)` | Sets `&ta` |
| `TransactionHitBuilder SetRevenue(double revenue)` | Sets `&tr` |
| `TransactionHitBuilder SetShipping(double shipping)` | Sets `&ts` |
| `TransactionHitBuilder SetTax(double tax)` | Sets `&tt` |
| `TransactionHitBuilder SetCurrencyCode(string code)` | Sets `&cu` |

---

### ItemHitBuilder.cs

`Assembly-CSharp/ItemHitBuilder.cs`

**Inherits:** `HitBuilder<ItemHitBuilder>`

**Methods**

| Signature | Description |
|---|---|
| `ItemHitBuilder SetTransactionID(string id)` | Sets `&ti` |
| `ItemHitBuilder SetSKU(string sku)` | Sets `&ic` |
| `ItemHitBuilder SetName(string name)` | Sets `&in` |
| `ItemHitBuilder SetCategory(string category)` | Sets `&iv` |
| `ItemHitBuilder SetPrice(double price)` | Sets `&ip` |
| `ItemHitBuilder SetQuantity(long quantity)` | Sets `&iq` |

---

## Field Definitions

### Field.cs / Fields.cs

**Field** — simple string wrapper class holding a GA Measurement Protocol parameter key string (e.g. `"&t"`). Overrides `ToString()` to return the parameter.

**Fields** — static readonly collection of all GA MP parameter keys:

| Name | Key | Used By |
|---|---|---|
| `ANONYMIZE_IP` | `&aip` | All hits |
| `HIT_TYPE` | `&t` | All hits |
| `SESSION_CONTROL` | `&sc` | Session control |
| `SCREEN_NAME` | `&cd` | AppView |
| `LOCATION` | `&dl` | AppView |
| `REFERRER` | `&dr` | AppView |
| `PAGE` | `&dp` | AppView |
| `HOSTNAME` | `&dh` | AppView |
| `TITLE` | `&dt` | AppView |
| `LANGUAGE` | `&ul` | All hits |
| `ENCODING` | `&de` | All hits |
| `SCREEN_COLORS` | `&sd` | All hits |
| `SCREEN_RESOLUTION` | `&sr` | All hits |
| `VIEWPORT_SIZE` | `&vp` | All hits |
| `APP_NAME` | `&an` | All hits |
| `APP_ID` | `&aid` | All hits |
| `APP_INSTALLER_ID` | `&aiid` | All hits |
| `APP_VERSION` | `&av` | All hits |
| `CLIENT_ID` | `&cid` | All hits |
| `USER_ID` | `&uid` | All hits |
| `CAMPAIGN_NAME` | `&cn` | Campaign |
| `CAMPAIGN_SOURCE` | `&cs` | Campaign |
| `CAMPAIGN_MEDIUM` | `&cm` | Campaign |
| `CAMPAIGN_KEYWORD` | `&ck` | Campaign |
| `CAMPAIGN_CONTENT` | `&cc` | Campaign |
| `CAMPAIGN_ID` | `&ci` | Campaign |
| `GCLID` | `&gclid` | Google Ads |
| `DCLID` | `&dclid` | DoubleClick |
| `EVENT_CATEGORY` | `&ec` | Event |
| `EVENT_ACTION` | `&ea` | Event |
| `EVENT_LABEL` | `&el` | Event |
| `EVENT_VALUE` | `&ev` | Event |
| `SOCIAL_NETWORK` | `&sn` | Social |
| `SOCIAL_ACTION` | `&sa` | Social |
| `SOCIAL_TARGET` | `&st` | Social |
| `TIMING_VAR` | `&utv` | Timing |
| `TIMING_VALUE` | `&utt` | Timing |
| `TIMING_CATEGORY` | `&utc` | Timing |
| `TIMING_LABEL` | `&utl` | Timing |
| `EX_DESCRIPTION` | `&exd` | Exception |
| `EX_FATAL` | `&exf` | Exception |
| `CURRENCY_CODE` | `&cu` | Transaction |
| `TRANSACTION_ID` | `&ti` | Transaction / Item |
| `TRANSACTION_AFFILIATION` | `&ta` | Transaction |
| `TRANSACTION_SHIPPING` | `&ts` | Transaction |
| `TRANSACTION_TAX` | `&tt` | Transaction |
| `TRANSACTION_REVENUE` | `&tr` | Transaction |
| `ITEM_SKU` | `&ic` | Item |
| `ITEM_NAME` | `&in` | Item |
| `ITEM_CATEGORY` | `&iv` | Item |
| `ITEM_PRICE` | `&ip` | Item |
| `ITEM_QUANTITY` | `&iq` | Item |
| `TRACKING_ID` | `&tid` | All hits |
| `SAMPLE_RATE` | `&sf` | All hits |
| `DEVELOPER_ID` | `&did` | Developer |
| `CUSTOM_METRIC` | `&cm` | Custom metric |
| `CUSTOM_DIMENSION` | `&cd` | Custom dimension |

---

## Server-Side Analytics

### NetAnalytics.cs

`Assembly-CSharp/NetAnalytics.cs`

Sends analytics events to an EC2-hosted analytics endpoint.

**Methods (static)**

| Signature | Description |
|---|---|
| `static void SendAnalyticsEvent(object eventData)` | Serialises event to JSON, POSTs to EC2 analytics URL via `EC2AnalyticsHelper` |

---

### EC2AnalyticsHelper.cs

`Assembly-CSharp/EC2AnalyticsHelper.cs`

HTTP helper for posting JSON events to an EC2 endpoint.

**Methods**

| Signature | Description |
|---|---|
| `void DoPost(string url, string jsonData)` | Creates `WWWForm`, POSTs JSON, handles response |

---

## Stats & Activity Feed

### StatsTracking.cs

`Assembly-CSharp/StatsTracking.cs`

Central stat tracking manager.

**Fields / Properties**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public static` | `StatsTracking` | `m_Instance` | Singleton |
| `public` | `Dictionary<int, int>` | `StatsDict` | Stat ID → value map |

**Methods**

| Signature | Description |
|---|---|
| `static void ResetAllStats()` | Clears and resets `m_Instance` |
| `static void AddStat(int id, int amount)` | Adds amount to stat ID |
| `static void SetStat(int id, int amount)` | Sets stat ID to value |
| `static int GetStat(int id)` | Gets value for stat ID |
| `static bool GetBool(int id)` | Returns value != 0 |

---

### STAT_IDS.cs

`Assembly-CSharp/STAT_IDS.cs`

Static class containing integer constant stat IDs.

**Constants (representative)**

| Name | Value |
|---|---|
| `ID_Total_Play_Time` | 1 |
| `ID_Total_Escapes` | 2 |
| `ID_Total_Recaptures` | 3 |
| `ID_Total_Guard_Assaults` | 4 |
| `ID_Total_Inmate_Assaults` | 5 |
| `ID_Total_Knockouts` | 6 |
| `ID_Total_Items_Crafted` | 7 |
| `ID_Total_Items_Stolen` | 8 |
| `ID_Total_Gold_Found` | 9 |
| `ID_Total_Jobs_Completed` | 10 |
| ... | ... |

(Full listing omitted for brevity — contains ~100+ IDs covering combat, crafting, jobs, escape methods, multiplayer, etc.)

---

### ACTIVITY_FEED_IDS.cs

`Assembly-CSharp/ACTIVITY_FEED_IDS.cs`

Static class containing integer activity feed event IDs.

**Constants (representative)**

| Name | Value |
|---|---|
| `ID_Escape` | 1 |
| `ID_Recapture` | 2 |
| `ID_Combat_Win` | 3 |
| `ID_Combat_Loss` | 4 |
| `ID_Crafting` | 5 |
| `ID_Job_Complete` | 6 |
| `ID_Item_Found` | 7 |
| ... | ... |

---

## Score System

### ScoreManager.cs

`Assembly-CSharp/ScoreManager.cs`

Manages scoring for escapes, combat, and objectives.

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public static` | `ScoreManager` | `m_Instance` | Singleton |

**Methods**

| Signature | Description |
|---|---|
| `void AddScore(int value)` | Adds score |
| `void RemoveScore(int value)` | Subtracts score |
| `int GetTotalScore()` | Returns accumulated score |
| `void ResetScore()` | Resets to zero |

---

### ScoreSystemConfig.cs

`Assembly-CSharp/ScoreSystemConfig.cs`

Configuration container for score values and multipliers.

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public` | `int` | `EscapeScore` | Base score for escaping |
| `public` | `int` | `CombatScore` | Base score for combat wins |
| `public` | `int` | `ObjectiveScore` | Per-objective score |
| `public` | `float` | `DifficultyMultiplier` | Difficulty-based multiplier |

---

## Error Handling

### ErrorDialogHandler.cs

`Assembly-CSharp/ErrorDialogHandler.cs`

Handles display of error dialogs to the user.

**Methods**

| Signature | Description |
|---|---|
| `void ShowError(string title, string message, ErrorLevel level)` | Shows a dialog with the given error level |
| `void ShowReportDialog(string title, string message)` | Shows dialog with report-generation option |

---

### ErrorLevel.cs

`Assembly-CSharp/ErrorLevel.cs`

**Enum**

| Member | Description |
|---|---|
| `Info` | Informational message |
| `Warning` | Non-fatal warning |
| `Error` | Recoverable error |
| `Fatal` | Critical error requiring restart |

---

### GenerateReport.cs

`Assembly-CSharp/GenerateReport.cs`

Generates a crash/error report containing system info, stack trace, and player state.

**Methods**

| Signature | Description |
|---|---|
| `static string GenerateCrashReport(string errorMessage, string stackTrace)` | Returns formatted report string |
| `static bool SaveReportToDisk(string report)` | Writes report to persistent storage |

---

## Debug & Log

### DebugHelpers.cs

`Assembly-CSharp/DebugHelpers.cs`

Utility methods for debug rendering and logging.

**Methods**

| Signature | Description |
|---|---|
| `static void DrawCross(Vector3 position, float size, Color color, float duration)` | Draws a debug cross |
| `static void DrawCircle(Vector3 center, float radius, Color color, float duration)` | Draws a debug circle |
| `static void LogFormat(string format, params object[] args)` | Conditional log formatting |

---

### DebugMenu.cs

`Assembly-CSharp/DebugMenu.cs`

In-game debug menu system.

**Fields / Properties**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public static` | `DebugMenu` | `m_Instance` | Singleton |
| `public` | `bool` | `IsOpen` | Whether debug menu is visible |

**Methods**

| Signature | Description |
|---|---|
| `void Toggle()` | Toggles menu visibility |
| `void AddMenuObject(DebugMenuMenuObject obj)` | Registers a debug menu item |
| `void RemoveMenuObject(DebugMenuMenuObject obj)` | Unregisters a debug menu item |

---

### DebugMenuMenuObject.cs

`Assembly-CSharp/DebugMenuMenuObject.cs`

Individual item within the debug menu.

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public` | `string` | `Label` | Display text |
| `public` | `UnityEngine.Events.UnityAction` | `Action` | Callback when activated |

---

### LogUtil.cs

`Assembly-CSharp/LogUtil.cs`

Central logging utility with log-level filtering.

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public static` | `LogUtilLogType` | `LogLevel` | Current log level filter |

**Methods**

| Signature | Description |
|---|---|
| `static void Log(LogUtilLogType type, object message)` | Logs if `type` >= current log level |
| `static void LogError(object message)` | Shortcut for `Log(LogUtilLogType.Error, message)` |
| `static void LogWarning(object message)` | Shortcut for `Log(LogUtilLogType.Warning, message)` |
| `static void SetLogLevel(LogUtilLogType level)` | Sets the log level filter |

---

### LogUtilLogType.cs

`Assembly-CSharp/LogUtilLogType.cs`

**Enum**

| Member | Description |
|---|---|
| `None` | No logging |
| `Error` | Errors only |
| `Warning` | Warnings and errors |
| `Info` | All messages |

---

## Config & Quality

### ConfigManager.cs

`Assembly-CSharp/ConfigManager.cs`

Runtime configuration manager.

**Fields / Properties**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public static` | `ConfigManager` | `m_Instance` | Singleton |

**Methods**

| Signature | Description |
|---|---|
| `void LoadConfig()` | Loads config from persistent storage |
| `void SaveConfig()` | Writes config to persistent storage |
| `string GetSetting(string key)` | Gets a config setting |
| `void SetSetting(string key, string value)` | Sets a config setting |

---

### QualityManager.cs

`Assembly-CSharp/QualityManager.cs`

Manages graphics quality settings.

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public static` | `QualityManager` | `m_Instance` | Singleton |

**Methods**

| Signature | Description |
|---|---|
| `void SetQualityLevel(int level)` | Sets quality level |
| `int GetQualityLevel()` | Returns current quality level |
| `void ApplyCurrentQuality()` | Applies quality settings to rendering |

---

### BuildVersion.cs

`Assembly-CSharp/BuildVersion.cs`

Container for the current build version string.

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public static` | `string` | `VersionString` | e.g. `"1.0.0"` |
| `public static` | `string` | `BuildNumber` | e.g. `"12345"` |

---

### ReleaseBuildVersion.cs

`Assembly-CSharp/ReleaseBuildVersion.cs`

Holds the release build version information. Populated at build time.

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public static` | `string` | `ReleaseVersion` | Release version string |

---

### ServerHashCheck.cs

`Assembly-CSharp/ServerHashCheck.cs`

Validates server configuration hashes for anti-tampering.

**Methods**

| Signature | Description |
|---|---|
| `static bool ValidateHash(string data, string expectedHash)` | Returns true if hash matches |
| `static string ComputeHash(string data)` | Computes hash of input data |

---

### ProfilerActivator.cs

`Assembly-CSharp/ProfilerActivator.cs`

Toggles Unity profiler based on build configuration.

**Methods**

| Signature | Description |
|---|---|
| `static void ActivateProfiler()` | Enables profiler |
| `static void DeactivateProfiler()` | Disables profiler |

---

## Boot & Bootstrap

### BootFlow.cs

`Assembly-CSharp/BootFlow.cs`

Boot flow state machine. Runs before gameplay systems initialise.

**Inherits:** `BaseFlowBehaviour`

**Enum States (representative)**

| State | Description |
|---|---|
| `Init` | Initialise boot systems |
| `LoadConfig` | Load configuration |
| `CheckServerHash` | Validate server hash |
| `InitAnalytics` | Start analytics |
| `Complete` | Boot finished, transition to frontend |

---

### Bootstrap.cs

`Assembly-CSharp/Bootstrap.cs`

Application entry point. Sets up essential managers and starts BootFlow.

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public static` | `Bootstrap` | `m_Instance` | Singleton |
| `public` | `bool` | `IsBootstrapped` | Whether bootstrap completed |

**Methods**

| Signature | Description |
|---|---|
| `void Awake()` | Creates singleton, calls `Initialize()` |
| `void Initialize()` | Sets up managers, starts BootFlow |
| `void StartBootFlow()` | Transitions to boot flow |
