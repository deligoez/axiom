# Agent Personas

Swarm uses a multi-persona architecture with eight named agents.

---

## Persona System

All 8 personas are agents with consistent file structure. Each gets instance numbers (`ace-001`, `ed-047`) that persist across Swarm restarts.

| Persona | Emoji | Role | Color | Concurrency |
|---------|-------|------|-------|-------------|
| Analyzer Ace | 🔍 | Analyzer | Indigo | 1 at a time |
| Planner Pat | 📊 | Planner | Purple | 1 at a time |
| Engineer Ed | ⚙️ | Worker | Blue | N parallel |
| Fixer Finn | 🔧 | Resolver | Orange | 1 at a time |
| Logger Lou | 💡 | Learning Extractor | Teal | 1 at a time |
| Director Dan | 😎 | Orchestrator | Gold | 1 at a time |
| Watcher Will | 👁️ | Health Monitor | Amber | 1 at a time |
| Counter Carl | 📈 | Statistician | Slate | 1 at a time |

---

## Agent Roles

### Analyzer Ace

Examines project structure during init. Detects:
- Project type (Node, Python, Go)
- Test framework
- Linter/formatter
- Build system

### Planner Pat

Runs the full Swarm Planning spiral. Handles:
- Black idea creation (JTBD format)
- Gray idea refinement
- Orange research (simple cases)
- Purple decision facilitation
- Blue vertical slice creation
- Green idea breakdown
- Retrospective after Blue completion

Pat is the central planning persona, managing the entire idea lifecycle from Black to Green.

### Engineer Ed

Implements Green ideas in worktrees. Multiple Ed instances can run in parallel, each with unique ID (`ed-001`, `ed-002`).

### Fixer Finn

Resolves merge conflicts. Called when MergeService encounters conflicts that can't be auto-resolved.

### Logger Lou

Creates Yellow ideas from learning signals and manages knowledge lifecycle. Processes:
- `LEARNING_LOCAL` signals → Yellow idea (scope: local, parent: current Green)
- `LEARNING_GLOBAL` signals → Yellow idea (scope: global, parent: current Green)
- Commit analysis for outdated detection
- Error patterns
- Impact classification for Yellow ideas

Lou is the bridge between ephemeral signals and persistent Yellow ideas in the IdeaStore.

### Director Dan

Orchestrates all agents. Manages:
- Mode switching
- Agent spawning
- Overall coordination

### Watcher Will

Health monitoring on 1-minute timer. Checks:
- Agent responsiveness
- Stalled iterations
- Worktree disk usage
- System resources

### Counter Carl

Metrics collection and ID assignment. Owns:
- Agent spawn counters
- Session statistics
- Performance data

---

## Agent File Structure

```
.swarm/agents/{persona}/
├── prompt.md           # System prompt
├── rules.md            # Persona-specific rules
├── skills/             # Skill files (*.md)
├── learnings.md        # Per-agent learnings
├── metrics.json        # Performance metrics
└── logs/
    └── {ideaId}.jsonl  # Execution logs
```

---

## Prompt Construction

Agent prompts are assembled from multiple sources in a specific order.

### Loading Order

```
1. .swarm/rules/*.md              (shared rules - ALL agents)
2. .swarm/agents/{name}/rules.md  (persona rules - specific agent)
3. .swarm/agents/{name}/prompt.md (persona prompt - specific agent)
4. .swarm/agents/{name}/skills/   (persona skills - specific agent)
```

### Prompt File Format

```markdown
# {Persona Name} - System Prompt

## Identity
You are {NAME}, the {role} in the Swarm team.
{personality description}

## Responsibilities
- {responsibility 1}
- {responsibility 2}

## Communication Style
{voice guidelines}

## Rules Reference
See: .swarm/agents/{name}/rules.md
```

### Rules File Format

```markdown
# {Persona Name} - Rules

## Must Do
- {required behavior 1}
- {required behavior 2}

## Must Not Do
- {forbidden behavior 1}

## Quality Standards
- {standard 1}
```

### Override Behavior

| Rule Type | Can Override? |
|-----------|---------------|
| Signal Types | No - protocol is fixed |
| Learning Format | No - categories can extend |
| Commit Format | Partial - can add prefixes |
| Completion Protocol | Partial - can add quality commands |
| Persona Prompt | Yes - full control |
| Persona Rules | Yes - full control |

---

## Skill Files

Skills are reusable capability modules stored in `.swarm/agents/{persona}/skills/`. Each skill is a markdown file that extends an agent's capabilities.

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

## Quality Gate

Before COMPLETE signal:
1. All tests pass
2. Run quality commands
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

## Learning Signals

When discovering API quirks:
- `<swarm>LEARNING_GLOBAL:API X requires header Y for Z</swarm>`
```

**Conflict Resolution Skill (`skills/conflict-resolution.md`):**

```markdown
# Conflict Resolution (Finn)

Resolve git merge conflicts by understanding intent.

## When to Use

- MEDIUM level conflicts assigned by MergeService
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
fix: resolve merge conflict #idea-042 @finn

- Kept rate limiting from main
- Kept 2FA check from feature branch
- Combined in login flow sequence
```

## Escalation

If unable to resolve:
```
<swarm>NEEDS_HUMAN:Conflict too complex - structural changes in auth module</swarm>
```
```

### Skill Loading Order

Skills are loaded after rules and prompt:

```
1. .swarm/rules/*.md           (shared rules)
2. .swarm/agents/{name}/rules.md
3. .swarm/agents/{name}/prompt.md
4. .swarm/agents/{name}/skills/*.md  ← Skills loaded here
5. Idea context
6. Yellow ideas injection
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

All agents share common protocols stored in `.swarm/rules/`:

```
.swarm/rules/
├── signal-types.md              # Signal format and valid types
├── learning-format.md           # Learning scope prefixes
├── commit-format.md             # Commit message format
└── completion-protocol.md       # Quality checks and completion
```

### Signal Types (`signal-types.md`)

```markdown
# Signal Types

## Format
All signals must use: `<swarm>TYPE:payload</swarm>` or `<swarm>TYPE</swarm>`

## Valid Types

### Control Signals
- `COMPLETE` - Idea finished successfully
- `BLOCKED` - External blocker (payload: reason)
- `NEEDS_HUMAN` - Human intervention required (payload: reason)
- `PROGRESS` - Progress update (payload: percentage)
- `RESOLVED` - Merge conflict resolved (Finn)

### Learning Signals
- `LEARNING_LOCAL` - Agent-specific learning (payload: content)
- `LEARNING_GLOBAL` - Project-wide learning (payload: content)

## Examples
<swarm>COMPLETE</swarm>
<swarm>BLOCKED:Database schema mismatch</swarm>
<swarm>NEEDS_HUMAN:Cannot determine correct API version</swarm>
<swarm>PROGRESS:75</swarm>
<swarm>RESOLVED</swarm>
<swarm>LEARNING_GLOBAL:All API endpoints require rate limiting</swarm>
```

### Learning Format (`learning-format.md`)

```markdown
# Learning Format

## Signal-Based Learning Capture

Agents emit learning signals during execution:

- `<swarm>LEARNING_LOCAL:content</swarm>` - Agent-specific
- `<swarm>LEARNING_GLOBAL:content</swarm>` - Project-wide

Lou extracts these signals and creates Yellow ideas in IdeaStore.

## Yellow Idea Creation

| Signal | Yellow Scope | Parent | Injection |
|--------|--------------|--------|-----------|
| LEARNING_LOCAL | local | Current Green | Same agent only |
| LEARNING_GLOBAL | global | Current Green | All agents |

## Categories (Auto-detected by Lou)
performance, testing, debugging, error-handling, patterns, architecture, general
```

### Commit Format (`commit-format.md`)

```markdown
# Commit Format

## Required Format
`<type>: <description> #<idea-id> @<agent>`

## Format Elements
- `#idea-xxx` - Idea reference (grep-friendly)
- `@ed-001` - Agent attribution
- `@human` - Manual commits by user

## Types
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code restructure
- `test:` - Test changes

## Examples
feat: add login validation #idea-001 @ed-001
fix: handle null response #idea-002 @ed-002
fix: resolve merge conflict #idea-001 @finn
```

---

## Agent Data Storage

### Execution Logs (`logs/{ideaId}.jsonl`)

Per-idea execution log in JSONL format:

```json
{"timestamp":"2026-01-13T10:00:00Z","event":"start","ideaId":"idea-001"}
{"timestamp":"2026-01-13T10:01:00Z","event":"iteration","number":1,"input":"...","output":"..."}
{"timestamp":"2026-01-13T10:02:00Z","event":"signal","type":"PROGRESS","payload":"50"}
{"timestamp":"2026-01-13T10:05:00Z","event":"complete","durationMs":300000,"iterations":3}
```

### Agent Learnings (`learnings.md`)

Agent-specific learnings file is a **view** of Yellow ideas with `scope: local` for this agent. The file is regenerated from IdeaStore Yellow ideas.

```markdown
# Ed's Learnings

## Testing Patterns
- [idea-030] Vitest parallel mode causes flaky tests with shared state

## TDD Workflow
- [idea-031] Run quality checks before commit, not after
```

Each entry references the Yellow idea ID for traceability.

### Performance Metrics (`metrics.json`)

```json
{
  "persona": "ed",
  "updated": "2026-01-13T10:00:00Z",
  "ideas": {
    "completed": 47,
    "failed": 3,
    "successRate": 0.94
  },
  "iterations": {
    "total": 142,
    "avgPerIdea": 2.84,
    "maxPerIdea": 8
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

Counter Carl owns spawn counters. Flow:

```
Orchestrator: AGENT_SPAWN_REQUEST { persona: 'ed' }
Carl: increments ed counter 46 → 47, returns 'ed-047'
Orchestrator: spawns ed-047
```

Counters persist in `.swarm/metrics/counters.json`.

### Spawn vs Invocation

| Term | Meaning | Counter Increments? |
|------|---------|---------------------|
| **Spawn** | New agent instance created (new process/actor) | Yes |
| **Invocation** | Agent does work (iteration, task) | No |
| **Restart** | Swarm quits and starts again | Yes (new spawn) |
| **Respawn** | Agent crashes, new instance created | Yes |

No agent is truly a "singleton" across Swarm's lifetime:

| Scenario | What Happens |
|----------|--------------|
| Swarm restarts | Ace runs init again → `ace-002` |
| Session starts | Dan spawns → `dan-003` (if 2 previous sessions) |
| Agent crashes | Will respawns mid-session → `will-002` |
| Multiple Ed workers | `ed-001`, `ed-002`, `ed-003` concurrent |

---

## Agent Card (Web UI)

Each agent displays in the Agent Grid showing: agent ID, current idea, iteration count, elapsed time, progress bar, and current activity. Card border color and indicator reflect agent state (idle, running, completed, failed, paused).

---

## Support Agents: Will and Carl

Will and Carl don't work in worktrees. They support orchestration.

### Will: Timer-Based Monitoring

Runs on 1-minute timer with guards:

```
monitor region:
  idle:
    after 60000:
      target: checkingHealth
      guard: hasActiveAgents
  checkingHealth:
    invoke: willHealthCheck
    onDone: idle
```

### Carl: Event-Driven Metrics

Responds to events without blocking:

```
on:
  AGENT_SPAWN_REQUEST: carlAssignAgentId (sync)
  AGENT_SPAWNED: carlRecordSpawn
  AGENT_COMPLETED: carlRecordCompletion
```

### Support Agent Files

```
.swarm/
├── agents/
│   ├── will/
│   │   ├── prompt.md
│   │   └── logs/
│   └── carl/
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

## Worktree Isolation

Each Ed agent works in an isolated git worktree:

```
.worktrees/
├── ed-001-idea-004/     # Ed working on idea-004
├── ed-002-idea-007/     # Ed working on idea-007
└── finn-001-merge/      # Finn resolving conflict
```

Benefits:
- No interference between agents
- Clean git history per idea
- Easy rollback via branch deletion
- Parallel file system access

---

## Agent CLI Invocation

Swarm spawns agents via the Claude CLI with specific configuration:

```bash
claude \
  --print \
  --dangerously-skip-permissions \
  --model ${model} \
  --system-prompt "${systemPrompt}" \
  --cwd "${worktreePath}"
```

### Invocation Parameters

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `--print` | - | Non-interactive mode, outputs to stdout |
| `--dangerously-skip-permissions` | - | Bypass permission prompts (agents are trusted) |
| `--model` | `sonnet` (default) | Model selection from config |
| `--system-prompt` | Assembled prompt | Full agent prompt (see Prompt Construction) |
| `--cwd` | Worktree path | Execute in isolated worktree |

### Prompt Injection

The prompt is sent via stdin after process spawn:

```typescript
const process = spawn('claude', args, { cwd: worktreePath });
process.stdin.write(ideaPrompt);
process.stdin.end();
```

### Output Parsing

Agent output is parsed for:
1. **Signals**: `<swarm>TYPE:payload</swarm>` format
2. **Commits**: Git activity in worktree
3. **Progress**: Status updates for TUI

---

## Agent Machine States

```
         ┌──────────┐
         │  idle    │ ← Initial
         └────┬─────┘
              │ START
              ▼
         ┌──────────┐
         │preparing │ ← Setup worktree
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
    │  │checkQuality│────┼──┘
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
