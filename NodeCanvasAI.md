# NodeCanvas Behaviour Tree Integration

The Escapists 2 uses **NodeCanvas** by ParadoxNotion for all AI behaviour. Every NPC's decision-making is driven by a behaviour tree with per-character-type custom tasks and decorators.

---

## Overview

Every `AICharacter` (and its subclasses: `AICharacter_Guard`, `AICharacter_Inmate`, `AICharacter_Medic`, `AICharacter_Dog`, `AICharacter_MaintenanceMan`, `AICharacter_JobOfficer`, `AICharacter_CrowdNPC`, `AICharacter_Ghost`, `AICharacter_Generic`, etc.) holds a reference to a **NodeCanvas Blackboard** (`m_AIBlackboard`) acquired in `Awake()` via `GetComponent<Blackboard>()`.

The AI runs via `ControlledUpdate()` (from `IControlledUpdate`), which is ticked by the `UpdateManager` each frame. The behaviour tree itself is evaluated separately by NodeCanvas's `BehaviourTreeOwner`.

---

## Combat Behaviour Pattern

The most notable integration point is the **CombatBehaviour** blackboard variable (AICharacter.cs:1290–1298):

```csharp
private const string COMBAT_BEHAVIOUR = "CombatBehaviour";

public void UpdateCombatBehaviour()
{
    AIConfig aiConfig = ConfigManager.GetInstance().aiConfig;
    BehaviourTree combatBehaviour = aiConfig.GetCombatBehaviour(m_CharacterPersonality);
    if (combatBehaviour != null)
        m_AIBlackboard.SetValue("CombatBehaviour", combatBehaviour);
}
```

Each AI has a `Personality.PersonalityType` (random 0–3 range). The `AIConfig` maps personality types to different `BehaviourTree` assets. This means inmates/guards use different combat trees depending on their assigned personality.

Combat trees are stored as Blackboard variables of type `BehaviourTree`, and are likely executed by a `SwitchBehaviourTree` action or a `SubTree` node that reads the variable.

---

## Personality Types

Personality is assigned at spawn in `StartInit()`:
```csharp
m_CharacterPersonality = (Personality.PersonalityType)Random.Range(0, 4);
```
Persisted in save data via `CharacterSaveData.m_Personality` (int) and restored in `DeserialiseCharacter()` via `UpdateCombatBehaviour()`.

---

## NodeCanvas Namespaces in the Codebase

### NodeCanvas (root)

- **`Status`** — Enum: `Failure`, `Success`, `Running`, `Resting`, `Error`. Returned by all tasks/nodes to signal execution state.
- **`ActionListPlayer`** — Component that wraps an `ActionList` for manual sequential execution. Supports serialization via `JSONSerializer`.

### NodeCanvas.Framework

- **`Graph`** — Abstract base class for all graph types (BehaviourTree, FSM, DialogueTree).
- **`Blackboard`** — The data store for AI state. Variables set/get by name. Each AICharacter has one.
- **`Task`** — Abstract base for all action/condition tasks.
- **`ActionTask`** / **`ConditionTask`** — Base classes for game-specific action/condition implementations.
- **`Node`** — Graph node base. Has connections, position, and serialized task.
- **`Connection`** — Links between nodes.
- **`BBParameter<T>`** — A parameter that can be bound to a Blackboard variable.
- **`Variable`** — Named, typed value stored in a Blackboard.
- **`GraphOwner`** — Abstract component that runs a graph. Concrete: `BehaviourTreeOwner`, `FSMOwner`, `DialogueTreeController`.
- **`GlobalBlackboard`** — Shared blackboard accessible across all graphs.
- **`SyncBlackboard`** — Synchronizes variables between two blackboards.
- **`ActionList`** / **`ConditionList`** — Sequential/parallel lists of tasks.

### NodeCanvas.BehaviourTrees

- **`BehaviourTree`** / **`BehaviourTreeOwner`** — The BT graph and its runner component.
- **Composites**: `Selector`, `Sequencer`, `PrioritySelector`, `ProbabilitySelector`, `FlipSelector`, `BinarySelector`, `Parallel`, `StepIterator`, `IntIterator`, `InteractiveObjectIterator`
- **Decorators**: `BTDecorator`, `Filter`, `Inverter`, `Repeater`, `Timeout`, `Optional`, `Interruptor`, `Guard`, `ConditionalEvaluator`, `Remapper`, `Setter`, `WaitUntil`, `StateDecorator`, `RoutineSwitch`, `MealTimeDecorator`, `SpeechDecorator`, `IconDecorator`, `CombatDecorator`, `PlayerDisconnectDecorator`, `TutorialDecorator`, `RootSwitcher`, `NodeToggler`
- **Nodes**: `ActionNode`, `ConditionNode`, `SubTree`, `NestedFSM`
- **BTConnection** — Custom connection type for the BT.

Game-specific decorators like `RoutineSwitch`, `MealTimeDecorator`, `CombatDecorator`, `StateDecorator`, `SpeechDecorator`, `IconDecorator` show deep integration — the BT nodes are aware of prison routines, combat state, meal times, and character speech/icons.

### NodeCanvas.StateMachines

- **`FSM`** / **`FSMOwner`** — Finite state machine graph and runner.
- **States**: `ActionState`, `SuperActionState`, `ConcurrentState`, `AnyState`, `NestedBTState`, `NestedFSMState`
- **`FSMConnection`** — Transition between states with conditions.

Used for high-level AI state machines (e.g. patrolling → chasing → fighting). The `SwitchFSM` action and `NestedBTState` show cross-graph nesting.

### NodeCanvas.DialogueTrees

- **`DialogueTree`** / **`DialogueTreeController`** — Dialogue graph and runner.
- **`Statement`** — A speech line with text, audio, and meta. Implements `IStatement`.
- **Nodes**: `StatementNode`, `MultipleChoiceNode`, `ConditionNode`, `ActionNode`, `FinishNode`, `GoToNode`, `MultipleConditionNode`, `SubDialogueTree`
- **`DialogueActor`** / **`ProxyDialogueActor`** — Actor references for dialogue.
- **`IDialogueActor`** — Interface for dialogue participants.
- **`SubtitlesRequestInfo`** / **`MultipleChoiceRequestInfo`** — Event structs for UI handling.

Dialogue trees are likely used for quest conversations and tutorial interactions.

### NodeCanvas.Tasks.Actions (built-in tasks)

A large library of built-in action tasks covering: movement (`MoveTo`, `Patrol`, `Flee`, `Wander`, `RotateTowards`), Mecanim (`SetBool`, `SetFloat`, `SetInt`, `PlayAnimation`), gameplay (`Instantiate`, `Destroy`, `SendMessage`, `SendEvent`), blackboard (`SetVariable`, `GetProperty`, `SetProperty`), UI (`CameraFader`, `FadeIn/FadeOut`), dialogue (`StartDialogueTree`, `SayRandom`), and `SwitchBehaviourTree`/`SwitchFSM`.

### NodeCanvas.Tasks.Conditions (built-in conditions)

(Condition tasks found in the decomp — used for BT condition nodes.)

---

## Integration Summary

| Component | NodeCanvas Usage |
|---|---|
| `AICharacter` | Holds `Blackboard` reference; sets `CombatBehaviour`, `WanderSpeechTag` variables |
| `AIConfig` | Maps `PersonalityType` → `BehaviourTree` combat trees |
| `BehaviourTreeOwner` | Manages runtime BT evaluation per AI |
| `FSMOwner` | High-level state machine for guard/inmate behaviour |
| `DialogueTreeController` | Quest dialogues and conversations |
| Custom decorators | `RoutineSwitch`, `CombatDecorator`, `MealTimeDecorator`, `SpeechDecorator`, `StateDecorator`, `IconDecorator`, `TutorialDecorator`, `PlayerDisconnectDecorator` |
| Custom iterators | `InteractiveObjectIterator` (iterates over InteractiveObjects found via RoomBlob) |
| `ActionListPlayer` | Standalone sequential action execution |
| `GlobalBlackboard` | Shared state across all AI |
