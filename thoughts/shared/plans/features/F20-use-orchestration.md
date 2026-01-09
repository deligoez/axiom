# F20: useOrchestration Hook

**Milestone:** 4 - Core Orchestration
**Dependencies:** F15 (Orchestrator), F16 (Completion Handler), F17 (Semi-Auto), F19 (Orchestration Store)
**Estimated Tests:** 8

---

## What It Does

React hook that connects TUI components to orchestration services and store.

---

## Why It's Needed

- Components need simple API for orchestration
- Encapsulates service initialization and wiring
- Provides reactive state from store
- Handles event subscriptions and cleanup
- Similar pattern to useAgentManager, useBeadsManager

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useOrchestration.ts` | Main orchestration hook |
| `tests/hooks/useOrchestration.test.ts` | Unit tests |

---

## Hook Interface

```typescript
// src/hooks/useOrchestration.ts

export interface UseOrchestrationResult {
  // State (from store)
  mode: OperatingMode;
  status: OrchestrationStatus;
  error: string | null;
  currentTaskId: string | null;
  currentAgentId: string | null;
  currentIteration: number;
  tasksCompleted: number;
  tasksFailed: number;
  isPaused: boolean;

  // Derived state
  isIdle: boolean;
  isRunning: boolean;
  canStartTask: boolean;

  // Actions
  startTask: (taskId: string, agentType?: AgentType) => Promise<AssignmentResult>;
  cancelTask: () => Promise<void>;
  setMode: (mode: OperatingMode) => void;

  // Autopilot actions
  startAutopilot: () => Promise<void>;
  stopAutopilot: () => Promise<void>;
  pauseAutopilot: () => void;
  resumeAutopilot: () => void;
}

export function useOrchestration(config: {
  projectDir: string;
  chorusConfig: ChorusConfig;
  agentManager: AgentManager;
  beadsService: BeadsService;
}): UseOrchestrationResult;
```

---

## Implementation

```typescript
export function useOrchestration(config: UseOrchestrationConfig): UseOrchestrationResult {
  const {
    projectDir,
    chorusConfig,
    agentManager,
    beadsService
  } = config;

  // Get state from store
  const store = useOrchestrationStore();

  // Initialize services (once)
  const services = useMemo(() => {
    const worktreeService = new WorktreeService(projectDir);
    const promptBuilder = new PromptBuilder();
    const beadsCLI = new BeadsCLI(projectDir);
    const completionChecker = new CompletionChecker(chorusConfig, projectDir);

    const orchestrator = new Orchestrator({
      projectDir,
      config: chorusConfig,
      agentManager,
      beadsService,
      worktreeService,
      promptBuilder,
      beadsCLI
    });

    const completionHandler = new CompletionHandler({
      completionChecker,
      beadsCLI,
      worktreeService,
      config: chorusConfig
    });

    const semiAutoController = new SemiAutoController({
      orchestrator,
      completionHandler,
      config: chorusConfig
    });

    return { orchestrator, completionHandler, semiAutoController };
  }, [projectDir, chorusConfig, agentManager, beadsService]);

  // Wire up events
  useEffect(() => {
    const { semiAutoController } = services;

    const onTaskStarted = (result: AssignmentResult) => {
      store.setCurrentTask(result.taskId, result.agentId, result.agentType);
      store.setStatus('running');
    };

    const onTaskCompleted = (result: TaskCompletionResult) => {
      store.recordCompletion(true);
      store.clearCurrentTask();
    };

    const onTaskFailed = (result: TaskCompletionResult) => {
      store.recordCompletion(false);
      store.clearCurrentTask();
    };

    const onRetry = ({ iteration }: { iteration: number }) => {
      store.incrementIteration();
    };

    semiAutoController.on('taskStarted', onTaskStarted);
    semiAutoController.on('taskCompleted', onTaskCompleted);
    semiAutoController.on('taskFailed', onTaskFailed);
    semiAutoController.on('retry', onRetry);

    return () => {
      semiAutoController.off('taskStarted', onTaskStarted);
      semiAutoController.off('taskCompleted', onTaskCompleted);
      semiAutoController.off('taskFailed', onTaskFailed);
      semiAutoController.off('retry', onRetry);
    };
  }, [services, store]);

  // Derived state
  const isIdle = store.status === 'idle';
  const isRunning = store.status === 'running';
  const canStartTask = isIdle && store.mode === 'semi-auto';

  // Actions
  const startTask = async (taskId: string, agentType?: AgentType) => {
    store.setStatus('assigning');
    try {
      return await services.semiAutoController.startTask(taskId, agentType);
    } catch (error) {
      store.setError(error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  };

  const cancelTask = async () => {
    await services.semiAutoController.cancelTask();
    store.clearCurrentTask();
  };

  const setMode = (mode: OperatingMode) => {
    store.setMode(mode);
  };

  // Autopilot actions (placeholder for F32+)
  const startAutopilot = async () => {
    // TODO: Implement in F32
    throw new Error('Autopilot not implemented yet');
  };

  const stopAutopilot = async () => {
    // TODO: Implement in F32
  };

  const pauseAutopilot = () => {
    store.setPaused(true);
  };

  const resumeAutopilot = () => {
    store.setPaused(false);
  };

  return {
    // State
    mode: store.mode,
    status: store.status,
    error: store.error,
    currentTaskId: store.currentTaskId,
    currentAgentId: store.currentAgentId,
    currentIteration: store.currentIteration,
    tasksCompleted: store.tasksCompleted,
    tasksFailed: store.tasksFailed,
    isPaused: store.isPaused,

    // Derived
    isIdle,
    isRunning,
    canStartTask,

    // Actions
    startTask,
    cancelTask,
    setMode,
    startAutopilot,
    stopAutopilot,
    pauseAutopilot,
    resumeAutopilot,
  };
}
```

---

## Usage in App

```typescript
// src/app.tsx

export const App: React.FC<AppProps> = ({ config }) => {
  const agentManager = useAgentManager();
  const beadsManager = useBeadsManager(config.projectDir);

  const orchestration = useOrchestration({
    projectDir: config.projectDir,
    chorusConfig: config,
    agentManager: agentManager.manager,
    beadsService: beadsManager.service
  });

  return (
    <Layout>
      <TaskPanel
        tasks={beadsManager.beads}
        onTaskSelect={orchestration.startTask}
        canSelect={orchestration.canStartTask}
      />
      <AgentView
        agents={agentManager.agents}
        currentAgentId={orchestration.currentAgentId}
      />
      <StatusBar
        mode={orchestration.mode}
        status={orchestration.status}
        completed={orchestration.tasksCompleted}
      />
    </Layout>
  );
};
```

---

## Test Cases

```typescript
// tests/hooks/useOrchestration.test.ts

describe('useOrchestration', () => {
  describe('initialization', () => {
    it('should initialize with idle state');
    it('should create services once');
  });

  describe('startTask', () => {
    it('should start task via controller');
    it('should update store on start');
    it('should set error on failure');
  });

  describe('event handling', () => {
    it('should update store on taskCompleted');
    it('should update store on taskFailed');
    it('should increment iteration on retry');
  });

  describe('derived state', () => {
    it('should compute isIdle correctly');
    it('should compute canStartTask correctly');
  });
});
```

---

## Acceptance Criteria

- [ ] Initializes services on mount
- [ ] Provides state from orchestration store
- [ ] Provides startTask action
- [ ] Provides cancelTask action
- [ ] Handles service events
- [ ] Updates store on completion
- [ ] Computes derived state
- [ ] All 8 tests pass

---

## Implementation Notes

1. Service initialization in useMemo (created once)
2. Event wiring in useEffect with cleanup
3. Store updates happen in event handlers
4. Derived state computed from store values
5. Autopilot actions are placeholders for M7
6. Similar pattern to useAgentManager hook
