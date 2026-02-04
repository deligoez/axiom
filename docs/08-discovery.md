# Discovery System

Discovery cases capture learnings during implementation. Discovery Log is a query view on global Discovery cases.

---

## Discovery Cases: Learnings as First-Class Citizens

Learnings are stored as **Discovery cases** in the CaseStore, not separate files. This provides:
- Unified data model with other cases
- Lineage tracking (parent Task)
- History and metadata
- Single source of truth

### Discoveries in the Spec Canvas

Discovery cases are represented as **🟡 Yellow annotations** in the spec canvas. Unlike other colors that consume spec text, discoveries are **appended as notes** to related regions:

```markdown
<!--@ax:0-45:green:task-001-->Users should be able to login with email/password.<!--/@ax-->
<!--@ax-discovery:task-001:disc-012-->Note: Safari requires SameSite=None for cookies<!--/@ax-->
```

This creates a layered view where green (implemented) regions can have yellow (discovery) annotations attached.

| Type | Signal | Discovery Scope | Parent | Injection |
|------|--------|-----------------|--------|-----------|
| Local | `DISCOVERY_LOCAL` | `local` | Current Task | Same agent only |
| Global | `DISCOVERY_GLOBAL` | `global` | Current Task | All agents |

---

## Discovery Signals

Agents emit discovery signals during work:

```
<axiom>DISCOVERY_LOCAL:This API requires authentication header</axiom>
<axiom>DISCOVERY_GLOBAL:All test files should use .test.ts extension</axiom>
```

### When to Emit

| Situation | Type | Example |
|-----------|------|---------|
| File-specific pattern | Local | "This module uses dependency injection" |
| Project convention | Global | "Tests use vitest, not jest" |
| Debugging insight | Local | "This error means X, fix with Y" |
| Architecture decision | Global | "All API routes in src/routes/" |

### Writing Quality Discoveries

**High-value discoveries:**
- "This API has rate limiting of 100/hour - cache responses"
- "TypeScript strict mode causes false positives with JSON imports - use type assertion"
- "Test database must be seeded before auth tests run"
- "The retry logic in http.ts expects exponential backoff"

**Characteristics of good discoveries:**
| Quality | Description |
|---------|-------------|
| **Actionable** | Tells what to do, not just what exists |
| **Specific** | Mentions exact files, functions, values |
| **Non-obvious** | Not already in docs/README |
| **Time-saving** | Prevents repeating mistakes |

**Low-value discoveries to avoid:**
- "Fixed the bug" (not reusable)
- "Tests should pass" (obvious)
- "Good code is better" (vague)
- "This file is important" (no actionable info)

### Local vs Global Decision

| Choose | When |
|--------|------|
| **Local** | Personal debugging notes, approach that worked for this task, context-specific tricks |
| **Global** | Architectural constraints, performance bottlenecks, API quirks, test setup requirements |

**Rule of thumb:** If 3+ agents would benefit, make it global.

---

## Discovery Log as Query View

The Discovery Log is **not a separate file** but a query on Discovery cases:

```go
func (s *CaseStore) GetDiscoveryLog() []Discovery {
    discoveries := s.ByType("discovery")

    var globals []Discovery
    for _, d := range discoveries {
        if d.Metadata.Scope == "global" {
            globals = append(globals, d)
        }
    }

    sort.Slice(globals, func(i, j int) bool {
        return globals[i].CreatedAt.Before(globals[j].CreatedAt)
    })

    return globals
}
```

This ensures CaseStore remains the single source of truth.

### Discovery Case Structure

See [04-cases.md](./04-cases.md#type-specific-metadata) for full `DiscoveryMetadata` structure.

Key fields: `scope` (local/global), `sourceTaskId`, `sourceAgentId`, `impact`, `validated`, `appliedTo`, `supersededBy`.

### Discovery ID Format

Discovery case IDs follow the format: `disc-{NNN}`

| Component | Description |
|-----------|-------------|
| `disc` | Type prefix (Discovery) |
| `-` | Separator |
| `NNN` | Zero-padded 3-digit counter (001-999) |

**Examples:** `disc-001`, `disc-030`, `disc-142`

**Counter mechanism:**
- Counter stored in `.axiom/metrics/counters.json` under `"discovery"` key
- Increments monotonically on each new Discovery case
- Never resets (survives AXIOM restarts)
- Cleo manages counter as part of Discovery creation

```json
{
  "ava": 5,
  "echo": 47,
  "discovery": 142
}
```

When counter exceeds 999, format extends: `disc-1000`, `disc-1001`, etc.

### Impact Classification

| Level | Description | Example |
|-------|-------------|---------|
| `low` | Nice to know | "Use const over let when possible" |
| `medium` | Affects implementation | "This hook requires cleanup" |
| `high` | Affects architecture | "All API calls go through gateway" |
| `critical` | Blocks progress if ignored | "Auth token expires after 1 hour" |

---

## Curator Cleo

Cleo creates Discovery cases from discovery signals. Cleo runs as a queue-managed goroutine to ensure sequential processing and prevent duplicate races.

### Cleo Queue Mechanism

```go
type CleoQueue struct {
    queue      chan DiscoverySignal
    caseStore  *CaseStore
    seenHashes map[string]bool
    mu         sync.Mutex
}

func NewCleoQueue(store *CaseStore) *CleoQueue {
    cq := &CleoQueue{
        queue:      make(chan DiscoverySignal, 100),
        caseStore:  store,
        seenHashes: make(map[string]bool),
    }
    go cq.processLoop()
    return cq
}

func (cq *CleoQueue) Enqueue(signal DiscoverySignal) {
    cq.queue <- signal
}

func (cq *CleoQueue) processLoop() {
    for signal := range cq.queue {
        if err := cq.processSignal(signal); err != nil {
            log.Error("Cleo processing error", "error", err)
        }
    }
}

func (cq *CleoQueue) processSignal(signal DiscoverySignal) error {
    // Deduplication check
    hash := hashContent(signal.Content)
    cq.mu.Lock()
    if cq.seenHashes[hash] {
        cq.mu.Unlock()
        return nil // Skip duplicate
    }
    cq.seenHashes[hash] = true
    cq.mu.Unlock()

    // Create Discovery case
    return cq.caseStore.CreateDiscovery(signal)
}
```

Sequential processing prevents duplicate detection races and ensures consistent ordering.

### Cleo Workflow

```
DISCOVERY signal received
     │
     ▼
Extract content + context (taskId, agentId)
     │
     ▼
Deduplicate (content hash)
     │
     ├── Duplicate ──► Skip
     │
     └── New ──► Create Discovery Case
                   │
                   ▼
          caseStore.create({
            type: 'discovery',
            content: signal.content,
            parentId: taskId,
            metadata: {
              scope: signal.type === 'DISCOVERY_LOCAL' ? 'local' : 'global',
              sourceTaskId: taskId,
              sourceAgentId: agentId,
              impact: classifyImpact(content),
              validated: false,
              appliedTo: [],
              supersededBy: null
            }
          })
                   │
                   ▼
          Emit 'case:discovery_created' event
                   │
                   ▼
          Regenerate discoveries.md views
                   │
                   ▼
          Notify active agents (prompt injection)
```

See [05-agents.md](./05-agents.md#curator-cleo) for Cleo's persona details and agent lifecycle.

---

## Deduplication

Discoveries are deduplicated using content hash:

```
normalize(content):
  return content.toLowerCase().trim()

hash(content):
  return sha256(normalize(content))

shouldStore(discovery):
  h = hash(discovery.content)
  if h in seenHashes:
    return false
  seenHashes.add(h)
  return true
```

---

## Storage Format

### Primary Storage: CaseStore (cases.jsonl)

Discovery cases are stored alongside other cases in `.axiom/cases.jsonl`:

```json
{"id":"disc-030","type":"discovery","status":"active","content":"rehype requires explicit config for GFM","parentId":"task-020","metadata":{"scope":"global","sourceTaskId":"task-020","sourceAgentId":"echo-001","impact":"high","validated":true,"appliedTo":["task-021","task-022"],"supersededBy":null}}
{"id":"disc-031","type":"discovery","status":"archived","content":"Use unified() not rehype()","parentId":"task-020","metadata":{"scope":"local","sourceTaskId":"task-020","sourceAgentId":"echo-001","impact":"medium","validated":false,"appliedTo":[],"supersededBy":null}}
```

### View Files (Generated from CaseStore)

These files are **regenerated views**, not primary storage:

**Project Discoveries (discoveries.md)** - View of global Discovery cases:

```markdown
# Project Discoveries

## Architecture
- [disc-030] rehype requires explicit config for GFM
- [disc-035] All API routes defined in `src/routes/`

## Testing
- [disc-040] Tests use Vitest, not Jest
```

**Agent Discoveries (agents/{persona}/discoveries.md)** - View of local Discovery cases:

```markdown
# Echo Discoveries

## Patterns Observed
- [disc-031] Use unified() not rehype()
- [disc-032] This hook requires cleanup function
```

Each entry includes Discovery case ID for traceability.

### View Generation Algorithm

Views are regenerated from CaseStore on specific triggers:

**Triggers:**
- Discovery case created
- Discovery case updated (scope change, status change)
- Discovery case archived
- Manual refresh request

**Generation pseudocode:**

```
regenerateViews():
  // Global view: .axiom/discoveries.md
  globalDiscoveries = caseStore.query({
    type: 'discovery',
    'metadata.scope': 'global',
    status: ['active', 'outdated']
  })

  groupedByCategory = groupBy(globalDiscoveries, classifyCategory)
  sortedByCreatedAt = sortEach(groupedByCategory, 'createdAt', 'asc')

  writeMarkdown('.axiom/discoveries.md', formatGlobalView(sortedByCreatedAt))

  // Agent views: .axiom/agents/{persona}/discoveries.md
  for persona in getActivePersonas():
    agentDiscoveries = caseStore.query({
      type: 'discovery',
      'metadata.scope': 'local',
      'metadata.sourceAgentId': startsWithPersona(persona),
      status: 'active'
    })

    sortedByCreatedAt = sort(agentDiscoveries, 'createdAt', 'asc')
    writeMarkdown(
      '.axiom/agents/{persona}/discoveries.md',
      formatAgentView(sortedByCreatedAt)
    )

classifyCategory(discovery):
  // Heuristic categorization based on content keywords
  if mentions(['api', 'route', 'endpoint']): return 'API'
  if mentions(['test', 'vitest', 'jest']): return 'Testing'
  if mentions(['schema', 'database', 'migration']): return 'Database'
  if mentions(['component', 'ui', 'css']): return 'Frontend'
  return 'Architecture'  // default category
```

**Atomic write:** Views are written atomically (write to temp file, then rename) to prevent partial reads.

---

## Discovery Injection

Discovery cases are injected into agent prompts based on scope and status:

### Injection Query

```go
func (s *CaseStore) GetInjectableDiscoveries(agentID string) []Discovery {
    discoveries := s.ByType("discovery")

    var result []Discovery

    // Global discoveries (available to all agents)
    for _, d := range discoveries {
        if d.Metadata.Scope == "global" && d.Status == "active" {
            result = append(result, d)
        }
    }

    // Local discoveries (specific to this agent)
    for _, d := range discoveries {
        if d.Metadata.Scope == "local" &&
           d.Metadata.SourceAgentID == agentID &&
           d.Status == "active" {
            result = append(result, d)
        }
    }

    return result
}
```

### Prompt Template

```
# Project Discoveries (Global)

{formatted active Discovery cases with scope: global}

# Your Discoveries (Local)

{formatted active Discovery cases with scope: local for this agent}
```

### Archived Discovery Cases

When a Task completes (status: done), its child Discovery cases transition to `archived`:
- They are preserved in CaseStore for history
- They are NOT injected into prompts
- They can be queried for Debrief analysis

---

## Discovery Review

The Discovery Review panel shows recent Discovery cases with source info (agent, parent Task, timestamp). Users can:
- Edit Discovery case content
- Delete Discovery case (soft-delete)
- Promote local → global (change scope in metadata)
- Mark as validated
- Mark as outdated

---

## Discovery Promotion

Local Discovery cases can be promoted to global by updating metadata:

```
promoteDiscovery(discoveryId):
  caseStore.update(discoveryId, {
    metadata: {
      ...existing,
      scope: 'global'  // Change from 'local' to 'global'
    }
  })
  emit 'case:updated' event
  regenerate view files
  notify active agents
```

The Discovery case stays in CaseStore with same ID - only scope changes.

---

## Discovery Categories

| Category | Examples |
|----------|----------|
| Architecture | File locations, module structure |
| Conventions | Naming, formatting, patterns |
| Testing | Framework, patterns, assertions |
| Errors | Common issues, fixes |
| API | Endpoints, formats, auth |
| Dependencies | Libraries, versions, quirks |

---

## Outdated Discovery Detection

Cleo detects when Discovery cases become outdated through multiple mechanisms.

### Detection Triggers

| Trigger | When | Check Type |
|---------|------|------------|
| Post-merge | After any branch merge | File-based |
| Periodic | Every 5 minutes during active session | File + contradiction |
| On discovery creation | When new Discovery added | Contradiction only |
| Manual | User requests validation | All checks |

### File Path Extraction

Discovery content is scanned for file paths:

```
extractFilePaths(content):
  patterns = [
    /`([^`]+\.(ts|tsx|js|jsx|go|py|rs|md))`/,  // Backtick paths
    /\b(src\/[^\s]+)/,                          // src/ paths
    /\b(\w+\/\w+\.\w+)/,                        // dir/file.ext patterns
    /in\s+`?([^`\s]+\.\w+)`?/                   // "in file.ts" patterns
  ]

  paths = []
  for pattern in patterns:
    matches = content.matchAll(pattern)
    paths.extend(matches)

  return unique(paths)
```

### Core Detection Algorithm

```
checkOutdated(discovery, recentCommits):
  // Check if files mentioned in Discovery content were modified
  affectedFiles = extractFilePaths(discovery.content)

  for commit in recentCommits:
    if commit.files.intersects(affectedFiles):
      caseStore.update(discovery.id, { status: 'outdated' })
      emit 'case:discovery_outdated'
      return {
        outdated: true,
        reason: 'affected files modified',
        commit: commit.hash
      }

  // Check if contradicting Discovery exists
  newer = findNewerDiscovery(discovery)
  if newer && contradicts(discovery, newer):
    caseStore.update(discovery.id, {
      status: 'outdated',
      metadata: { ...discovery.metadata, supersededBy: newer.id }
    })
    return {
      outdated: true,
      reason: 'superseded by newer discovery',
      supersededBy: newer.id
    }

  return { outdated: false }
```

### Contradiction Detection

Two discoveries contradict if they:
1. Reference the same file(s) or concept
2. Make incompatible claims

```
contradicts(older, newer):
  // Same files referenced?
  olderFiles = extractFilePaths(older.content)
  newerFiles = extractFilePaths(newer.content)

  if not olderFiles.intersects(newerFiles):
    // Check for semantic overlap (keyword matching)
    olderKeywords = extractKeywords(older.content)
    newerKeywords = extractKeywords(newer.content)

    if overlap(olderKeywords, newerKeywords) < 0.3:
      return false  // Different topics

  // Look for contradiction signals
  contradictionPatterns = [
    (older contains "use X", newer contains "don't use X"),
    (older contains "requires", newer contains "doesn't require"),
    (older contains "always", newer contains "never"),
    (older contains "should", newer contains "shouldn't")
  ]

  for pattern in contradictionPatterns:
    if pattern.matches(older.content, newer.content):
      return true

  // Default: same topic, different content = potential contradiction
  if similarity(older.content, newer.content) < 0.7:
    return true  // Different enough to be contradiction

  return false
```

### Recent Commits Definition

"Recent commits" = commits since the Discovery was created or last validated:

```
getRecentCommits(discovery):
  since = discovery.metadata.validatedAt
         ?? discovery.createdAt

  return git.log({
    since: since,
    paths: extractFilePaths(discovery.content)  // Scoped to relevant files
  })
```

### Outdated Status Handling

Outdated Discovery cases are flagged for review, not auto-deleted. They remain in CaseStore with `status: outdated`.

| Action | Effect |
|--------|--------|
| Mark outdated | Status → `outdated`, not injected into prompts |
| User confirms | Delete or update content, reset to `active` |
| Auto-archive | After 7 days if unreviewed (configurable) |

---

## Cross-Agent Propagation

When global Discovery case is created:
1. Cleo creates Discovery in CaseStore
2. Emits `case:discovery_created` event
3. Regenerates discoveries.md view
4. Active agents notified (via state machine event)
5. Next prompt injection includes new Discovery
6. No agent restart required

---

## Discovery Lifecycle Timing

Detailed timeline of Discovery case state changes:

### Creation

```
Agent emits DISCOVERY signal
     │
     ▼ (immediate)
Cleo receives signal via event queue
     │
     ▼ (< 100ms)
Deduplication check (content hash)
     │
     ├── Duplicate → Skip, log
     │
     └── New → Create Discovery case
                    │
                    ▼ (immediate)
               status: 'active'
               injected into prompts
```

### Active Phase

| Trigger | Timing | Action |
|---------|--------|--------|
| New prompt assembly | On each iteration | Discovery injected if `status: active` |
| File modification | On commit | Check if Discovery mentions modified file |
| Newer contradicting Discovery | On Discovery creation | Mark as superseded |
| User marks outdated | Manual | `status: outdated` |

### Archival

```
Parent Task completes (status: done)
     │
     ▼ (immediate, same transaction)
All child Discovery cases archived
     │
     ▼
status: 'active' → 'archived'
     │
     ├── Still in CaseStore (history)
     ├── NOT injected into prompts
     └── Visible in Discovery Review panel
```

**Archival Logic:**

```go
func onTaskComplete(taskID string) {
    // Find all Discovery cases with this Task as parent
    discoveries := caseStore.Query(CaseQuery{
        Type:     "discovery",
        ParentID: taskID,
        Status:   "active",
    })

    for _, discovery := range discoveries {
        caseStore.Update(discovery.ID, CaseUpdate{
            Status: "archived",
            Metadata: map[string]any{
                "archivedAt":     time.Now(),
                "archivedReason": "parent_task_completed",
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
          │ parent Task done                    │ user confirms
          ▼                                     ▼
     ┌──────────┐                          ┌─────────┐
     │ archived │◄─────────────────────────│ deleted │
     └──────────┘       (soft delete)      └─────────┘
```

### Timing Summary

| Event | When | Duration |
|-------|------|----------|
| Signal → Discovery created | Immediate | < 100ms |
| Discovery → Injected | Next iteration | 0-30s (depends on iteration timing) |
| Task done → Discovery archived | Same transaction | Immediate |
| File changed → Outdated check | On commit detection | < 1s |
| User action → Status change | Manual | Immediate |

### Resurrection

Archived Discovery cases can be resurrected:

```go
func resurrectDiscovery(discoveryID string) error {
    discovery, err := caseStore.Get(discoveryID)
    if err != nil {
        return err
    }

    if discovery.Status != "archived" {
        return errors.New("can only resurrect archived discoveries")
    }

    return caseStore.Update(discoveryID, CaseUpdate{
        Status: "active",
        Metadata: map[string]any{
            "resurrectedAt": time.Now(),
            "resurrectedBy": "user", // or "system" for auto-resurrect
        },
    })
}
```

Use case: Discovery from one Task is still relevant for future work.

---

## Discovery Metrics

| Metric | Description |
|--------|-------------|
| Total Discovery cases | `caseStore.byType('discovery').length` |
| Active vs archived | Distribution by status |
| Local vs global | Distribution by scope |
| Duplicates prevented | Dedup hash collision count |
| Source Tasks | Which Tasks produced Discovery children |
| Injection rate | Discovery cases injected per prompt |
| Impact distribution | Low/medium/high/critical counts |
| Validation rate | `validated: true` percentage |
| Outdated rate | `status: outdated` percentage |
