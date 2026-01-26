# Chorus Memory System

**Module:** 08-memory-system.md
**Parent:** [00-index.md](./00-index.md)
**Related:** [05-agent-personas.md](./05-agent-personas.md), [07-ralph-loop.md](./07-ralph-loop.md)

---

## Overview

The Memory System enables knowledge sharing across agents and sessions. Learnings discovered by one agent are automatically extracted and made available to all future agents.

**Key Design Principles:**
- Signal-based learning capture (agents emit learning signals)
- Automatic extraction from logs (no manual scratchpad)
- Serialized processing via 💡 Logger Lou queue (no concurrent writes)
- No human review required (💡 Logger Lou handles dedup/outdated)

---

## UI Design: Learnings Panel

The Learnings Panel is accessible via the 'L' key from Implementation Mode. It shows all extracted learnings organized by category and source.

### Learnings Panel (Modal)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 💡 PROJECT LEARNINGS                                                 │ ESC close │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  View: [●Shared] [⚙️ ed] [🔍 ace] [📊 pat] [All]                  15 learnings     │
│                                                                                  │
│  ════════════════════════════════════════════════════════════════════════════   │
│  API DESIGN                                                                      │
│  ────────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│  • All endpoints return consistent error format: { error: string, code: number }│
│    Source: ch-015 (2026-01-10, ⚙️ ed-001)                                        │
│                                                                                  │
│  • Rate limiting: 100 requests/minute per user                                  │
│    Source: ch-022 (2026-01-11, ⚙️ ed-002)                                        │
│                                                                                  │
│  ════════════════════════════════════════════════════════════════════════════   │
│  TESTING                                                                         │
│  ────────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│  • TDD: RED → GREEN → REFACTOR → COMMIT                                         │
│    Source: ch-001 (2026-01-09, ⚙️ ed-001)                                        │
│                                                                                  │
│  • Use AAA pattern: Arrange, Act, Assert                                        │
│    Source: ch-003 (2026-01-09, ⚙️ ed-001)                                        │
│                                                                                  │
│  ════════════════════════════════════════════════════════════════════════════   │
│  ARCHITECTURE                                                                    │
│  ────────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│  • XState v5 for state management                                               │
│    Source: ch-010 (2026-01-10, 📊 pat)                                            │
│                                                                                  │
│  • Spawned actors for parallel agents                                           │
│    Source: ch-012 (2026-01-10, 📊 pat)                                            │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [Tab] Switch view [j/k] Scroll [/] Search [e] Edit [d] Delete [ESC] Close       │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Learning View Filters

| Filter | Shows |
|--------|-------|
| Shared | Project-wide learnings (`.chorus/learnings.md`) |
| ⚙️ ed | Engineer Ed's agent-specific learnings |
| 🔍 ace | Analyzer Ace's learnings |
| 📊 pat | Planner Pat's learnings |
| All | All learnings combined |

### Agent-Specific Learnings View

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 💡 ⚙️ ED'S LEARNINGS                                                 │ ESC close │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  View: [Shared] [●⚙️ ed] [🔍 ace] [📊 pat] [All]                     8 learnings     │
│                                                                                  │
│  ════════════════════════════════════════════════════════════════════════════   │
│  PERFORMANCE                                                                     │
│  ────────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│  • [2026-01-13] This table needs batch inserts for 10x performance              │
│    Source: ch-045                                                               │
│                                                                                  │
│  • [2026-01-13] Use connection pooling for database queries                     │
│    Source: ch-048                                                               │
│                                                                                  │
│  ════════════════════════════════════════════════════════════════════════════   │
│  TESTING                                                                         │
│  ────────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│  • [2026-01-13] Run quality checks before commit, not after                     │
│    Source: ch-047                                                               │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [Tab] Switch view [j/k] Scroll [/] Search [ESC] Close                            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Learning Notification Toast

When 💡 Logger Lou extracts a new learning:

```
┌────────────────────────────────────────┐
│ 💡 New Learning Extracted              │
│   "XState v5 for state management"     │
│   From: ch-010 (📊 pat)                   │
│   Press 'L' to view all               │
└────────────────────────────────────────┘
```

### Superseded Learning Indicator

When a learning is superseded by a newer one:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  ════════════════════════════════════════════════════════════════════════════   │
│  SUPERSEDED (Hidden by default)                                                  │
│  ────────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│  • ~~Use Zustand for state management~~                                         │
│    Superseded by: "XState v5 for state management"                              │
│    Original: ch-002 (2026-01-09, ⚙️ ed-001)                                      │
│    Superseded: 2026-01-10                                                       │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Learnings Keyboard Shortcuts

| Key | Action | Description |
|-----|--------|-------------|
| `Tab` | Switch view | Cycle through view filters |
| `j` / `↓` | Scroll down | Navigate learnings |
| `k` / `↑` | Scroll up | Navigate learnings |
| `/` | Search | Filter by keyword |
| `e` | Edit | Edit selected learning |
| `d` | Delete | Delete selected learning |
| `s` | Show superseded | Toggle superseded visibility |
| `ESC` | Close | Close panel |

### Learning Categories

Categories are auto-detected by 💡 Logger Lou based on content:

| Category | Keywords |
|----------|----------|
| API Design | endpoint, route, REST, response |
| Testing | test, TDD, mock, assert |
| Architecture | actor, state, pattern, service |
| Performance | cache, optimize, batch, pool |
| Debugging | error, log, trace, debug |
| General | (default) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     MEMORY ARCHITECTURE                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              SHARED LEARNINGS - PROJECT ROOT                     │
│                                                                  │
│  .chorus/learnings.md                                            │
│  ├── Project-wide learnings (from LEARNING_GLOBAL signals)       │
│  ├── Injected into all agent prompts                             │
│  ├── Lou maintains (dedup, outdated removal)               │
│  └── Git-tracked (versioned)                                     │
└─────────────────────────────────────────────────────────────────┘
                              ▲
          Lou writes (from LEARNING_GLOBAL signals)
                              │
┌─────────────────────────────────────────────────────────────────┐
│              AGENT LEARNINGS - PER PERSONA                       │
│                                                                  │
│  .chorus/agents/{persona}/learnings.md                           │
│  ├── Agent-specific learnings (from LEARNING_LOCAL signals)      │
│  ├── Lou extracts and writes here                                │
│  ├── Injected into agent's own prompt                            │
│  └── Git-tracked (per-agent history)                             │
└─────────────────────────────────────────────────────────────────┘
                              ▲
          Lou extracts from logs
                              │
┌─────────────────────────────────────────────────────────────────┐
│              AGENT LOGS - EXECUTION HISTORY                      │
│                                                                  │
│  .chorus/agents/{persona}/logs/{taskId}.jsonl                    │
│  ├── Full execution log with iterations                          │
│  ├── Contains learning signals in output                         │
│  └── Lou parses for LEARNING_LOCAL and LEARNING_GLOBAL           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Learning Signal Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    LEARNING SIGNAL FLOW                          │
└─────────────────────────────────────────────────────────────────┘

Agent (Ed-001) works on task
        │
        ▼
Agent outputs learning signals in response:
    <chorus>LEARNING_LOCAL:This function needs memoization</chorus>
    <chorus>LEARNING_GLOBAL:All APIs need rate limiting</chorus>
        │
        ▼
Output captured in logs/{taskId}.jsonl (automatic)
        │
        ▼
Task completes → TASK_COMPLETED event fired
        │
        ▼
Lou (singleton) receives event
        │
        ▼
Lou adds to extraction queue
        │
        ▼
Lou processes queue (one task at a time):
        │
        ├── Parse logs/{taskId}.jsonl
        │   └── Extract LEARNING_* signals using regex
        │
        ├── LEARNING_LOCAL signals:
        │   ├── Deduplicate (content hash)
        │   ├── Check for outdated learnings
        │   └── Write to .chorus/agents/{persona}/learnings.md
        │
        └── LEARNING_GLOBAL signals:
            ├── Deduplicate (content hash)
            ├── Check for outdated learnings
            └── Write to .chorus/learnings.md
```

---

## Learning Signals

Agents emit learning signals during task execution. These are captured in logs and later extracted by Lou.

### Signal Format

```
<chorus>LEARNING_LOCAL:content</chorus>   → Agent-specific
<chorus>LEARNING_GLOBAL:content</chorus>  → Project-wide (shared)
```

### When to Use Each Signal

| Signal | Use Case | Destination |
|--------|----------|-------------|
| `LEARNING_LOCAL` | Specific to this agent's workflow | `.chorus/agents/{persona}/learnings.md` |
| `LEARNING_GLOBAL` | Affects all agents, project patterns | `.chorus/learnings.md` |

### Examples

```text
# Agent discovers a local optimization
<chorus>LEARNING_LOCAL:Use batch inserts for this table, 10x faster</chorus>

# Agent discovers something that affects the whole project
<chorus>LEARNING_GLOBAL:All API endpoints require rate limiting middleware</chorus>

# Agent discovers an architectural pattern
<chorus>LEARNING_GLOBAL:XState v5 actor model is preferred for state management</chorus>
```

> **See:** [05-agent-personas.md](./05-agent-personas.md#signal-types-signal-typesmd) for the complete signal protocol.

---

## 💡 Lou Queue Mechanism

💡 Logger Lou processes learning extractions sequentially to prevent concurrent file modifications.

```typescript
interface LoggerQueue {
  pending: ExtractionTask[];
  processing: boolean;
}

interface ExtractionTask {
  taskId: string;
  agentId: string;
  persona: PersonaType;
  logPath: string;
  timestamp: number;
}

// Lou is a singleton actor in XState
const loggerMachine = createMachine({
  id: 'logger',
  initial: 'idle',
  context: {
    queue: [] as ExtractionTask[],
  },
  states: {
    idle: {
      on: {
        TASK_COMPLETED: {
          actions: 'addToQueue',
          target: 'processing',
        },
      },
    },
    processing: {
      invoke: {
        src: 'extractLearnings',
        onDone: [
          { target: 'processing', guard: 'hasMoreInQueue' },
          { target: 'idle' },
        ],
      },
      on: {
        TASK_COMPLETED: { actions: 'addToQueue' },
      },
    },
  },
});
```

### Why Sequential Processing?

1. **Prevents race conditions** - Two agents completing simultaneously won't corrupt learnings.md
2. **Enables proper dedup** - Lou can check existing learnings before adding new ones
3. **Allows outdated detection** - New learning can mark old ones as superseded

---

## Learning Extraction

Lou extracts learning signals from agent logs:

```typescript
const LEARNING_SIGNAL_REGEX = /<chorus>(LEARNING_LOCAL|LEARNING_GLOBAL):(.+?)<\/chorus>/g;

interface ExtractedLearning {
  type: 'LEARNING_LOCAL' | 'LEARNING_GLOBAL';
  content: string;
  source: {
    taskId: string;
    agentId: string;
    timestamp: string;
  };
  contentHash: string;  // SHA-256 for dedup
}

async function extractLearnings(task: ExtractionTask): Promise<ExtractedLearning[]> {
  const logContent = await readFile(task.logPath, 'utf-8');
  const learnings: ExtractedLearning[] = [];

  let match;
  while ((match = LEARNING_SIGNAL_REGEX.exec(logContent)) !== null) {
    const [, type, content] = match;
    learnings.push({
      type: type as 'LEARNING_LOCAL' | 'LEARNING_GLOBAL',
      content: content.trim(),
      source: {
        taskId: task.taskId,
        agentId: task.agentId,
        timestamp: new Date().toISOString(),
      },
      contentHash: sha256(content.toLowerCase().trim()),
    });
  }

  return learnings;
}
```

---

## Deduplication

Learnings are deduplicated using content hashing:

```typescript
function isDuplicate(learning: ExtractedLearning, existingHashes: Set<string>): boolean {
  return existingHashes.has(learning.contentHash);
}

// Normalized hash for fuzzy matching
function computeHash(content: string): string {
  const normalized = content.toLowerCase().trim();
  return sha256(normalized);
}
```

---

## Outdated Learning Detection

When adding a new learning, Lou checks if it supersedes existing learnings:

```typescript
interface StoredLearning {
  content: string;
  contentHash: string;
  source: LearningSource;
  supersededBy?: string;  // Hash of newer learning
  supersededAt?: string;  // ISO timestamp
}

async function checkOutdated(
  newLearning: ExtractedLearning,
  existingLearnings: StoredLearning[]
): Promise<string[]> {
  const supersededHashes: string[] = [];

  for (const existing of existingLearnings) {
    if (existing.supersededBy) continue;  // Already superseded

    // Check if new learning contradicts or updates existing
    if (isContradiction(newLearning.content, existing.content)) {
      supersededHashes.push(existing.contentHash);
    }
  }

  return supersededHashes;
}

// Simple heuristic: same topic, different recommendation
function isContradiction(newContent: string, oldContent: string): boolean {
  // Extract topic keywords and compare
  // If same topic but different value/recommendation, it's a contradiction
  // Example: "Use Redis for caching" supersedes "Use Memcached for caching"
  // This is a simplified version - real implementation would be smarter
  const newTokens = tokenize(newContent);
  const oldTokens = tokenize(oldContent);
  const overlap = intersection(newTokens, oldTokens);

  // High overlap but not identical = likely update
  return overlap.size > 3 && overlap.size < Math.min(newTokens.size, oldTokens.size);
}
```

---

## Learning Storage Format

### Shared Learnings (`.chorus/learnings.md`)

```markdown
# Project Learnings

## API Design
- All endpoints return consistent error format: `{ error: string, code: number }`
  Source: ch-015 (2026-01-10, ed-001)
- Rate limiting: 100 requests/minute per user
  Source: ch-022 (2026-01-11, ed-002)

## Testing
- TDD: RED → GREEN → REFACTOR → COMMIT
  Source: ch-001 (2026-01-09, ed-001)
- Use AAA pattern: Arrange, Act, Assert
  Source: ch-003 (2026-01-09, ed-001)

## Architecture
- XState v5 for state management
  Source: ch-010 (2026-01-10, pat)
- Spawned actors for parallel agents
  Source: ch-012 (2026-01-10, pat)

<!-- Superseded learnings (kept for history)
- ~~Use Zustand for state management~~ (superseded by XState v5)
  Source: ch-002 (2026-01-09, ed-001)
  Superseded: 2026-01-10 by ch-010
-->
```

### Agent Learnings (`.chorus/agents/{persona}/learnings.md`)

```markdown
# Ed's Learnings

## Performance
- [2026-01-13] This table needs batch inserts for 10x performance
  Source: ch-045

## Testing
- [2026-01-13] Run quality checks before commit, not after
  Source: ch-047
```

---

## Prompt Injection

Learnings are injected into agent prompts during task assignment:

```typescript
async function buildAgentPrompt(task: Task, agent: AgentConfig): Promise<string> {
  const sections: string[] = [];

  // 1. Base prompt
  sections.push(await readFile(`.chorus/agents/${agent.persona}/prompt.md`));

  // 2. Shared rules
  const rules = await glob('.chorus/rules/*.md');
  for (const rule of rules) {
    sections.push(await readFile(rule));
  }

  // 3. Agent-specific rules
  sections.push(await readFile(`.chorus/agents/${agent.persona}/rules.md`));

  // 4. Shared learnings (project-wide)
  sections.push('## Project Learnings');
  sections.push(await readFile('.chorus/learnings.md'));

  // 5. Agent-specific learnings
  sections.push(`## ${agent.persona}'s Learnings`);
  sections.push(await readFile(`.chorus/agents/${agent.persona}/learnings.md`));

  // 6. Task context
  sections.push('## Current Task');
  sections.push(formatTask(task));

  return sections.join('\n\n---\n\n');
}
```

---

## Learning Events

| Event | Details |
|-------|---------|
| `learning_signal_detected` | `{taskId, agentId, type, content}` |
| `learning_extracted` | `{taskId, agentId, localCount, globalCount}` |
| `learning_stored` | `{type, content, destination}` |
| `learning_duplicate_skipped` | `{content, existingHash}` |
| `learning_superseded` | `{oldHash, newHash, reason}` |

---

## Configuration

```json
{
  "memory": {
    "deduplication": true,
    "trackSuperseded": true,
    "injectIntoPrompt": true
  }
}
```

---

## References

- [05-agent-personas.md](./05-agent-personas.md) - 💡 Logger Lou persona and signal types
- [03-planning-phase.md](./03-planning-phase.md) - Directory structure
- [07-ralph-loop.md](./07-ralph-loop.md) - Task completion triggers extraction

---

**End of Memory System Module**
