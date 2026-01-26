# Agent Personas

AXIOM uses a multi-persona architecture with eight named agents.

---

## Persona System

All 8 personas are agents with consistent file structure. Each gets instance numbers (`ava-001`, `echo-047`) that persist across AXIOM restarts.

| Persona | Emoji | Role | Color | Concurrency |
|---------|-------|------|-------|-------------|
| Analyst Ava | 🔍 | Project analysis | Indigo | 1 at a time |
| Architect Axel | 📊 | Planning + Debrief | Purple | 1 at a time |
| Executor Echo | ⚙️ | Implementation | Blue | N parallel |
| Resolver Rex | 🔧 | Merge conflict resolution | Orange | 1 at a time |
| Curator Cleo | 💡 | Discovery creation | Teal | 1 at a time |
| Director Dex | 😎 | Orchestration | Gold | 1 at a time |
| Monitor Max | 👁️ | Health monitoring | Amber | 1 at a time |
| Auditor Ash | 📈 | Metrics and ID assignment | Slate | 1 at a time |

---

## Agent Roles

### Analyst Ava

**Init Agent** - Runs automatically on first AXIOM startup when no `.axiom/` directory exists.

**Trigger:**
- First run: Automatic (scaffold creates `.axiom/`, then spawns Ava)
- Later: Manual via command palette (planned)

**Responsibilities:**
- Greet and introduce AXIOM to user
- Detect project type and tech stack (Go, TypeScript, Python, etc.)
- Identify verification commands (test, lint, build)
- Create/update `.axiom/config.json`
- Onboard new users
- Help returning users with config changes

**Workflow:**
1. Check if `.axiom/config.json` exists
2. If NO → First Run: Full onboarding flow
3. If YES → Returning User: Ask what they need

**Signal:**
- Emits `<axiom>AVA_COMPLETE</axiom>` when done

**Does NOT:**
- Plan tasks (Axel does this)
- Implement code (Echo does this)
- Make assumptions (asks user when uncertain)

### Architect Axel

Runs the full AXIOM Planning dialogue. Handles:
- Directive case creation (JTBD format)
- Draft case refinement
- Research cases (simple investigations)
- Pending decision facilitation
- Operation vertical slice creation
- Task breakdown
- Debrief after Operation completion
- **Plan rejection handling** (revise, restart, or partial approve)

Axel is the central planning persona, managing the entire case lifecycle from Directive to Task.

**On plan rejection:**
- With feedback: Revises proposal targeting specific concerns
- Without feedback: Asks clarifying questions before restart
- Partial approve: Proceeds with approved components, revises rejected
- After 5 revisions: Suggests breaking goal into smaller parts

### Executor Echo

Implements Tasks in workspaces. Multiple Echo instances can run in parallel, each with unique ID (`echo-001`, `echo-002`).

### Resolver Rex

Resolves merge conflicts. Called when Integration Queue encounters conflicts that can't be auto-resolved.

### Curator Cleo

Creates Discovery cases from discovery signals and manages knowledge lifecycle. Processes:
- `DISCOVERY_LOCAL` signals → Discovery case (scope: local, parent: current Task)
- `DISCOVERY_GLOBAL` signals → Discovery case (scope: global, parent: current Task)
- Commit analysis for outdated detection
- Error patterns
- Impact classification for Discovery cases

Cleo is the bridge between ephemeral signals and persistent Discovery cases in the CaseStore.

### Director Dex

Orchestrates all agents. Manages:
- Mode switching
- Agent spawning
- Overall coordination

### Monitor Max

Health monitoring on 1-minute timer. Checks:
- Agent responsiveness
- Stalled iterations
- Workspace disk usage
- System resources

**Disk space monitoring actions:**

| Threshold | Action |
|-----------|--------|
| > 1GB free | Normal operation |
| 500MB - 1GB | Warning logged, user notified |
| < 500MB | Critical: pause all agents, cleanup old workspaces |
| < 100MB | Emergency stop: all agents terminated |

When disk is critically low:
1. Pause new agent spawns
2. Let running iterations complete
3. Trigger automatic workspace cleanup
4. Alert user via Web UI and `on-error` hook
5. Resume when disk > 500MB

See [09-intervention.md](./09-intervention.md#disk-space-recovery) for recovery procedures.

### Auditor Ash

Metrics collection and ID assignment. Owns:
- Agent spawn counters
- Session statistics
- Performance data

---

## Agent File Structure

```
.axiom/agents/{persona}/
├── prompt.md           # System prompt
├── rules.md            # Persona-specific rules
├── skills/             # Skill files (*.md)
├── discoveries.md      # Per-agent Discovery cases (view)
├── metrics.json        # Performance metrics
└── logs/
    └── {taskId}.jsonl  # Execution logs
```

---

## Prompt Construction

Agent prompts are assembled from multiple sources in a specific order.

### Loading Order

```
1. .axiom/rules/*.md              (shared rules - ALL agents)
2. .axiom/agents/{name}/rules.md  (persona rules - specific agent)
3. .axiom/agents/{name}/prompt.md (persona prompt - specific agent)
4. .axiom/agents/{name}/skills/   (persona skills - specific agent)
```

### Prompt File Format

```markdown
# {Persona Name} - System Prompt

## Identity
You are {NAME}, the {role} in the AXIOM team.
{personality description}

## Responsibilities
- {responsibility 1}
- {responsibility 2}

## Communication Style
{voice guidelines}

## Rules Reference
See: .axiom/agents/{name}/rules.md
```

### Rules File Format

```markdown
# {Persona Name} - Rules

## Must Do
- {required behavior 1}
- {required behavior 2}

## Must Not Do
- {forbidden behavior 1}

## Verification Standards
- {standard 1}
```

### Override Behavior

| Rule Type | Can Override? |
|-----------|---------------|
| Signal Types | No - protocol is fixed |
| Discovery Format | No - categories can extend |
| Commit Format | Partial - can add prefixes |
| Completion Protocol | Partial - can add verification commands |
| Persona Prompt | Yes - full control |
| Persona Rules | Yes - full control |

---

## Skill Files

Skills are reusable capability modules stored in `.axiom/agents/{persona}/skills/`. Each skill is a markdown file that extends an agent's capabilities.

### Skill File Structure

```markdown
# {Skill Name}

Brief description of what this skill enables.

## When to Use

- Condition 1 when this skill applies
- Condition 2

## Instructions

Step-by-step instructions for using this skill.

### Step 1: {Action}

Details...

### Step 2: {Action}

Details...

## Examples

### Example 1: {Scenario}

```
Input: ...
Output: ...
```

## Related Skills

- skill-name-1.md
- skill-name-2.md
```

### Example Skills

**TDD Skill (`skills/tdd.md`):**

```markdown
# Test-Driven Development

Write tests before implementation code.

## When to Use

- Implementing new features
- Fixing bugs (write failing test first)
- Refactoring (ensure tests exist)

## Instructions

### Step 1: RED

Write a failing test that describes expected behavior:

```typescript
it('should validate email format', () => {
  expect(validateEmail('invalid')).toBe(false);
  expect(validateEmail('valid@example.com')).toBe(true);
});
```

Run: Confirm test fails.

### Step 2: GREEN

Write minimum code to pass the test:

```typescript
function validateEmail(email: string): boolean {
  return email.includes('@');
}
```

Run: Confirm test passes.

### Step 3: REFACTOR

Improve code while keeping tests green:

```typescript
function validateEmail(email: string): boolean {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}
```

### Step 4: REPEAT

Continue with next test case.

## Verification Gate

Before COMPLETE signal:
1. All tests pass
2. Run verification commands
3. Check coverage (if configured)
```

**API Integration Skill (`skills/api-integration.md`):**

```markdown
# API Integration

Integrate with external REST/GraphQL APIs.

## When to Use

- Connecting to third-party services
- Building API clients
- Handling authentication flows

## Instructions

### Step 1: Research

Check API documentation for:
- Base URL and endpoints
- Authentication method (API key, OAuth, JWT)
- Rate limits
- Error response format

### Step 2: Create Client

```typescript
class APIClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: APIConfig) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new APIError(response.status, await response.text());
    }

    return response.json();
  }
}
```

### Step 3: Handle Errors

```typescript
class APIError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`API Error ${status}: ${body}`);
  }
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
  throw new Error('Unreachable');
}
```

### Step 4: Test

Write integration tests with mocked responses.

## Discovery Signals

When discovering API quirks:
- `<axiom>DISCOVERY_GLOBAL:API X requires header Y for Z</axiom>`
```

**Conflict Resolution Skill (`skills/conflict-resolution.md`):**

```markdown
# Conflict Resolution (Rex)

Resolve git merge conflicts by understanding intent.

## When to Use

- MEDIUM level conflicts assigned by Integration Queue
- Overlapping changes in same file

## Instructions

### Step 1: Understand Both Branches

Read the changes from both branches:

```bash
git diff main...feature -- path/to/file
git log --oneline main...feature -- path/to/file
```

### Step 2: Identify Intent

For each conflicting section:
- What was the original code trying to do?
- What did branch A change and why?
- What did branch B change and why?

### Step 3: Merge Intent

Combine both intents:

| Scenario | Resolution |
|----------|------------|
| Both add to same list | Keep both items |
| Both modify same function | Combine functionality |
| One adds, one removes | Check if addition still needed |
| Same logic, different style | Choose cleaner version |

### Step 4: Test

```bash
npm test
npm run typecheck
```

### Step 5: Document

Commit with resolution rationale:

```
fix: resolve merge conflict #task-042 @rex

- Kept rate limiting from main
- Kept 2FA check from feature branch
- Combined in login flow sequence
```

## Escalation

If unable to resolve:
```
<axiom>PENDING:Conflict too complex - structural changes in auth module</axiom>
```
```

### Skill Loading Order

Skills are loaded after rules and prompt:

```
1. .axiom/rules/*.md           (shared rules)
2. .axiom/agents/{name}/rules.md
3. .axiom/agents/{name}/prompt.md
4. .axiom/agents/{name}/skills/*.md  ← Skills loaded here
5. Case context
6. Discovery injection
```

### Skill Conventions

| Convention | Requirement |
|------------|-------------|
| File name | `lowercase-kebab-case.md` |
| Max size | 2000 tokens (keep focused) |
| Examples | Required (at least 1) |
| When to Use | Required section |
| Cross-references | Use relative paths |

---

## Shared Rules System

All agents share common protocols stored in `.axiom/rules/`:

```
.axiom/rules/
├── signal-types.md              # Signal format and valid types
├── discovery-format.md          # Discovery scope prefixes
├── commit-format.md             # Commit message format
└── completion-protocol.md       # Verification and completion
```

### Signal Types (`signal-types.md`)

```markdown
# Signal Types

## Format
All signals must use: `<axiom>TYPE:payload</axiom>` or `<axiom>TYPE</axiom>`

## Valid Types

### Control Signals
- `COMPLETE` - Task finished successfully
- `BLOCKED` - External blocker (payload: reason)
- `PENDING` - Human intervention required (payload: reason)
- `PROGRESS` - Progress update (payload: percentage)
- `RESOLVED` - Merge conflict resolved (Rex)

### Discovery Signals
- `DISCOVERY_LOCAL` - Agent-specific discovery (payload: content)
- `DISCOVERY_GLOBAL` - Project-wide discovery (payload: content)

## Examples
<axiom>COMPLETE</axiom>
<axiom>BLOCKED:Database schema mismatch</axiom>
<axiom>PENDING:Cannot determine correct API version</axiom>
<axiom>PROGRESS:75</axiom>
<axiom>RESOLVED</axiom>
<axiom>DISCOVERY_GLOBAL:All API endpoints require rate limiting</axiom>
```

### Discovery Format (`discovery-format.md`)

```markdown
# Discovery Format

## Signal-Based Discovery Capture

Agents emit discovery signals during execution:

- `<axiom>DISCOVERY_LOCAL:content</axiom>` - Agent-specific
- `<axiom>DISCOVERY_GLOBAL:content</axiom>` - Project-wide

Cleo extracts these signals and creates Discovery cases in CaseStore.

## Discovery Case Creation

| Signal | Discovery Scope | Parent | Injection |
|--------|-----------------|--------|-----------|
| DISCOVERY_LOCAL | local | Current Task | Same agent only |
| DISCOVERY_GLOBAL | global | Current Task | All agents |

## Categories (Auto-detected by Cleo)
performance, testing, debugging, error-handling, patterns, architecture, general
```

### Commit Format (`commit-format.md`)

```markdown
# Commit Format

## Required Format
`<type>: <description> #<task-id> @<agent>`

## Format Elements
- `#task-xxx` - Task reference (grep-friendly)
- `@echo-001` - Agent attribution
- `@human` - Manual commits by user

## Types
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code restructure
- `test:` - Test changes

## Examples
feat: add login validation #task-001 @echo-001
fix: handle null response #task-002 @echo-002
fix: resolve merge conflict #task-001 @rex
```

---

## Agent Data Storage

### Execution Logs (`logs/{taskId}.jsonl`)

Per-task execution log in JSONL format:

```json
{"timestamp":"2026-01-13T10:00:00Z","event":"start","taskId":"task-001"}
{"timestamp":"2026-01-13T10:01:00Z","event":"iteration","number":1,"input":"...","output":"..."}
{"timestamp":"2026-01-13T10:02:00Z","event":"signal","type":"PROGRESS","payload":"50"}
{"timestamp":"2026-01-13T10:05:00Z","event":"complete","durationMs":300000,"iterations":3}
```

### Agent Discoveries (`discoveries.md`)

Agent-specific discoveries file is a **view** of Discovery cases with `scope: local` for this agent. The file is regenerated from CaseStore Discovery cases.

```markdown
# Echo's Discoveries

## Testing Patterns
- [task-030] Vitest parallel mode causes flaky tests with shared state

## TDD Workflow
- [task-031] Run verification before commit, not after
```

Each entry references the parent Task ID for traceability.

### Performance Metrics (`metrics.json`)

```json
{
  "persona": "echo",
  "updated": "2026-01-13T10:00:00Z",
  "tasks": {
    "completed": 47,
    "failed": 3,
    "successRate": 0.94
  },
  "iterations": {
    "total": 142,
    "avgPerTask": 2.84,
    "maxPerTask": 8
  },
  "timing": {
    "avgDurationMs": 180000,
    "totalRuntimeMs": 8460000
  },
  "tokens": {
    "input": 245000,
    "output": 78000,
    "estimatedCost": 1.23
  }
}
```

---

## Agent ID Assignment

Auditor Ash owns spawn counters. Flow:

```
Orchestrator: AGENT_SPAWN_REQUEST { persona: 'echo' }
Ash: increments echo counter 46 → 47, returns 'echo-047'
Orchestrator: spawns echo-047
```

Counters persist in `.axiom/metrics/counters.json`.

### Spawn vs Invocation

| Term | Meaning | Counter Increments? |
|------|---------|---------------------|
| **Spawn** | New agent instance created (new process/actor) | Yes |
| **Invocation** | Agent does work (iteration, task) | No |
| **Restart** | AXIOM quits and starts again | Yes (new spawn) |
| **Respawn** | Agent crashes, new instance created | Yes |

No agent is truly a "singleton" across AXIOM's lifetime:

| Scenario | What Happens |
|----------|--------------|
| AXIOM restarts | Ava runs init again → `ava-002` |
| Session starts | Dex spawns → `dex-003` (if 2 previous sessions) |
| Agent crashes | Max respawns mid-session → `max-002` |
| Multiple Echo workers | `echo-001`, `echo-002`, `echo-003` concurrent |

### Initial Counter State

On first AXIOM run, Ash creates `.axiom/metrics/counters.json`:

```json
{
  "ava": 0,
  "axel": 0,
  "echo": 0,
  "rex": 0,
  "cleo": 0,
  "dex": 0,
  "max": 0,
  "ash": 0
}
```

First spawn of any persona increments from 0 → 1, yielding ID like `echo-001`.

**File creation:**
- Created atomically on first AXIOM startup
- Ash initializes file before any spawn requests
- File lock prevents race conditions between concurrent spawns

**Counter persistence:**
- Counters persist across AXIOM restarts
- Never reset (monotonically increasing)
- If file is corrupted, restore from backup or reinitialize to 0

**Missing file handling:**
```
File not found → Create with all counters at 0
Invalid JSON → Log warning, create fresh file
Permission error → Fatal error, cannot proceed
```

---

## Agent Card (Web UI)

Each agent displays in the Agent Grid showing: agent ID, current task, iteration count, elapsed time, progress bar, and current activity. Card border color and indicator reflect agent state (idle, running, completed, failed, paused).

---

## Support Agents: Max and Ash

Max and Ash don't work in workspaces. They support orchestration.

### Max: Timer-Based Monitoring

Runs on 1-minute timer with guards:

```
monitor region:
  idle:
    after 60000:
      target: checkingHealth
      guard: hasActiveAgents
  checkingHealth:
    invoke: maxHealthCheck
    onDone: idle
```

### Ash: Event-Driven Metrics

Responds to events without blocking:

```
on:
  AGENT_SPAWN_REQUEST: ashAssignAgentId (sync)
  AGENT_SPAWNED: ashRecordSpawn
  AGENT_COMPLETED: ashRecordCompletion
```

### Support Agent Files

```
.axiom/
├── agents/
│   ├── max/
│   │   ├── prompt.md
│   │   └── logs/
│   └── ash/
│       ├── prompt.md
│       └── logs/
└── metrics/
    ├── counters.json    # Agent spawn counters
    ├── session.json     # Current session stats
    ├── history.jsonl    # Historical data
    └── agents/
        └── {agentId}.json
```

---

## Workspace Isolation

Each Echo agent works in an isolated git workspace:

```
.workspaces/
├── echo-001-task-004/     # Echo working on task-004
├── echo-002-task-007/     # Echo working on task-007
└── rex-001-merge/         # Rex resolving conflict
```

Benefits:
- No interference between agents
- Clean git history per task
- Easy rollback via branch deletion
- Parallel file system access

---

## Agent CLI Invocation

AXIOM spawns agents via the Claude CLI with specific configuration:

```bash
claude \
  --print \
  --dangerously-skip-permissions \
  --model ${model} \
  --system-prompt "${systemPrompt}" \
  --cwd "${workspacePath}"
```

### Invocation Parameters

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `--print` | - | Non-interactive mode, outputs to stdout |
| `--dangerously-skip-permissions` | - | Bypass permission prompts (agents are trusted) |
| `--model` | `sonnet` (default) | Model selection from config |
| `--system-prompt` | Assembled prompt | Full agent prompt (see Prompt Construction) |
| `--cwd` | Workspace path | Execute in isolated workspace |

### Prompt Injection

The prompt is sent via stdin after process spawn:

```typescript
const process = spawn('claude', args, { cwd: workspacePath });
process.stdin.write(taskPrompt);
process.stdin.end();
```

### Output Parsing

Agent output is parsed for:
1. **Signals**: `<axiom>TYPE:payload</axiom>` format
2. **Commits**: Git activity in workspace
3. **Progress**: Status updates for Web UI

---

## Signal Validation

### Valid Signal Format

Signals must match the exact format:

```
<axiom>TYPE</axiom>
<axiom>TYPE:payload</axiom>
```

### Validation Regex

```go
var signalRegex = regexp.MustCompile(`<axiom>([A-Z_]+)(?::(.+?))?</axiom>`)
```

**Captures:**
- Group 1: Signal type (e.g., `COMPLETE`, `PROGRESS`)
- Group 2: Payload (optional, e.g., `75` for progress)

### Valid Signal Types

| Type | Payload | Example |
|------|---------|---------|
| `COMPLETE` | None | `<axiom>COMPLETE</axiom>` |
| `BLOCKED` | Reason (required) | `<axiom>BLOCKED:Database locked</axiom>` |
| `PENDING` | Reason (required) | `<axiom>PENDING:Need API key</axiom>` |
| `PROGRESS` | Percentage (0-100) | `<axiom>PROGRESS:75</axiom>` |
| `RESOLVED` | None | `<axiom>RESOLVED</axiom>` |
| `DISCOVERY_LOCAL` | Content (required) | `<axiom>DISCOVERY_LOCAL:API uses JWT</axiom>` |
| `DISCOVERY_GLOBAL` | Content (required) | `<axiom>DISCOVERY_GLOBAL:Rate limit 100/min</axiom>` |

### Validation Rules

```go
func validateSignal(raw string) (*Signal, error) {
    matches := signalRegex.FindStringSubmatch(raw)
    if matches == nil {
        return nil, &SignalError{
            Code:    "SIGNAL_MALFORMED",
            Raw:     raw,
            Message: "Signal does not match expected format",
        }
    }

    signalType := matches[1]
    payload := matches[2]

    // Check if type is valid
    if !isValidType(signalType) {
        return nil, &SignalError{
            Code:    "SIGNAL_UNKNOWN_TYPE",
            Raw:     raw,
            Type:    signalType,
            Message: fmt.Sprintf("Unknown signal type: %s", signalType),
        }
    }

    // Check if payload is required but missing
    if requiresPayload(signalType) && payload == "" {
        return nil, &SignalError{
            Code:    "SIGNAL_MISSING_PAYLOAD",
            Raw:     raw,
            Type:    signalType,
            Message: fmt.Sprintf("%s requires a payload", signalType),
        }
    }

    // Validate PROGRESS payload is numeric 0-100
    if signalType == "PROGRESS" {
        pct, err := strconv.Atoi(payload)
        if err != nil || pct < 0 || pct > 100 {
            return nil, &SignalError{
                Code:    "SIGNAL_INVALID_PAYLOAD",
                Raw:     raw,
                Type:    signalType,
                Message: "PROGRESS payload must be 0-100",
            }
        }
    }

    return &Signal{Type: signalType, Payload: payload}, nil
}
```

### Invalid Signal Handling

When a signal fails validation:

| Error | Behavior | Logged? | Agent Impact |
|-------|----------|---------|--------------|
| `SIGNAL_MALFORMED` | Ignore, continue parsing | Yes (warning) | None |
| `SIGNAL_UNKNOWN_TYPE` | Ignore signal | Yes (warning) | None |
| `SIGNAL_MISSING_PAYLOAD` | Ignore signal | Yes (warning) | None |
| `SIGNAL_INVALID_PAYLOAD` | Ignore signal | Yes (warning) | None |

**Key principle:** Invalid signals are logged but never crash the agent or block execution. The agent continues working.

### Common Invalid Signal Examples

| Invalid Signal | Error | Reason |
|----------------|-------|--------|
| `<axiom>COMPLET</axiom>` | `UNKNOWN_TYPE` | Typo in type |
| `<axiom>complete</axiom>` | `UNKNOWN_TYPE` | Lowercase (case-sensitive) |
| `<axiom>BLOCKED</axiom>` | `MISSING_PAYLOAD` | BLOCKED requires reason |
| `<axiom>PROGRESS:abc</axiom>` | `INVALID_PAYLOAD` | Not a number |
| `<axiom>PROGRESS:150</axiom>` | `INVALID_PAYLOAD` | Out of range |
| `[AXIOM:COMPLETE]` | `MALFORMED` | Wrong delimiter format |
| `<AXIOM>COMPLETE</AXIOM>` | `MALFORMED` | Wrong case in tag |

### Signal Logging

Invalid signals are logged to `.axiom/logs/signals.jsonl`:

```json
{"ts":"2026-01-25T10:00:00Z","level":"warn","code":"SIGNAL_UNKNOWN_TYPE","agent":"echo-001","task":"task-042","raw":"<axiom>COMPLET</axiom>","type":"COMPLET"}
{"ts":"2026-01-25T10:00:05Z","level":"warn","code":"SIGNAL_MISSING_PAYLOAD","agent":"echo-001","task":"task-042","raw":"<axiom>BLOCKED</axiom>","type":"BLOCKED"}
```

**Log fields:**
- `ts`: Timestamp
- `level`: Always `warn` for invalid signals
- `code`: Error code
- `agent`: Agent ID
- `task`: Current task
- `raw`: Original signal string
- `type`: Parsed type (if available)

See [15-errors.md](./15-errors.md#signal-errors) for complete error code reference.

---

## Agent Machine States

```
         ┌──────────┐
         │  idle    │ ← Initial
         └────┬─────┘
              │ START
              ▼
         ┌──────────┐
         │preparing │ ← Setup workspace
         └────┬─────┘
              │ READY
              ▼
    ┌────────────────────┐
    │     executing      │
    │  ┌────────────┐    │
    │  │ iteration  │◄───┼──┐
    │  └─────┬──────┘    │  │ RETRY
    │        │           │  │
    │        ▼           │  │
    │  ┌────────────┐    │  │
    │  │verification│────┼──┘
    │  └─────┬──────┘    │
    │        │ ALL_PASS  │
    └────────┼───────────┘
             │
    ┌────────┼────────┐
    ▼        ▼        ▼
┌──────┐┌─────────┐┌──────┐
│blocked││completed││failed│ ← Final
└──────┘└─────────┘└──────┘
```
