# Discovery System

Yellow ideas capture learnings during implementation. Discovery Log is a query view on global Yellow ideas.

---

## Yellow Ideas: Learnings as First-Class Citizens

Learnings are stored as **Yellow ideas** in the IdeaStore, not separate files. This provides:
- Unified data model with other ideas
- Lineage tracking (parent Green)
- History and metadata
- Single source of truth

| Type | Signal | Yellow Scope | Parent | Injection |
|------|--------|--------------|--------|-----------|
| Local | `LEARNING_LOCAL` | `local` | Current Green | Same agent only |
| Global | `LEARNING_GLOBAL` | `global` | Current Green | All agents |

---

## Learning Signals

Agents emit learning signals during work:

```
<swarm>LEARNING_LOCAL:This API requires authentication header</swarm>
<swarm>LEARNING_GLOBAL:All test files should use .test.ts extension</swarm>
```

### When to Emit

| Situation | Type | Example |
|-----------|------|---------|
| File-specific pattern | Local | "This module uses dependency injection" |
| Project convention | Global | "Tests use vitest, not jest" |
| Debugging insight | Local | "This error means X, fix with Y" |
| Architecture decision | Global | "All API routes in src/routes/" |

---

## Discovery Log as Query View

The Discovery Log is **not a separate file** but a query on Yellow ideas:

```go
func (s *IdeaStore) GetDiscoveryLog() []Yellow {
    yellows := s.ByColor("yellow")

    var globals []Yellow
    for _, y := range yellows {
        if y.Metadata.Scope == "global" {
            globals = append(globals, y)
        }
    }

    sort.Slice(globals, func(i, j int) bool {
        return globals[i].CreatedAt.Before(globals[j].CreatedAt)
    })

    return globals
}
```

This ensures IdeaStore remains the single source of truth.

### Yellow Idea Structure

See [04-ideas.md](./04-ideas.md#color-specific-metadata) for full `YellowMetadata` structure.

Key fields: `scope` (local/global), `sourceGreenId`, `sourceAgentId`, `impact`, `validated`, `appliedTo`, `supersededBy`.

### Impact Classification

| Level | Description | Example |
|-------|-------------|---------|
| `low` | Nice to know | "Use const over let when possible" |
| `medium` | Affects implementation | "This hook requires cleanup" |
| `high` | Affects architecture | "All API calls go through gateway" |
| `critical` | Blocks progress if ignored | "Auth token expires after 1 hour" |

---

## Logger Lou

Lou creates Yellow ideas from learning signals. Lou runs as a queue-managed goroutine to ensure sequential processing and prevent duplicate races.

### Lou Queue Mechanism

```go
type LouQueue struct {
    queue      chan LearningSignal
    ideaStore  *IdeaStore
    seenHashes map[string]bool
    mu         sync.Mutex
}

func NewLouQueue(store *IdeaStore) *LouQueue {
    lq := &LouQueue{
        queue:      make(chan LearningSignal, 100),
        ideaStore:  store,
        seenHashes: make(map[string]bool),
    }
    go lq.processLoop()
    return lq
}

func (lq *LouQueue) Enqueue(signal LearningSignal) {
    lq.queue <- signal
}

func (lq *LouQueue) processLoop() {
    for signal := range lq.queue {
        if err := lq.processSignal(signal); err != nil {
            log.Error("Lou processing error", "error", err)
        }
    }
}

func (lq *LouQueue) processSignal(signal LearningSignal) error {
    // Deduplication check
    hash := hashContent(signal.Content)
    lq.mu.Lock()
    if lq.seenHashes[hash] {
        lq.mu.Unlock()
        return nil // Skip duplicate
    }
    lq.seenHashes[hash] = true
    lq.mu.Unlock()

    // Create Yellow idea
    return lq.ideaStore.CreateYellow(signal)
}
```

Sequential processing prevents duplicate detection races and ensures consistent ordering.

### Lou Workflow

```
LEARNING signal received
     │
     ▼
Extract content + context (greenId, agentId)
     │
     ▼
Deduplicate (content hash)
     │
     ├── Duplicate ──► Skip
     │
     └── New ──► Create Yellow Idea
                   │
                   ▼
          ideaStore.create({
            color: 'yellow',
            content: signal.content,
            parentId: greenId,
            metadata: {
              scope: signal.type === 'LEARNING_LOCAL' ? 'local' : 'global',
              sourceGreenId: greenId,
              sourceAgentId: agentId,
              impact: classifyImpact(content),
              validated: false,
              appliedTo: [],
              supersededBy: null
            }
          })
                   │
                   ▼
          Emit 'idea:yellow_created' event
                   │
                   ▼
          Regenerate learnings.md views
                   │
                   ▼
          Notify active agents (prompt injection)
```

---

## Deduplication

Learnings are deduplicated using content hash:

```
normalize(content):
  return content.toLowerCase().trim()

hash(content):
  return sha256(normalize(content))

shouldStore(learning):
  h = hash(learning.content)
  if h in seenHashes:
    return false
  seenHashes.add(h)
  return true
```

---

## Storage Format

### Primary Storage: IdeaStore (ideas.jsonl)

Yellow ideas are stored alongside other ideas in `.swarm/ideas.jsonl`:

```json
{"id":"idea-030","color":"yellow","status":"active","content":"rehype requires explicit config for GFM","parentId":"idea-020","metadata":{"scope":"global","sourceGreenId":"idea-020","sourceAgentId":"ed-001","impact":"high","validated":true,"appliedTo":["idea-021","idea-022"],"supersededBy":null}}
{"id":"idea-031","color":"yellow","status":"archived","content":"Use unified() not rehype()","parentId":"idea-020","metadata":{"scope":"local","sourceGreenId":"idea-020","sourceAgentId":"ed-001","impact":"medium","validated":false,"appliedTo":[],"supersededBy":null}}
```

### View Files (Generated from IdeaStore)

These files are **regenerated views**, not primary storage:

**Project Learnings (learnings.md)** - View of global Yellow ideas:

```markdown
# Project Learnings

## Architecture
- [idea-030] rehype requires explicit config for GFM
- [idea-035] All API routes defined in `src/routes/`

## Testing
- [idea-040] Tests use Vitest, not Jest
```

**Agent Learnings (agents/{persona}/learnings.md)** - View of local Yellow ideas:

```markdown
# Ed Learnings

## Patterns Observed
- [idea-031] Use unified() not rehype()
- [idea-032] This hook requires cleanup function
```

Each entry includes Yellow idea ID for traceability.

---

## Learning Injection

Yellow ideas are injected into agent prompts based on scope and status:

### Injection Query

```go
func (s *IdeaStore) GetInjectableLearnings(agentID string) []Yellow {
    yellows := s.ByColor("yellow")

    var result []Yellow

    // Global learnings (available to all agents)
    for _, y := range yellows {
        if y.Metadata.Scope == "global" && y.Status == "active" {
            result = append(result, y)
        }
    }

    // Local learnings (specific to this agent)
    for _, y := range yellows {
        if y.Metadata.Scope == "local" &&
           y.Metadata.SourceAgentID == agentID &&
           y.Status == "active" {
            result = append(result, y)
        }
    }

    return result
}
```

### Prompt Template

```
# Project Learnings (Global)

{formatted active Yellow ideas with scope: global}

# Your Learnings (Local)

{formatted active Yellow ideas with scope: local for this agent}
```

### Archived Yellow Ideas

When a Green completes (status: done), its child Yellow ideas transition to `archived`:
- They are preserved in IdeaStore for history
- They are NOT injected into prompts
- They can be queried for retrospective analysis

---

## Learning Review

The Learning Review panel shows recent Yellow ideas with source info (agent, parent Green, timestamp). Users can:
- Edit Yellow idea content
- Delete Yellow idea (soft-delete)
- Promote local → global (change scope in metadata)
- Mark as validated
- Mark as outdated

---

## Learning Promotion

Local Yellow ideas can be promoted to global by updating metadata:

```
promoteYellow(yellowId):
  ideaStore.update(yellowId, {
    metadata: {
      ...existing,
      scope: 'global'  // Change from 'local' to 'global'
    }
  })
  emit 'idea:updated' event
  regenerate view files
  notify active agents
```

The Yellow idea stays in IdeaStore with same ID - only scope changes.

---

## Learning Categories

| Category | Examples |
|----------|----------|
| Architecture | File locations, module structure |
| Conventions | Naming, formatting, patterns |
| Testing | Framework, patterns, assertions |
| Errors | Common issues, fixes |
| API | Endpoints, formats, auth |
| Dependencies | Libraries, versions, quirks |

---

## Outdated Yellow Detection

Lou detects when Yellow ideas become outdated:

```
checkOutdated(yellow, recentCommits):
  // Check if files mentioned in Yellow content were modified
  affectedFiles = extractFilePaths(yellow.content)

  for commit in recentCommits:
    if commit.files.intersects(affectedFiles):
      ideaStore.update(yellow.id, { status: 'outdated' })
      emit 'idea:yellow_outdated'
      return {
        outdated: true,
        reason: 'affected files modified',
        commit: commit.hash
      }

  // Check if contradicting Yellow exists
  newer = findNewerYellow(yellow)
  if newer && contradicts(yellow, newer):
    ideaStore.update(yellow.id, {
      status: 'outdated',
      metadata: { ...yellow.metadata, supersededBy: newer.id }
    })
    return {
      outdated: true,
      reason: 'superseded by newer learning',
      supersededBy: newer.id
    }

  return { outdated: false }
```

Outdated Yellow ideas are flagged for review, not auto-deleted. They remain in IdeaStore with `status: outdated`.

---

## Cross-Agent Propagation

When global Yellow idea is created:
1. Lou creates Yellow in IdeaStore
2. Emits `idea:yellow_created` event
3. Regenerates learnings.md view
4. Active agents notified (via state machine event)
5. Next prompt injection includes new Yellow
6. No agent restart required

---

## Yellow Lifecycle Timing

Detailed timeline of Yellow idea state changes:

### Creation

```
Agent emits LEARNING signal
     │
     ▼ (immediate)
Lou receives signal via event queue
     │
     ▼ (< 100ms)
Deduplication check (content hash)
     │
     ├── Duplicate → Skip, log
     │
     └── New → Create Yellow idea
                    │
                    ▼ (immediate)
               status: 'active'
               injected into prompts
```

### Active Phase

| Trigger | Timing | Action |
|---------|--------|--------|
| New prompt assembly | On each iteration | Yellow injected if `status: active` |
| File modification | On commit | Check if Yellow mentions modified file |
| Newer contradicting Yellow | On Yellow creation | Mark as superseded |
| User marks outdated | Manual | `status: outdated` |

### Archival

```
Parent Green completes (status: done)
     │
     ▼ (immediate, same transaction)
All child Yellow ideas archived
     │
     ▼
status: 'active' → 'archived'
     │
     ├── Still in IdeaStore (history)
     ├── NOT injected into prompts
     └── Visible in Learning Review panel
```

**Archival Logic:**

```go
func onGreenComplete(greenID string) {
    // Find all Yellow ideas with this Green as parent
    yellows := ideaStore.Query(IdeaQuery{
        Color:    "yellow",
        ParentID: greenID,
        Status:   "active",
    })

    for _, yellow := range yellows {
        ideaStore.Update(yellow.ID, IdeaUpdate{
            Status: "archived",
            Metadata: map[string]any{
                "archivedAt":     time.Now(),
                "archivedReason": "parent_green_completed",
            },
        })
    }
}
```

### Status Transitions

```
           ┌─────────────────────────────────────┐
           │                                     │
           ▼                                     │
     ┌──────────┐                          ┌─────────┐
     │  active  │───── outdated ──────────►│ outdated│
     └────┬─────┘                          └─────────┘
          │                                     │
          │ parent Green done                   │ user confirms
          ▼                                     ▼
     ┌──────────┐                          ┌─────────┐
     │ archived │◄─────────────────────────│ deleted │
     └──────────┘       (soft delete)      └─────────┘
```

### Timing Summary

| Event | When | Duration |
|-------|------|----------|
| Signal → Yellow created | Immediate | < 100ms |
| Yellow → Injected | Next iteration | 0-30s (depends on iteration timing) |
| Green done → Yellow archived | Same transaction | Immediate |
| File changed → Outdated check | On commit detection | < 1s |
| User action → Status change | Manual | Immediate |

### Resurrection

Archived Yellow ideas can be resurrected:

```go
func resurrectYellow(yellowID string) error {
    yellow, err := ideaStore.Get(yellowID)
    if err != nil {
        return err
    }

    if yellow.Status != "archived" {
        return errors.New("can only resurrect archived yellows")
    }

    return ideaStore.Update(yellowID, IdeaUpdate{
        Status: "active",
        Metadata: map[string]any{
            "resurrectedAt": time.Now(),
            "resurrectedBy": "user", // or "system" for auto-resurrect
        },
    })
}
```

Use case: Learning discovered in one Green is still relevant for future work.

---

## Yellow Idea Metrics

| Metric | Description |
|--------|-------------|
| Total Yellow ideas | `ideaStore.byColor('yellow').length` |
| Active vs archived | Distribution by status |
| Local vs global | Distribution by scope |
| Duplicates prevented | Dedup hash collision count |
| Source Greens | Which Greens produced Yellow children |
| Injection rate | Yellow ideas injected per prompt |
| Impact distribution | Low/medium/high/critical counts |
| Validation rate | `validated: true` percentage |
| Outdated rate | `status: outdated` percentage |
