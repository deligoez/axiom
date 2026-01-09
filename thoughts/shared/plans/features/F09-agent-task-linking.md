# F09: Agent-Task Linking

**Milestone:** 2 - Agent Preparation
**Dependencies:** Existing AgentManager, F02 (State System)
**Estimated Tests:** 5

---

## What It Does

Associates spawned agents with task IDs and tracks this relationship in both agentStore and state.json.

---

## Why It's Needed

- Need to know which agent is working on which task
- Need to update task when agent completes
- Need to recover association on crash
- Orchestrator (F15) relies on this

---

## Current Agent Type

```typescript
// src/types/agent.ts (current)

export interface Agent {
  id: string;
  status: AgentStatus;
  command: string;
  args: string[];
  pid?: number;
  exitCode?: number;
  output: string[];
}
```

---

## Extended Agent Type

```typescript
// src/types/agent.ts (extended)

export interface Agent {
  id: string;
  status: AgentStatus;
  command: string;
  args: string[];
  pid?: number;
  exitCode?: number;
  output: string[];

  // NEW: Task linking
  taskId?: string;           // e.g., "bd-a1b2"
  agentType?: AgentType;     // "claude" | "codex" | "opencode"
  worktree?: string;         // e.g., ".worktrees/claude-bd-a1b2"
  branch?: string;           // e.g., "agent/claude/bd-a1b2"
  iteration?: number;        // Current iteration count
  startedAt?: number;        // Timestamp when spawned
}

export type AgentType = 'claude' | 'codex' | 'opencode';
```

---

## Files to Modify

| File | Action |
|------|--------|
| `src/types/agent.ts` | Add new fields |
| `src/stores/agentStore.ts` | Update to handle new fields |
| `tests/types/agent.test.ts` | Test new fields |
| `tests/stores/agentStore.test.ts` | Test new fields |

---

## agentStore Updates

```typescript
// src/stores/agentStore.ts (updates)

export interface AgentStore {
  agents: Agent[];
  selectedAgentId: string | null;

  // Existing actions
  addAgent: (agent: Agent) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  removeAgent: (id: string) => void;
  selectAgent: (id: string | null) => void;
  getSelectedAgent: () => Agent | undefined;
  appendOutput: (id: string, line: string) => void;

  // NEW: Task linking actions
  getAgentByTaskId: (taskId: string) => Agent | undefined;
  getAgentsByType: (type: AgentType) => Agent[];
  incrementIteration: (id: string) => void;
}

// Implementation
getAgentByTaskId: (taskId) => {
  return get().agents.find(a => a.taskId === taskId);
},

getAgentsByType: (type) => {
  return get().agents.filter(a => a.agentType === type);
},

incrementIteration: (id) => {
  set(state => ({
    agents: state.agents.map(a =>
      a.id === id ? { ...a, iteration: (a.iteration || 0) + 1 } : a
    )
  }));
}
```

---

## Agent Spawn with Task

```typescript
// Example usage in Orchestrator (F15)

const agent: Agent = {
  id: `${agentType}-${taskId}`,  // e.g., "claude-bd-a1b2"
  status: 'starting',
  command: agentConfig.command,
  args: agentConfig.args,
  output: [],
  // Task linking
  taskId,
  agentType,
  worktree: worktreeInfo.path,
  branch: worktreeInfo.branch,
  iteration: 0,
  startedAt: Date.now()
};

agentStore.addAgent(agent);
```

---

## Test Cases

```typescript
// tests/stores/agentStore.test.ts (additions)

describe('agentStore task linking', () => {
  it('should store agent with taskId');
  it('should find agent by taskId');
  it('should filter agents by type');
  it('should increment iteration count');
  it('should preserve task linking on update');
});
```

---

## Acceptance Criteria

- [ ] Agent type includes taskId, agentType, worktree, branch
- [ ] Agent type includes iteration, startedAt
- [ ] `getAgentByTaskId()` finds correct agent
- [ ] `getAgentsByType()` filters correctly
- [ ] `incrementIteration()` updates count
- [ ] All 5 tests pass

---

## Implementation Notes

1. Agent ID format: `{agentType}-{taskId}` for easy identification
2. All new fields are optional (backward compatible)
3. Iteration starts at 0, incremented after each agent restart
4. startedAt for timeout calculations
