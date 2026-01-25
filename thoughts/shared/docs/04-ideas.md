# Idea Management (Color System)

Native IdeaStore for managing ideas across the Swarm Planning lifecycle.

---

## The Color System

Ideas are categorized by maturity and type:

### Discovery Ideas (produce more ideas)

| Color | Name | Symbol | Description |
|-------|------|--------|-------------|
| ⬛ | Black | `■` | Raw need (JTBD format) - the PRD |
| ⬜ | Gray | `□` | Plan draft, needs detailing |
| 🟧 | Orange | `◆` | Research/spike needed |
| 🟪 | Purple | `◇` | Decision pending (user blocker) |
| 🟥 | Red | `▣` | Deferred, out of current scope |

### Implementation Ideas (produce code)

| Color | Name | Symbol | Description |
|-------|------|--------|-------------|
| 🟦 | Blue | `▢` | Concrete feature (vertical slice) |
| 🟩 | Green | `▤` | Atomic idea, ready to implement |

Green with `status: done` = White (completed). White is a status, not a separate color.

### Knowledge Ideas (capture learnings)

| Color | Name | Symbol | Description |
|-------|------|--------|-------------|
| 🟡 | Yellow | `●` | Learning/Discovery from implementation |

Yellow ideas are created when agents emit learning signals during Green execution.

---

## Status System

All ideas share a universal status set:

| Status | Symbol | Description |
|--------|--------|-------------|
| `pending` | `→` | Ready to work |
| `active` | `●` | Currently being processed |
| `blocked` | `⊗` | Has blockers (Orange/Purple dependencies) |
| `done` | `✓` | Completed/resolved |

### Green-Specific Extended Statuses

Green ideas have additional execution-related statuses:

| Status | Symbol | Description |
|--------|--------|-------------|
| `failed` | `✗` | Agent error |
| `timeout` | `⏱` | Agent timed out |
| `review` | `◐` | Awaiting human review |

### Yellow-Specific Statuses

Yellow (learning) ideas have knowledge-lifecycle statuses:

| Status | Symbol | Description |
|--------|--------|-------------|
| `active` | `●` | Currently valid, injected into prompts |
| `outdated` | `⚠` | May no longer be accurate, needs verification |
| `archived` | `◌` | Parent Green done, preserved but not injected |

---

## Idea Data Model

```
Idea
├── id: string              // "idea-001", "idea-002"
├── color: Color            // black, gray, orange, purple, red, blue, green, yellow
├── status: Status          // pending, active, blocked, done (+ color-specific statuses)
├── content: string         // JTBD for Black, description for others
├── parentId: string | null // Lineage tracking
├── childIds: string[]      // Children created from this idea
├── createdAt: string       // ISO 8601
├── updatedAt: string
├── history: HistoryEntry[] // All transitions and splits
└── metadata: IdeaMetadata  // Color-specific data
```

### Color-Specific Metadata

```
BlackMetadata
├── jtbd: string            // "When..., I want..., so that..."
├── satisfied: boolean      // Is the original need met?
└── projectContext: object  // Existing project info (for existing projects)

GrayMetadata
├── clarifyingQuestions: string[]
└── splitCandidates: string[]

OrangeMetadata
├── researchQuestion: string
├── timeBox: number         // Hours allocated
├── findings: string[]
└── pocRequired: boolean    // Needs proof-of-concept?

PurpleMetadata
├── question: string
├── options: Option[]       // Possible answers with trade-offs
└── decision: string | null // User's choice

BlueMetadata
├── acceptanceCriteria: string[]
├── fileHints: string[]
└── investScore: InvestCheck

GreenMetadata
├── acceptanceCriteria: string[]
├── assignee: string        // Agent ID when claimed
├── execution: GreenExecution
└── reviewCount: number

YellowMetadata
├── scope: 'local' | 'global'        // Agent-specific or project-wide
├── category: string                  // performance, testing, architecture, etc.
├── sourceGreenId: string            // Which Green produced this learning
├── sourceAgentId: string            // Which agent discovered it
├── impact: 'low' | 'medium' | 'high' | 'critical'
├── validated: boolean               // Has been verified
├── appliedTo: string[]              // Green IDs that used this learning
└── supersededBy: string | null      // If replaced by newer learning
```

### Green Execution Stats

```
GreenExecution
├── startedAt, completedAt, durationMs
├── iterations: number      // Ralph loop iterations
├── retryCount: number      // Restart count
├── worktree: string        // .worktrees/ed-001-idea-xxx
├── branch: string          // agent/ed-001/idea-xxx
├── finalCommit: string
├── testsPassed, testsTotal
├── qualityPassed: boolean
├── codeChanges: { filesChanged, linesAdded, linesRemoved }
├── lastError: string
└── signals: string[]       // ['PROGRESS:50', 'COMPLETE']
```

---

## History Tracking

Every idea maintains a complete history:

```
HistoryEntry
├── timestamp: string
├── type: 'transition' | 'split' | 'status_change' | 'update'
├── from: { color?, status? }
├── to: { color?, status? }
├── actor: string           // 'pat-001', 'user', 'system'
├── reason: string
└── childIds?: string[]     // For splits
```

### History Examples

**Transition (color change):**
```json
{
  "timestamp": "2026-01-15T10:00:00Z",
  "type": "transition",
  "from": { "color": "gray" },
  "to": { "color": "orange" },
  "actor": "pat-001",
  "reason": "Research needed for auth library selection"
}
```

**Split (creates children):**
```json
{
  "timestamp": "2026-01-15T11:00:00Z",
  "type": "split",
  "actor": "pat-001",
  "reason": "Breaking feature into atomic tasks",
  "childIds": ["idea-045", "idea-046", "idea-047"]
}
```

---

## Lineage Tracking

Every idea knows its ancestry:

```
idea-001 (Black: "I want a blog")
├── idea-002 (Gray: Blog post system)
│   ├── idea-010 (Orange: Markdown parser selection)
│   │   └── idea-015 (Blue: rehype rendering) [transitioned from Orange]
│   │       ├── idea-020 (Green: Setup rehype) [status: done]
│   │       │   ├── idea-030 (Yellow: "rehype requires explicit config for GFM") [global]
│   │       │   └── idea-031 (Yellow: "Use unified() not rehype()") [local]
│   │       ├── idea-021 (Green: Parse frontmatter) [status: done]
│   │       └── idea-022 (Green: Render to HTML)
│   └── idea-011 (Blue: View post)
│       ├── idea-025 (Green: Post DB schema)
│       ├── idea-026 (Green: GET /posts/[id] API)
│       └── idea-027 (Green: PostDetail component)
└── idea-003 (Purple: Self-host comments?)
    └── [awaiting user decision]
```

Yellow ideas are always children of the Green that produced them.

---

## IdeaStore Architecture

```
┌────────────────────────────────────────────────────────┐
│                      IdeaStore                          │
│  (In-memory Map + JSONL persistence + EventEmitter)    │
├────────────────────────────────────────────────────────┤
│  Ideas Map  │  Color Index  │  Lineage Graph           │
│ (in-memory) │  (computed)   │  (parent-child links)    │
├────────────────────────────────────────────────────────┤
│  Events: 'change' | 'idea:created' | 'idea:updated'   │
│          'idea:transitioned' | 'idea:split'            │
│          'idea:yellow_created' | 'idea:yellow_outdated'│
└────────────────────────────────────────────────────────┘
            │
            │ Consumers
            ▼
  ┌─────────┬─────────┬────────────┬──────────┐
  │ Orch.   │  Web    │  Planner   │  State  │
  │ Service │   UI    │    Pat     │ Machines │
  └─────────┴─────────┴────────────┴──────────┘
```

---

## IdeaStore API

### CRUD Operations

| Method | Description |
|--------|-------------|
| `create(input)` | Create new idea |
| `get(id)` | Get idea by ID |
| `update(id, changes)` | Update idea |
| `delete(id, reason)` | Soft-delete |

### Lifecycle Operations

| Method | Description |
|--------|-------------|
| `transition(id, newColor, reason)` | Change color |
| `split(id, children)` | Create children from idea |
| `claim(id, agentId)` | Claim Green for execution |
| `release(id)` | Release claimed Green |
| `complete(id, result)` | Mark done with result |
| `block(id, reason)` | Mark blocked |
| `defer(id)` | Move to Red |

### Query Operations

| Method | Description |
|--------|-------------|
| `byColor(color)` | All ideas of a color |
| `ready(color?)` | Ready for processing |
| `blocked()` | Blocked ideas |
| `children(id)` | Direct children |
| `ancestors(id)` | All ancestors to Black |
| `lineage(id)` | Full tree from Black |
| `yellowsByScope(scope)` | Yellow ideas by scope (local/global) |
| `activeYellows(agentId?)` | Active Yellow ideas for injection |

---

## Yellow Idea Lifecycle

Yellow ideas capture learnings during Green execution:

```
Green (executing)
     │
     ├── Agent emits LEARNING_LOCAL signal
     │        │
     │        └── Lou → Yellow idea created
     │             ├── scope: local
     │             ├── parent: Green
     │             ├── status: active
     │             └── injected into same agent's prompts
     │
     └── Agent emits LEARNING_GLOBAL signal
              │
              └── Lou → Yellow idea created
                   ├── scope: global
                   ├── parent: Green
                   ├── status: active
                   └── injected into ALL agent prompts
```

### Yellow Status Transitions

```
active ──► outdated    // Affected files changed
   │           │
   │           └──► active (re-validated)
   │
   └──► archived       // Parent Green completed
```

### Discovery Log as Query View

The Discovery Log is not a separate file but a query on Yellow ideas:

```
getDiscoveryLog():
  return ideaStore
    .byColor('yellow')
    .filter(y => y.metadata.scope === 'global')
    .sortBy('createdAt')
```

This ensures IdeaStore is the single source of truth for all learnings.

---

## JSONL Storage Format

Ideas persisted to `.swarm/ideas.jsonl`:

```json
{"id":"idea-001","color":"black","status":"active","content":"When I want to share...","parentId":null,"childIds":["idea-002","idea-003"],"createdAt":"2026-01-01T00:00:00Z",...}
{"id":"idea-002","color":"gray","status":"pending","content":"Blog post system","parentId":"idea-001","childIds":[],"createdAt":"2026-01-01T00:01:00Z",...}
```

---

## Dependency Rules

1. **Orange unresolved** → downstream Blue/Green cannot start
2. **Purple unresolved** → that branch cannot progress
3. **Gray not split into Blue** → Green cannot be created
4. **Independent branches** → can progress in parallel

```
calculateReady(ideas):
  for idea in ideas:
    if idea.color == 'green' && idea.status == 'pending':
      parent = findParent(idea)
      if parent.color == 'blue' && parent.status != 'blocked':
        siblings = findSiblings(idea)
        orangeDeps = siblings.filter(s => s.color == 'orange' && s.status != 'done')
        purpleDeps = siblings.filter(s => s.color == 'purple' && s.status != 'done')
        if orangeDeps.empty() && purpleDeps.empty():
          ready.push(idea)
  return ready
```

---

## Crash Recovery

When Swarm crashes, Green ideas in "active" state have no running process.

### Recovery Flow

1. IdeaStore loads
2. Find all Green ideas with status = "active"
3. For each: status → "pending", retryCount++
4. Log recovery event in history
5. On re-claim: inject audit log into prompt

### What Survives

| Data | Location | Survives? |
|------|----------|-----------|
| Idea state/metadata | `.swarm/ideas.jsonl` | Yes |
| History | `.swarm/ideas.jsonl` (embedded) | Yes |
| Code changes | `.worktrees/{agentId}-{ideaId}/` | Yes |
| Agent memory | In-process | No |

---

## Parallel Agent Coordination

Multiple agents must not claim the same Green:

```
assignGreensToAgents(agents, store):
  claimedIds = []

  for agent in agents:
    green = store.ready('green').filter(
      g => !claimedIds.includes(g.id)
    )[0]

    if green:
      try:
        store.claim(green.id, agent.id)  // Atomic
        claimedIds.push(green.id)
        agent.startIdea(green)
      catch AlreadyClaimedError:
        continue  // Race condition, retry
```

---

## Black Idea Satisfaction Check

After each Blue completion, Pat checks if Black is satisfied:

```
checkBlackSatisfaction(blackIdea):
  allBlues = descendants(blackIdea).filter(color == 'blue')

  doneBlues = allBlues.filter(status == 'done')
  pendingBlues = allBlues.filter(status != 'done')

  if doneBlues covers original need:
    blackIdea.satisfied = true
    return 'complete'

  if pendingBlues.length > 0:
    return 'continue'

  // Need more planning
  return 'needs_more_blues'
```
