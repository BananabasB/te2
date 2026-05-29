# Cutscene System (Slate)

The Escapists 2 uses **Slate** by ParadoxNotion as its cutscene editor and runtime. This is a full timeline-based cinematic system baked directly into Unity's hierarchy. Below is a comprehensive reference of every class in the decompiled Slate namespace and the game-side extensions.

---

## Core Framework (Slate namespace)

### Cutscene (`Slate.Cutscene`)
The root MonoBehaviour for every cutscene. Implements `IDirector`.

- **State machine**: `Play()`, `Stop()`, `Pause()`, `Resume()`, `Rewind()`, `SkipAll()`, `SkipCurrentSection()`
- **Wrap modes**: `Once`, `Loop`, `PingPong`; **Stop modes**: `Skip`, `Rewind`, `Hold`; **Playing directions**: `Forwards`, `Backwards`
- **Update modes**: `Normal`, `AnimatePhysics`, `UnscaledTime`
- Maintains a list of `CutsceneGroup` objects under a `__GroupsRoot__` transform
- Uses `TimeInPointer`/`TimeOutPointer` for ordered activation of all directables
- Sends global messages (`SendGlobalMessage`) to affected actors every frame
- Static methods: `Cutscene.Play(name)`, `Cutscene.Find(name)`, `Cutscene.FindFromResources(name)` — supports loading from Resources folder
- Can render cutscene to textures via `RenderCutscene(width, height, frameRate, callback)`
- **Events**: `OnCutsceneStarted`, `OnCutsceneStopped`, `OnSectionReached`, `OnGlobalMessageSend`

### CutsceneGroup (`Slate.CutsceneGroup`)
Abstract base class for groups that hold tracks and reference an actor GameObject.

- Contains `List<CutsceneTrack> tracks` and `List<Section> sections`
- **ActorReferenceMode**: `UseOriginal` / `UseInstanceHideOriginal` (instantiates actor copy and hides original)
- **ActorInitialTransformation**: `UseOriginal` / `UseLocal`
- Handles transform/object snapshots and restoration for undo
- `OnSectionReached` event fires when playback crosses a section boundary

### CutsceneTrack (`Slate.CutsceneTrack`)
Abstract base for all track types. Contains `List<ActionClip> actions`.

- Has `blendIn`/`blendOut`, `startTime`/`endTime`, `color`, `info`
- Virtual lifecycle: `OnInitialize`, `OnEnter`, `OnUpdate`, `OnExit`, `OnReverse`, `OnReverseEnter`
- `GetTrackWeight(time)` returns blend weight

### CutsceneSequencePlayer (`Slate.CutsceneSequencePlayer`)
Plays a list of Cutscenes sequentially. On finish, invokes `onFinish` UnityEvent.

### ActionClip (`Slate.ActionClip`)
Abstract base for all clip types placed on tracks. Implements `IDirectable`, `IKeyable`.

- Properties: `startTime`, `endTime`, `length`, `blendIn`, `blendOut`, `info`, `isValid`
- Has `AnimationDataCollection` for animatable parameters (marked with `[AnimatableParameter]`)
- Clip weight calculation via `GetClipWeight(time, blendIn, blendOut)`
- Lifecycle: `OnInitialize`, `OnEnter`, `OnUpdate`, `OnExit`, `OnReverse`, `OnReverseEnter`
- Snapshot/restore of animated parameters ensures clean undo

### ActionTrack (`Slate.ActionTrack`)
Abstract generic-purpose track. Once a clip is placed, the track locks to accept only clips of the same category.

### ActorGroup (`Slate.ActorGroup`)
The concrete `CutsceneGroup` for a specific actor GameObject. Stores `_actor`, `_referenceMode`, `_initialCoordinates`, `_initialLocalPosition`, `_initialLocalRotation`.

### DirectorGroup (`Slate.DirectorGroup`)
The master group of every cutscene — always present, cannot be removed. Its actor is the `DirectorCamera.current.gameObject`.

### DirectorActionClip (`Slate.DirectorActionClip`)
Abstract base for clips on `DirectorActionTrack`. Marker class only.

### DirectorActionTrack (`Slate.DirectorActionTrack`)
Action track that lives under the DirectorGroup. Holds director-level clips (fades, lighting, audio, etc).

---

## Camera System

### DirectorCamera (`Slate.DirectorCamera`)
Singleton camera root used by all cutscenes. Implements `IDirectableCamera`.

- Lazy-initialized via `DirectorCamera.current` — creates "★ Director Camera Root" if none exists
- Manages `GameCamera` swap: disables the game camera when cutscene is active
- `Enable()`/`Disable()` toggles the render camera, caches `DepthOfField` component
- `Update(source, target, interpolation, weight, damping)` interpolates position, rotation, FOV, focal point, focal range between shot cameras
- Events: `OnCut`, `OnActivate`, `OnDeactivate`

### ShotCamera (`Slate.ShotCamera`)
Placeable camera prefab component (`[RequireComponent(typeof(Camera))]`). Implements `IDirectableCamera`.

- Stores `focalPoint`, `focalRange` for depth of field
- `GetRenderTexture(width, height)` renders shot to a RenderTexture for cross-dissolve effects
- Camera component is disabled in Awake (the director camera controls rendering)

### GameCamera (`Slate.GameCamera`)
Wraps the actual Main Camera. Implements `IDirectableCamera`. Provides position/rotation/FOV/focal values to the director camera for blending.

### CameraTrack (`Slate.CameraTrack`)
Unique track on the DirectorGroup. Manages camera blending across shots.

- Finds `firstShot` and `lastShot` from action clips
- Activates `DirectorCamera.Enable()` on enter
- Applies letterbox (cinebox) via `DirectorGUI.UpdateLetterbox()`
- Supports `exitCameraOverride` — swaps back to a different game camera after cutscene
- `OnUpdate` blends between shots using `DirectorCamera.Update()`

### CameraShot (`Slate.DirectorActionClip`)
A clip on the CameraTrack representing one camera shot. References a `ShotCamera` target.

- **BlendInEffectType**: `None`, `FadeIn`, `CrossDissolve`, `EaseIn`
- **BlendOutEffectType**: `None`, `FadeOut`
- **ShotAnimationMode**: `UseInternal`, `UseExternalAnimationClip`
- Animatable parameters: `position`, `rotation`, `fieldOfView`, `focalPoint`, `focalRange`
- `steadyCamEffect` simulates handheld camera shake via SmoothDamp randomization
- Cross-dissolve rendering uses `previousShot.targetShot.GetRenderTexture()` and `DirectorGUI.UpdateDissolve()`

---

## Animation System

### AnimatorTrack (`Slate.AnimatorTrack`)
Unique track on ActorGroup. Plays animation clips directly on an Animator without requiring a Controller.

- Uses `AnimationMixerPlayable` for blending between `PlayAnimatorClip` clips
- Optionally bakes root motion before playback via `BakeRootMotion()` (30 FPS sampling)
- Supports `baseAnimationClip` for idle poses between clips
- Restores original `RuntimeAnimatorController`, `applyRootMotion`, `cullingMode` on exit

### AnimatedParameter (`Slate.AnimatedParameter`)
Serializable class that drives curve-based animation of properties/fields on components.

- Supported types: `bool`, `int`, `float`, `Vector2`, `Vector3`, `Color`
- Uses `AnimationCurve[]` internally (1–4 curves depending on type)
- Resolves target via `transformHierarchyPath` for nested transforms
- `SetSnapshot()` / `RestoreSnapshot()` for undo
- `SetEvaluatedValues()` evaluates curves at time and applies via delegate or reflection
- `TryAutoKey()` for editor-time keyframe recording

### PropertiesTrack (`Slate.PropertiesTrack`)
Unique track on any group. Uses an `AnimationDataCollection` to animate arbitrary components on the actor directly from the track (no clips needed).

### AnimatableParameterAttribute (`AnimatableParameterAttribute`)
Marks a field/property on an ActionClip as animatable. Can specify min/max range.

---

## Audio System

### AudioTrack (`Slate.AudioTrack`)
Abstract base for audio tracks. Manages a pooled `AudioSource` via `AudioSampler`.

- Properties: `mixer` (AudioMixerGroup), `masterVolume`, `stereoPan`, `spatialBlend`
- Optionally uses actor's own AudioSource via `useAudioSourceOnActor`
- Moves audio source position to track actor position during update

---

## GUI & Overlay System

### DirectorGUI (`Slate.DirectorGUI`)
Singleton MonoBehaviour on the Director Camera. Handles all on-screen cinematic effects via OnGUI.

- **Letterbox**: cinematic black bars, animated via `UpdateLetterbox(completion)`
- **Fade**: full-screen color fade via `UpdateFade(color)`
- **Subtitles**: bottom-center text with black background via `UpdateSubtitles(text, color)`
- **Overlay text**: positionable rich text via `UpdateOverlayText()`
- **Overlay texture**: positionable/scalable texture via `UpdateOverlayTexture()`
- **Dissolve**: cross-dissolve transition via `UpdateDissolve(renderTexture, completion)`
- All methods have event-based delegates (`OnSubtitlesGUI`, `OnScreenFadeGUI`, etc.) for custom rendering

---

## Easing

### Easing (`Slate.Easing`)
Static class with 31 easing functions stored in `EaseFunctions[]`:
Linear, Quadratic, Cubic, Quartic, Quintic, Sinusoidal, Exponential, Circular, Elastic, Bounce, Back — each with In/Out/InOut variants.

### EaseType (`Slate.EaseType`)
Enum with 35 values covering all In/Out/InOut combinations plus Linear.

### Section (`Slate.Section`)
Serializable marker on a CutsceneGroup. Has `UID`, `name`, `time`, `color`, `colorizeBackground`. Named "Intro" at time 0 is special-cased.

---

## Built-in Trigger Components

- **PlayCutsceneOnStart** — Plays a Cutscene in `Start()`, with `onFinish` UnityEvent callback
- **PlayCutsceneOnClick** — Plays on `OnMouseDown()`, auto-adds BoxCollider
- **PlayCutsceneOnTrigger** — Plays on `OnTriggerEnter()`, optional tag filter and one-shot mode

---

## Game-Side Cutscene Integration

### CutsceneManagerBase (`CutsceneManagerBase`)
Abstract singleton managing all cutscene playback in-game. Networked via `T17NetView`.

- **States**: `Unassigned`, `WaitingForStart`, `Playing`, `SkippingCurrent`, `Idle`
- Holds references to generic cutscenes: `m_Intro`, `m_GenericEscapeCutscene`, `m_TimeServedCutscene`, `m_EscapeSinglePlayerFirst`, `m_EscapeMultiplayerFirst`, `m_TimesUpCutscene`
- `ConsiderPlayingIntroCutscene()` — plays intro once per session (cooperative/singleplayer only)
- `PlayCutsceneSetupRPC()` — phases: fade HUD transparent → wait → play → fade back
- Skip support: `SkipLocally()` with deadtime and button reset timers
- All cutscenes registered via `AddLevelSpecificScenesToList()` (abstract)
- Snapshots controller input states before cutscene (`PlayerMapsSnapshot`)
- `PrepareForCutsceneEvent` / `CutsceneFinishedEvent` for UI listeners

### CutsceneCanvas (`CutsceneCanvas`)
Canvas MonoBehaviour for skip-label display and global effect controller. Manages `m_SkipLabel` text visibility with a timer.

### CutsceneHUDManager (`CutsceneHUDManager`)
Singleton that fades per-player HUD elements (canvas alpha) during cutscene transitions. Manages per-player letterbox effects via `AnimatedEffectPingPong`.

### CutsceneUIFadingListener (`CutsceneUIFadingListener`)
Listens to `PrepareForCutsceneEvent` / `CutsceneFinishedEvent` to fade a specific `CanvasAlphaChanger`.

### CutsceneSpeechBubbleHandler (`CutsceneSpeechBubbleHandler`)
Extends `CharacterSpeechBubbleHandler` with role-specific presets: Guard, Inmate, Medic, Dog, JobOfficer, MaintenanceMan, Visitor. Each preset has background + tail sprites.

### CutsceneSpeechBubbleResponder (`CutsceneSpeechBubbleResponder`)
Implements `ICutsceneStartEndResponder`. On cutscene start, enables the speech bubble handler. On end, clears the speech buffer.

### CutsceneCameraTrackableObject (`CutsceneCameraTrackableObject`)
Extends `CutsceneFlooredMonobehaviour`. Holds `m_CameraView` and `m_NearClippingFloorOffset` for the cutscene camera.

### CutsceneFlooredMonobehaviour (`CutsceneFlooredMonobehaviour`)
T17MonoBehaviour that automatically snaps its Z-position to the floor index in `LateUpdate`. Used by the camera trackable and visible-floor clip.

### CutsceneControlledUpdater (`CutsceneControlledUpdater`)
Finds all `IControlledUpdate` children and calls `ControlledUpdate()`/`ControlledFixedUpdate()` on them. Used for cutscene-specific update control.

### CutsceneAnimEventListener (`CutsceneAnimEventListener`)
Extends `AnimEventListener`. Routes animation events (via `SoundEvent(int)`) to Wwise audio events from `CharacterAudioEvents`.

---

## Slate.ActionClips (78 general-purpose clips)

The `Slate.ActionClips` namespace provides ready-made clips used in the cutscene editor:

| Category | Clips |
|---|---|
| **Animation** | `PlayAnimationClip`, `PlayAnimatorClip`, `CrossFadeState`, `MecanimBaseClip`, `AnimateLayerWeight` |
| **Transform** | `RotateTo`, `RotateBy`, `RotateAround`, `TranslateTo`, `TranslateBy`, `ScaleTo`, `ScaleBy`, `SetTransformValues`, `SetTransformParent`, `MatchTransformsToTarget`, `LookAt`, `CharacterLookAt`, `FollowPath`, `AnimateOnPath`, `SimpleGrounder` |
| **Properties** | `AnimateFloatParameter`, `AnimateBoolParameter`, `AnimateIntegerParameter`, `AnimateProperties`, `AnimateTrigger` |
| **Audio** | `PlayAudio` |
| **Visibility** | `AnimateActorVisibility`, `SetActorActiveState`, `SetActorVisibilityTemporary`, `DirectorEnableGameObjects`, `DirectorDisableGameObjects` |
| **Material** | `SetMaterial`, `SetMaterialTexture`, `AnimateMaterialColor`, `AnimateMaterialFloat`, `AnimateMaterialTexture`, `ScrollMaterialTexture` |
| **Lighting/Environment** | `AnimateAmbientLighting`, `AnimateFog`, `AnimateGravity`, `AnimateTimeScale` |
| **Mecanim/IK** | `AnimateLimbIK`, `AnimateLookAtIK`, `MecanimBaseClip` |
| **BlendShape** | `AnimateBlendShape` |
| **Particles** | `SampleParticleSystem`, `SpriteFlipbook` |
| **UI/Overlay** | `OverlayText`, `OverlayTexture`, `ScreenFader`, `ScreenCapture`, `Captions`, `SetSprite` |
| **Object Management** | `InstantiateObject`, `DestroyGameObjects`, `AttachObject`, `SetParentTemporary`, `SetBehavioursActiveState` |
| **Messages** | `SendMessage`, `SendMessageBoolean/Float/Integer/Object/String`, `SendGlobalMessage`, `SendGlobalMessageBoolean/Float/Integer/Object/String` |
| **UnityEvent** | `RaiseUnityEvent` |
| **SubCutscene** | `SubCutscene`, `AdditiveScene` |
| **Pathfinding** | `PathfindTo` |
| **Misc** | `DebugLog`, `EasySlowMotion`, `PauseCutscene`, `CharacterExpression`, `ActorActionClip` |
