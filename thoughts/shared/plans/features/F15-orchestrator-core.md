# F15: Orchestrator Core

**Milestone:** 4 - Core Orchestration
**Dependencies:** F04 (Worktree Create), F07 (Prompt Builder), F09 (Agent-Task Linking), F12 (Task Claimer)
**Estimated Tests:** 15

---

## What It Does

The central coordinator that manages the flow: task selection → worktree creation → prompt building → agent spawning → tracking.

---

## Why It's Needed

- Single point of coordination for all orchestration
- Connects all the pieces: tasks, agents, worktrees
- Entry point for both semi-auto and autopilot modes
- Most critical service in Phase 4

---

## Architecture

```
                     User/Autopilot
                           │
                           │ assignTask(taskId)
                           ▼
                  ┌─────────────────┐
                  │   Orchestrator  │
                  │    (this)       │
                  └────────┬────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ WorktreeService │ │  PromptBuilder  │ │   AgentManager  │
│     (F06)       │ │     (F07)       │ │   (existing)    │
└─────────────────┘ └─────────────────┘ └─────────────────┘
         │                 │                 │
         │                 │                 │
         ▼                 ▼                 ▼
    Worktree           Prompt            Process
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/services/Orchestrator.ts` | Main orchestration logic |
| `src/types/orchestration.ts` | Types for orchestration |
| `tests/services/Orchestrator.test.ts` | Unit tests |

---

## Orchestration Types

```typescript
// src/types/orchestration.ts

export interface AssignmentResult {
  success: boolean;
  agentId: string;
  taskId: string;
  worktree: WorktreeInfo;
  error?: string;
}

export interface OrchestratorConfig {
  projectDir: string;
  config: ChorusConfig;
  agentManager: AgentManager;
  beadsService: BeadsService;
}

export interface TaskAssignment {
  taskId: string;
  agentType: AgentType;
  modelOverride?: string;
}
```

---

## Orchestrator API

```typescript
// src/services/Orchestrator.ts

import { EventEmitter } from 'events';
import type { Bead } from '../types/bead';
import type { Agent, AgentType } from '../types/agent';
import type { WorktreeInfo } from '../services/WorktreeService';
import type { AssignmentResult, OrchestratorConfig, TaskAssignment } from '../types/orchestration';

export class Orchestrator extends EventEmitter {
  private projectDir: string;
  private config: ChorusConfig;
  private worktreeService: WorktreeService;
  private promptBuilder: PromptBuilder;
  private agentManager: AgentManager;
  private beadsService: BeadsService;
  private beadsCLI: BeadsCLI;

  constructor(config: OrchestratorConfig);

  // === MAIN ASSIGNMENT FLOW ===

  /**
   * Assign a task to an agent
   * 1. Validate task is assignable
   * 2. Create worktree
   * 3. Claim task (bd update --status=in_progress)
   * 4. Build prompt
   * 5. Spawn agent
   * 6. Return result
   */
  async assignTask(assignment: TaskAssignment): Promise<AssignmentResult>;

  // === HELPER METHODS ===

  // Check if task can be assigned
  async canAssign(taskId: string): Promise<{ can: boolean; reason?: string }>;

  // Get task by ID
  getTask(taskId: string): Bead | undefined;

  // Get ready tasks (pending, deps satisfied)
  getReadyTasks(): Bead[];

  // Determine agent type for task (from config or task custom fields)
  getAgentType(task: Bead): AgentType;

  // Get agent config
  getAgentConfig(agentType: AgentType): AgentConfig;

  // === EVENTS ===
  // 'assigned' - task assigned to agent
  // 'error' - assignment failed
}
```

---

## Assignment Flow (Detailed)

```typescript
async assignTask(assignment: TaskAssignment): Promise<AssignmentResult> {
  const { taskId, agentType, modelOverride } = assignment;

  // 1. Validate task is assignable
  const canAssignResult = await this.canAssign(taskId);
  if (!canAssignResult.can) {
    return {
      success: false,
      agentId: '',
      taskId,
      worktree: {} as WorktreeInfo,
      error: canAssignResult.reason
    };
  }

  // 2. Get task details
  const task = this.getTask(taskId);
  if (!task) {
    return { success: false, /* ... */ error: 'Task not found' };
  }

  // 3. Create worktree
  const worktree = await this.worktreeService.create(agentType, taskId);

  // 4. Claim task
  await this.beadsCLI.claimTask(taskId, `${agentType}-${taskId}`);

  // 5. Build prompt
  const prompt = this.promptBuilder.build({
    task,
    agentType,
    branch: worktree.branch,
    config: this.config
  });

  // 6. Get agent config
  const agentConfig = this.getAgentConfig(agentType);
  const args = [...agentConfig.args];

  // Apply model override
  if (modelOverride && agentConfig.allowModelOverride) {
    args.push('--model', modelOverride);
  }

  // 7. Spawn agent
  const agentId = `${agentType}-${taskId}`;
  const agent = await this.agentManager.spawn({
    id: agentId,
    command: agentConfig.command,
    args: [...args, prompt],  // Pass prompt as arg or via stdin
    cwd: worktree.path,
    env: {
      CHORUS_TASK_ID: taskId,
      CHORUS_BRANCH: worktree.branch
    }
  });

  // 8. Emit event
  this.emit('assigned', { taskId, agentId, worktree });

  return {
    success: true,
    agentId,
    taskId,
    worktree
  };
}
```

---

## canAssign Logic

```typescript
async canAssign(taskId: string): Promise<{ can: boolean; reason?: string }> {
  const task = this.getTask(taskId);

  if (!task) {
    return { can: false, reason: 'Task not found' };
  }

  if (task.status !== 'open') {
    return { can: false, reason: `Task status is ${task.status}, not open` };
  }

  // Check if already assigned
  const existingAgent = agentStore.getState().getAgentByTaskId(taskId);
  if (existingAgent) {
    return { can: false, reason: 'Task already assigned to an agent' };
  }

  // Check dependencies (F14 - for now, skip or simple check)
  if (task.dependencies && task.dependencies.length > 0) {
    for (const depId of task.dependencies) {
      const dep = this.getTask(depId);
      if (!dep || dep.status !== 'closed') {
        return { can: false, reason: `Dependency ${depId} not complete` };
      }
    }
  }

  // Check agent slots
  const runningAgents = agentStore.getState().agents.filter(
    a => a.status === 'running'
  ).length;
  if (runningAgents >= this.config.agents.maxParallel) {
    return { can: false, reason: 'Max parallel agents reached' };
  }

  return { can: true };
}
```

---

## Test Cases

```typescript
// tests/services/Orchestrator.test.ts

describe('Orchestrator', () => {
  describe('assignTask', () => {
    it('should create worktree for task');
    it('should claim task via bd CLI');
    it('should build prompt with task context');
    it('should spawn agent in worktree');
    it('should return AssignmentResult on success');
    it('should emit "assigned" event');
    it('should fail if task not found');
    it('should fail if task already assigned');
    it('should fail if dependencies not met');
  });

  describe('canAssign', () => {
    it('should return true for ready task');
    it('should return false for in_progress task');
    it('should return false for closed task');
    it('should return false if max agents reached');
    it('should check dependencies');
  });

  describe('getAgentType', () => {
    it('should use task custom.agent if specified');
    it('should fall back to config default');
  });
});
```

---

## Acceptance Criteria

- [ ] Creates worktree for new assignment
- [ ] Claims task via `bd update`
- [ ] Builds correct prompt for agent type
- [ ] Spawns agent in worktree directory
- [ ] Passes environment variables
- [ ] Applies model override if specified
- [ ] Validates task is assignable
- [ ] Checks max parallel agents
- [ ] Checks dependencies (basic)
- [ ] Emits events for tracking
- [ ] All 15 tests pass

---

## Implementation Notes

1. This is the CORE service - everything flows through here
2. Agent spawn should be in worktree cwd
3. Prompt can be passed as:
   - Final argument: `claude "prompt text"`
   - Via stdin (preferred for long prompts)
4. Environment variables help agent know context
5. Don't handle completion here - that's F16
