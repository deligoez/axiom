# Agent Orchestration Plan

**Status:** DRAFT - Needs Discussion
**Date:** 2026-01-09

---

## Problem Statement

Chorus TUI şu an task'ları gösteriyor ve agent spawn edebiliyor, ama:
- Task'lar ile agent'lar arasında bağlantı yok
- Agent'lar hangi task üzerinde çalıştığını bilmiyor
- Dependency olan task'lar handle edilmiyor
- Paralel çalışma stratejisi yok

---

## Open Questions (Tartışılacak)

### 1. Task Assignment Model

**Option A: Manual Assignment**
- Kullanıcı task seçer → Enter → Agent spawn edilir
- Pro: Tam kontrol
- Con: Her task için manuel işlem

**Option B: Auto-Assignment (Queue)**
- Agent hazır olunca sıradaki task'ı alır
- Pro: Hands-off orchestration
- Con: Öncelik kontrolü zor

**Option C: Hybrid**
- Default: auto-assign by priority
- Override: manuel assignment mümkün
- Pro: Flexibility
- Con: Complexity

**Soru:** Hangi model?

---

### 2. Parallelism Strategy

**Option A: Fixed Pool**
```
MAX_AGENTS = 3
Agent 1: [Task A] → [Task D] → ...
Agent 2: [Task B] → [Task E] → ...
Agent 3: [Task C] → [Task F] → ...
```
- Pro: Resource control, predictable
- Con: May underutilize or bottleneck

**Option B: Dynamic Scaling**
```
- Min: 1 agent
- Max: N agents (configurable)
- Scale up: pending tasks > running agents
- Scale down: idle agents timeout
```
- Pro: Adaptive
- Con: More complex

**Option C: Per-Task Configuration**
```jsonl
{"id":"bd-001","parallel":true,"max_instances":2}
{"id":"bd-002","parallel":false}  // singleton
```
- Pro: Fine-grained control
- Con: Config complexity

**Soru:** Kaç agent paralel çalışabilir? Kim karar verir?

---

### 3. Dependency Handling

**Current Bead Structure:**
```typescript
interface Bead {
  dependencies?: string[];  // IDs of blocking tasks
}
```

**Option A: Block Until Dependencies Complete**
```
Task A (no deps)     → Can start immediately
Task B (deps: [A])   → Blocked until A is closed
Task C (deps: [A,B]) → Blocked until A AND B closed
```

**Option B: Soft Dependencies (Warning Only)**
- Start anyway, but show warning
- User decides to proceed or wait

**Option C: DAG Visualization**
- Show dependency graph in TUI
- Auto-schedule based on topology
- Critical path highlighting

**Soru:** Circular dependency nasıl handle edilir?

---

### 4. Task Lifecycle

**Current Bead Statuses:**
- `open` → Available for assignment
- `in_progress` → Agent working on it
- `closed` → Completed
- `blocked` → Waiting on dependencies
- `tombstone` → Deleted/archived

**Proposed Flow:**
```
open → in_progress → closed
         ↓
       blocked (if deps not met)
         ↓
       open (when deps resolved)
```

**Soru:** Kim status güncelliyor? Agent mı, Chorus mu, Beads CLI mi?

---

### 5. Agent ↔ Task Communication

**Option A: File-based**
```
.beads/
├── issues.jsonl       # Task definitions
└── agent-output/
    └── bd-001.log     # Agent output for task bd-001
```

**Option B: In-Memory Only**
- Chorus tracks agent↔task mapping
- No persistent storage
- Lost on restart

**Option C: Beads CLI Integration**
- Use `beads assign bd-001 --agent agent-1`
- Use `beads update bd-001 --status in_progress`
- Pro: Single source of truth
- Con: External dependency

**Soru:** Output nereye yazılacak?

---

### 6. Error Handling

**Scenarios:**
1. Agent crashes mid-task
2. Task times out
3. Task fails (non-zero exit)
4. Agent killed by user

**Proposed Behavior:**
| Scenario | Task Status | Action |
|----------|-------------|--------|
| Agent crash | `open` | Re-queue for retry |
| Timeout | `blocked` | Mark as timeout, needs review |
| Exit code != 0 | `blocked` | Mark as failed, show error |
| User kill | `open` | Re-queue |

**Soru:** Max retry count? Exponential backoff?

---

### 7. UI/UX Considerations

**Task Panel Enhancements:**
- [ ] Show which agent is assigned
- [ ] Show dependency status (✓/⏳/✗)
- [ ] Filter: show only assignable tasks
- [ ] Sort: by priority, by dependency order

**Agent Panel Enhancements:**
- [ ] Show current task ID
- [ ] Show task progress (if available)
- [ ] Quick actions: pause, retry, cancel

**Keyboard Shortcuts:**
| Key | Current | Proposed |
|-----|---------|----------|
| Enter | - | Assign selected task to new agent |
| a | - | Auto-assign all ready tasks |
| p | - | Pause/resume orchestration |
| r | - | Retry failed task |

---

### 8. Configuration

**Proposed `.chorus.json`:**
```json
{
  "orchestration": {
    "maxAgents": 3,
    "autoAssign": true,
    "retryCount": 2,
    "taskTimeout": 300000,
    "agentCommand": "claude-code",
    "agentArgs": ["--task", "${TASK_ID}"]
  }
}
```

---

## Implementation Phases (Draft)

### Phase 4.1: Basic Assignment
- [ ] Enter key assigns task to agent
- [ ] Agent ID = Bead ID
- [ ] Update task status to in_progress
- [ ] Show assigned agent in TaskPanel

### Phase 4.2: Status Sync
- [ ] Agent exit → update task status
- [ ] Exit 0 → closed
- [ ] Exit != 0 → blocked
- [ ] Handle crash gracefully

### Phase 4.3: Dependency Check
- [ ] Block task if deps not closed
- [ ] Show dependency status in UI
- [ ] Auto-unblock when deps complete

### Phase 4.4: Parallel Execution
- [ ] Max agents configuration
- [ ] Queue management
- [ ] Auto-assign next task

### Phase 4.5: Error Recovery
- [ ] Retry logic
- [ ] Timeout handling
- [ ] Error reporting in UI

---

## Next Steps

1. **Tartış:** Yukarıdaki open question'ları cevapla
2. **Karar:** Hangi option'lar seçilecek
3. **Prototype:** En basit working version
4. **Iterate:** Feedback'e göre geliştir

---

## References

- Bead types: `src/types/bead.ts`
- Agent types: `src/types/agent.ts`
- BeadsService: `src/services/BeadsService.ts`
- AgentManager: `src/services/AgentManager.ts`
