# Case Management (Type System)

Native CaseStore for managing cases across the AXIOM Planning lifecycle.

---

## The Case Type System

Cases are categorized by maturity and type:

### Discovery Cases (produce more cases)

| Color | Type | Symbol | Description |
|-------|------|--------|-------------|
| ⬛ | Directive | `■` | Raw need (JTBD format) - the PRD |
| ⬜ | Draft | `□` | Plan draft, needs detailing |
| 🟧 | Research | `◆` | Investigation/spike needed |
| 🟪 | Pending | `◇` | Decision pending (user blocker) |
| 🟥 | Deferred | `▣` | Deferred, out of current scope |

### Implementation Cases (produce code)

| Color | Type | Symbol | Description |
|-------|------|--------|-------------|
| 🟦 | Operation | `▢` | Concrete feature (vertical slice) |
| 🟩 | Task | `▤` | Atomic case, ready to implement |

Task with `status: done` = Completed. Completed is a status, not a separate type.

### Knowledge Cases (capture discoveries)

| Color | Type | Symbol | Description |
|-------|------|--------|-------------|
| 🟡 | Discovery | `●` | Learning/Finding from implementation |

Discovery cases are created when agents emit discovery signals during Task execution.

---

## Status System

All cases share a universal status set:

| Status | Symbol | Description |
|--------|--------|-------------|
| `pending` | `→` | Ready to work |
| `active` | `●` | Currently being processed |
| `blocked` | `⊗` | Has blockers (Research/Pending dependencies) |
| `done` | `✓` | Completed/resolved |

### Task-Specific Extended Statuses

Task cases have additional execution-related statuses:

| Status | Symbol | Description |
|--------|--------|-------------|
| `failed` | `✗` | Agent error |
| `timeout` | `⏱` | Agent timed out |
| `review` | `◐` | Awaiting human review |

### Discovery-Specific Statuses

Discovery cases have knowledge-lifecycle statuses:

| Status | Symbol | Description |
|--------|--------|-------------|
| `active` | `●` | Currently valid, injected into prompts |
| `outdated` | `⚠` | May no longer be accurate, needs verification |
| `archived` | `◌` | Parent Task done, preserved but not injected |

---

## Case Data Model

```
Case
├── id: string              // See "Case ID Format" below
├── type: CaseType          // directive, draft, research, pending, deferred, operation, task, discovery
├── status: Status          // pending, active, blocked, done (+ type-specific statuses)
├── content: string         // JTBD for Directive, description for others
├── parentId: string | null // Lineage tracking
├── childIds: string[]      // Children created from this case
├── createdAt: string       // ISO 8601
├── updatedAt: string
├── history: HistoryEntry[] // All transitions and splits
└── metadata: CaseMetadata  // Type-specific data
```

### Type-Specific Metadata

```
DirectiveMetadata
├── jtbd: string            // "When..., I want..., so that..."
├── satisfied: boolean      // Is the original need met?
└── projectContext: object  // Existing project info (for existing projects)

DraftMetadata
├── clarifyingQuestions: string[]
└── splitCandidates: string[]

ResearchMetadata
├── researchQuestion: string
├── timeBox: number         // Hours allocated
├── findings: string[]
└── pocRequired: boolean    // Needs proof-of-concept?

PendingMetadata
├── question: string
├── options: Option[]       // Possible answers with trade-offs
└── decision: string | null // User's choice

OperationMetadata
├── acceptanceCriteria: string[]
├── fileHints: string[]
└── investScore: InvestCheck

TaskMetadata
├── acceptanceCriteria: string[]
├── assignee: string        // Agent ID when claimed
├── execution: TaskExecution
└── reviewCount: number

DiscoveryMetadata
├── scope: 'local' | 'global'        // Agent-specific or project-wide
├── category: string                  // performance, testing, architecture, etc.
├── sourceTaskId: string             // Which Task produced this discovery
├── sourceAgentId: string            // Which agent discovered it
├── impact: 'low' | 'medium' | 'high' | 'critical'
├── validated: boolean               // Has been verified
├── appliedTo: string[]              // Task IDs that used this discovery
└── supersededBy: string | null      // If replaced by newer discovery
```

### Task Execution Stats

```
TaskExecution
├── startedAt, completedAt, durationMs
├── iterations: number      // Execution Loop iterations
├── retryCount: number      // Restart count
├── workspace: string       // .workspaces/echo-001-task-xxx
├── branch: string          // agent/echo-001/task-xxx
├── finalCommit: string
├── testsPassed, testsTotal
├── verificationPassed: boolean
├── codeChanges: { filesChanged, linesAdded, linesRemoved }
├── lastError: string
└── signals: string[]       // ['PROGRESS:50', 'COMPLETE']
```

---

## Case ID Format

Case IDs follow the pattern: `{type-prefix}-{NNN}`

### Type Prefixes

| Type | Prefix | Example |
|------|--------|---------|
| Directive | `dir` | `dir-001` |
| Draft | `draft` | `draft-012` |
| Research | `res` | `res-003` |
| Pending | `pend` | `pend-001` |
| Deferred | `def` | `def-008` |
| Operation | `op` | `op-005` |
| Task | `task` | `task-042` |
| Discovery | `disc` | `disc-030` |

### Counter Mechanism

- Each type has its own independent counter
- Counters stored in `.axiom/metrics/counters.json`
- Counters increment monotonically, never reset
- Counters persist across AXIOM restarts

```json
{
  "dir": 1,
  "draft": 15,
  "res": 4,
  "pend": 2,
  "def": 8,
  "op": 12,
  "task": 47,
  "disc": 142
}
```

### Format Rules

| Rule | Description |
|------|-------------|
| Zero-padded | 3 digits minimum: `001`, `042`, `999` |
| Overflow | Extends beyond 999: `1000`, `1001` |
| Immutable | IDs never change once assigned |
| Unique | No two cases share the same ID |

### ID Assignment

IDs are assigned by Auditor Ash (event-driven):
1. Case creation event fires
2. Ash reads current counter for case type
3. Ash increments counter and generates ID
4. ID written atomically to case and counter file

---

## History Tracking

Every case maintains a complete history:

```
HistoryEntry
├── timestamp: string
├── type: 'transition' | 'split' | 'status_change' | 'update'
├── from: { type?, status? }
├── to: { type?, status? }
├── actor: string           // 'axel-001', 'user', 'system'
├── reason: string
└── childIds?: string[]     // For splits
```

### History Examples

**Transition (type change):**
```json
{
  "timestamp": "2026-01-15T10:00:00Z",
  "type": "transition",
  "from": { "type": "draft" },
  "to": { "type": "research" },
  "actor": "axel-001",
  "reason": "Research needed for auth library selection"
}
```

**Split (creates children):**
```json
{
  "timestamp": "2026-01-15T11:00:00Z",
  "type": "split",
  "actor": "axel-001",
  "reason": "Breaking feature into atomic tasks",
  "childIds": ["task-045", "task-046", "task-047"]
}
```

---

## Lineage Tracking

Every case knows its ancestry:

```
case-001 (Directive: "I want a blog")
├── case-002 (Draft: Blog post system)
│   ├── case-010 (Research: Markdown parser selection)
│   │   └── case-015 (Operation: rehype rendering) [transitioned from Research]
│   │       ├── task-020 (Task: Setup rehype) [status: done]
│   │       │   ├── disc-030 (Discovery: "rehype requires explicit config for GFM") [global]
│   │       │   └── disc-031 (Discovery: "Use unified() not rehype()") [local]
│   │       ├── task-021 (Task: Parse frontmatter) [status: done]
│   │       └── task-022 (Task: Render to HTML)
│   └── case-011 (Operation: View post)
│       ├── task-025 (Task: Post DB schema)
│       ├── task-026 (Task: GET /posts/[id] API)
│       └── task-027 (Task: PostDetail component)
└── case-003 (Pending: Self-host comments?)
    └── [awaiting user decision]
```

Discovery cases are always children of the Task that produced them.

---

## CaseStore Architecture

```
┌────────────────────────────────────────────────────────┐
│                      CaseStore                          │
│  (In-memory Map + JSONL persistence + EventEmitter)    │
├────────────────────────────────────────────────────────┤
│  Cases Map   │  Type Index   │  Lineage Graph          │
│ (in-memory)  │  (computed)   │  (parent-child links)   │
├────────────────────────────────────────────────────────┤
│  Events: 'change' | 'case:created' | 'case:updated'    │
│          'case:transitioned' | 'case:split'            │
│          'case:discovery_created' | 'case:discovery_outdated' │
└────────────────────────────────────────────────────────┘
            │
            │ Consumers
            ▼
  ┌─────────┬─────────┬────────────┬──────────┐
  │ Orch.   │  Web    │  Architect │  State  │
  │ Service │   UI    │    Axel    │ Machines │
  └─────────┴─────────┴────────────┴──────────┘
```

---

## CaseStore API

### CRUD Operations

| Method | Description |
|--------|-------------|
| `create(input)` | Create new case |
| `get(id)` | Get case by ID |
| `update(id, changes)` | Update case |
| `delete(id, reason)` | Soft-delete |

### Lifecycle Operations

| Method | Description |
|--------|-------------|
| `transition(id, newType, reason)` | Change type |
| `split(id, children)` | Create children from case |
| `claim(id, agentId)` | Claim Task for execution |
| `release(id)` | Release claimed Task |
| `complete(id, result)` | Mark done with result |
| `block(id, reason)` | Mark blocked |
| `defer(id)` | Move to Deferred |

### Query Operations

| Method | Description |
|--------|-------------|
| `byType(type)` | All cases of a type |
| `ready(type?)` | Ready for processing |
| `blocked()` | Blocked cases |
| `children(id)` | Direct children |
| `ancestors(id)` | All ancestors to Directive |
| `lineage(id)` | Full tree from Directive |
| `discoveriesByScope(scope)` | Discovery cases by scope (local/global) |
| `activeDiscoveries(agentId?)` | Active Discovery cases for injection |

---

## Discovery Case Lifecycle

Discovery cases capture learnings during Task execution:

```
Task (executing)
     │
     ├── Agent emits DISCOVERY_LOCAL signal
     │        │
     │        └── Cleo → Discovery case created
     │             ├── scope: local
     │             ├── parent: Task
     │             ├── status: active
     │             └── injected into same agent's prompts
     │
     └── Agent emits DISCOVERY_GLOBAL signal
              │
              └── Cleo → Discovery case created
                   ├── scope: global
                   ├── parent: Task
                   ├── status: active
                   └── injected into ALL agent prompts
```

### Discovery Status Transitions

```
active ──► outdated    // Affected files changed
   │           │
   │           └──► active (re-validated)
   │
   └──► archived       // Parent Task completed
```

### Discovery Log as Query View

The Discovery Log is not a separate file but a query on Discovery cases:

```
getDiscoveryLog():
  return caseStore
    .byType('discovery')
    .filter(d => d.metadata.scope === 'global')
    .sortBy('createdAt')
```

This ensures CaseStore is the single source of truth for all discoveries.

---

## JSONL Storage Format

Cases persisted to `.axiom/cases.jsonl`:

```json
{"id":"case-001","type":"directive","status":"active","content":"When I want to share...","parentId":null,"childIds":["case-002","case-003"],"createdAt":"2026-01-01T00:00:00Z",...}
{"id":"case-002","type":"draft","status":"pending","content":"Blog post system","parentId":"case-001","childIds":[],"createdAt":"2026-01-01T00:01:00Z",...}
```

---

## Dependency Rules

1. **Research unresolved** → downstream Operation/Task cannot start
2. **Pending unresolved** → that branch cannot progress
3. **Draft not split into Operation** → Task cannot be created
4. **Independent branches** → can progress in parallel
5. **Circular dependencies** → detected and blocked

```
calculateReady(cases):
  for case in cases:
    if case.type == 'task' && case.status == 'pending':
      parent = findParent(case)
      if parent.type == 'operation' && parent.status != 'blocked':
        siblings = findSiblings(case)
        researchDeps = siblings.filter(s => s.type == 'research' && s.status != 'done')
        pendingDeps = siblings.filter(s => s.type == 'pending' && s.status != 'done')
        if researchDeps.empty() && pendingDeps.empty():
          ready.push(case)
  return ready
```

---

## Circular Dependency Detection

### The Problem

Circular dependencies create deadlock where no Task can proceed:

```
Task A ──blocks──► Task B
   ▲                  │
   │                  │
   └────blocks────────┘

Both A and B are blocked forever.
```

### Detection Algorithm

CaseStore validates dependencies on every add/update:

```go
func (s *CaseStore) AddDependency(fromID, toID string) error {
    // Check if this would create a cycle
    if s.wouldCreateCycle(fromID, toID) {
        return &DependencyError{
            Code:    "CIRCULAR_DEPENDENCY",
            From:    fromID,
            To:      toID,
            Cycle:   s.findCycle(fromID, toID),
            Message: "Adding this dependency would create a circular reference",
        }
    }

    // Safe to add
    s.dependencies[fromID] = append(s.dependencies[fromID], toID)
    return nil
}

func (s *CaseStore) wouldCreateCycle(fromID, toID string) bool {
    // If toID can reach fromID, adding fromID→toID creates a cycle
    return s.canReach(toID, fromID)
}

func (s *CaseStore) canReach(startID, targetID string) bool {
    visited := make(map[string]bool)
    return s.dfs(startID, targetID, visited)
}

func (s *CaseStore) dfs(currentID, targetID string, visited map[string]bool) bool {
    if currentID == targetID {
        return true
    }
    if visited[currentID] {
        return false
    }
    visited[currentID] = true

    for _, depID := range s.dependencies[currentID] {
        if s.dfs(depID, targetID, visited) {
            return true
        }
    }
    return false
}
```

### Cycle Detection at Load Time

On startup, CaseStore validates all existing dependencies:

```go
func (s *CaseStore) ValidateDependencyGraph() []CycleError {
    var cycles []CycleError

    // Find all strongly connected components (SCCs) with >1 node
    sccs := s.findSCCs()  // Tarjan's algorithm

    for _, scc := range sccs {
        if len(scc) > 1 {
            cycles = append(cycles, CycleError{
                Code:    "CIRCULAR_DEPENDENCY_EXISTING",
                Cycle:   scc,
                Message: fmt.Sprintf("Circular dependency detected: %s", strings.Join(scc, " → ")),
            })
        }
    }

    return cycles
}
```

### Behavior on Detection

| When | Behavior |
|------|----------|
| Adding dependency | Reject with error, no change |
| Loading from JSONL | Log error, mark all cycle members as `blocked` |
| Web UI | Show cycle members with warning indicator |

### Web UI Indicator

Cases in a cycle show a special indicator:

```
┌──────────────────────────────────────┐
│  Tasks                               │
│  ─────────────────────────────────── │
│  ⚠ task-001   Setup auth    ⟳       │ ← Cycle indicator
│  ⚠ task-002   Add login     ⟳       │
│    task-003   Dashboard     →        │
└──────────────────────────────────────┘

Tooltip: "Circular dependency: task-001 → task-002 → task-001"
```

### Breaking Cycles

Users can break cycles via Web UI:

1. Select a case in the cycle
2. Click "Dependencies" panel
3. Remove one of the blocking dependencies
4. System recalculates ready status

```
┌─────────────────────────────────────────────────────────┐
│  Dependencies: task-001                                 │
│  ───────────────────────────────────────────────────── │
│  ⚠ CIRCULAR DEPENDENCY DETECTED                        │
│                                                         │
│  Cycle: task-001 → task-002 → task-001                 │
│                                                         │
│  Blocked by:                                            │
│    task-002  Add login page   [Remove]                 │
│                                                         │
│  Blocking:                                              │
│    task-002  Add login page   [Remove]                 │
└─────────────────────────────────────────────────────────┘
```

### Self-Dependency

A case cannot depend on itself:

```go
func (s *CaseStore) AddDependency(fromID, toID string) error {
    if fromID == toID {
        return &DependencyError{
            Code:    "SELF_DEPENDENCY",
            From:    fromID,
            Message: "A case cannot depend on itself",
        }
    }
    // ... rest of validation
}
```

---

## Crash Recovery

When AXIOM crashes, Task cases in "active" state have no running process.

### Recovery Flow

1. CaseStore loads
2. Find all Task cases with status = "active"
3. For each: status → "pending", retryCount++
4. Log recovery event in history
5. On re-claim: inject audit log into prompt

### What Survives

| Data | Location | Survives? |
|------|----------|-----------|
| Case state/metadata | `.axiom/cases.jsonl` | Yes |
| History | `.axiom/cases.jsonl` (embedded) | Yes |
| Code changes | `.workspaces/{agentId}-{taskId}/` | Yes |
| Agent memory | In-process | No |

---

## Parallel Agent Coordination

Multiple agents must not claim the same Task:

```
assignTasksToAgents(agents, store):
  claimedIds = []

  for agent in agents:
    task = store.ready('task').filter(
      t => !claimedIds.includes(t.id)
    )[0]

    if task:
      try:
        store.claim(task.id, agent.id)  // Atomic
        claimedIds.push(task.id)
        agent.startTask(task)
      catch AlreadyClaimedError:
        continue  // Race condition, retry
```

---

## Directive Satisfaction Check

After each Operation completion, Axel checks if Directive is satisfied:

```
checkDirectiveSatisfaction(directiveCase):
  allOperations = descendants(directiveCase).filter(type == 'operation')

  doneOperations = allOperations.filter(status == 'done')
  pendingOperations = allOperations.filter(status != 'done')

  if doneOperations covers original need:
    directiveCase.satisfied = true
    return 'complete'

  if pendingOperations.length > 0:
    return 'continue'

  // Need more planning
  return 'needs_more_operations'
```
