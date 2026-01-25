# Oh-My-OpenCode vs Chorus: Comparison & Inspiration Report

**Date:** 2026-01-17
**Purpose:** Identify ideas from Oh-My-OpenCode that Chorus could adopt

---

## Executive Summary

Oh-My-OpenCode (OMO) and Chorus are both multi-agent orchestration systems, but with fundamentally different architectures:

| Aspect | Oh-My-OpenCode | Chorus |
|--------|----------------|--------|
| **Type** | OpenCode plugin | Standalone TUI CLI |
| **Architecture** | Hook/tool factories | XState v5 actor model |
| **State Management** | Boulder (JSON files) | XState snapshots + event sourcing |
| **UI** | Native to OpenCode | Ink (React for CLI) |
| **Test Framework** | Bun native | Vitest |
| **Package Manager** | Bun exclusively | npm/pnpm |
| **Agent Model** | 10+ specialized agents | 9 personas (Ace, Ed, Pat, Finn, Sam, Lou, Dan, Will, Carl) |
| **Task Tracking** | Boulder state + markdown checkboxes | TaskStore (JSONL) + Beads (dev) |
| **Parallel Execution** | Background manager + delegate_task | XState spawned actors |
| **Recovery** | Session recovery hooks | Snapshot + event sourcing |
| **Config Format** | JSONC (Zod validated) | TypeScript types |

---

## Key Ideas Chorus Should Adopt

### 1. Boulder State Pattern (Plan Persistence) ⭐⭐⭐

**OMO Approach:**
```json
// .sisyphus/boulder.json
{
  "active_plan": "/path/to/plan.md",
  "started_at": "2026-01-17T...",
  "session_ids": ["session-123", "session-456"],
  "plan_name": "feature-x"
}
```

Named after Sisyphus's eternal boulder - tracks active work across sessions:
- Plan file path + progress tracking
- Multiple session IDs (survives restarts)
- Markdown checkbox parsing for progress: `- [ ]` vs `- [x]`

**Chorus Gap:**
Planning state exists (`planning-state.json`) but no cross-session plan continuation with progress tracking.

**Recommendation:**
```typescript
// .chorus/active-plan.json
interface ActivePlan {
  planFile: string;           // Path to plan markdown
  startedAt: string;
  sessionIds: string[];       // All sessions that worked on this
  progress: {
    total: number;            // Total checkboxes
    completed: number;        // Completed checkboxes
  };
  lastAgentId?: string;       // Who worked on it last
}

// Parse progress from markdown
function getPlanProgress(planPath: string): PlanProgress {
  const content = readFileSync(planPath, 'utf-8');
  const unchecked = (content.match(/^[-*]\s*\[\s*\]/gm) || []).length;
  const checked = (content.match(/^[-*]\s*\[[xX]\]/gm) || []).length;
  return { total: unchecked + checked, completed: checked };
}
```

**Benefits:**
- Resume interrupted plans across Claude sessions
- Visual progress tracking
- Multi-agent plan continuation

---

### 2. Ralph Loop (Self-Referential Retry) ⭐⭐⭐

**OMO Approach:**
```
Initial prompt
  ↓
Agent work
  ↓
Completion promised? → YES → Done
  ↓ NO
Continue prompt injected (with iteration count)
  ↓
[Next iteration]
  ↑
Max iterations? → YES → Exit
```

Key features:
- Detects completion promise: `<promise>DONE</promise>`
- Injects continuation prompt with iteration counter
- Configurable max iterations
- Session state tracking

```typescript
const CONTINUATION_PROMPT = `[SYSTEM DIRECTIVE - RALPH LOOP {{ITERATION}}/{{MAX}}]
Your previous attempt did not output the completion promise. Continue working.
IMPORTANT:
- Review your progress so far
- Continue from where you left off
- When FULLY complete, output: <promise>{{PROMISE}}</promise>
Original task: {{PROMPT}}`
```

**Chorus Gap:**
Ralph loop is mentioned in plans but not fully implemented with this sophistication.

**Recommendation:**
```typescript
// src/services/RalphLoopService.ts
interface RalphLoopConfig {
  maxIterations: number;           // Default: 10
  completionPromise: string;       // Default: "TASK_COMPLETE"
  staleTimeout: number;            // When to consider agent stale
}

interface RalphLoopState {
  sessionId: string;
  originalPrompt: string;
  currentIteration: number;
  startedAt: Date;
  lastActivity: Date;
}

class RalphLoopService {
  detectCompletionPromise(transcript: string, promise: string): boolean;
  generateContinuationPrompt(state: RalphLoopState, config: RalphLoopConfig): string;
  shouldContinue(state: RalphLoopState, config: RalphLoopConfig): boolean;
}
```

**Benefits:**
- Automatic retry for incomplete work
- Iteration visibility
- Configurable stopping conditions

---

### 3. Category-Based Task Delegation ⭐⭐⭐

**OMO Approach:**
```typescript
// Categories with specialized agents
const DEFAULT_CATEGORIES = {
  visual: { agent: "frontend-ui-ux-engineer", model: "google/gemini-3-pro" },
  "business-logic": { agent: "oracle", model: "openai/gpt-5.2" },
  docs: { agent: "document-writer", model: "google/gemini-3-pro" },
  explore: { agent: "explore", model: "opencode/grok-code" },
  research: { agent: "librarian", model: "opencode/glm-4.7-free" },
};

// Delegation with category
delegate_task({
  description: "Build login form",
  category: "visual",  // Auto-selects frontend-ui-ux-engineer
  run_in_background: true,
});
```

Agents are selected by task category, not manual assignment.

**Chorus Gap:**
Chorus has personas but no automatic category → persona mapping.

**Recommendation:**
```typescript
// src/config/task-categories.ts
interface TaskCategory {
  name: string;
  persona: PersonaType;        // Which persona handles this
  keywords: string[];          // Auto-detection keywords
  model?: string;              // Model override
}

const TASK_CATEGORIES: TaskCategory[] = [
  { name: "implementation", persona: "ed", keywords: ["build", "create", "add", "implement"] },
  { name: "bugfix", persona: "finn", keywords: ["fix", "bug", "error", "crash"] },
  { name: "architecture", persona: "pat", keywords: ["design", "architect", "refactor"] },
  { name: "exploration", persona: "sam", keywords: ["find", "search", "where", "how"] },
  { name: "review", persona: "lou", keywords: ["review", "check", "validate"] },
  { name: "analysis", persona: "ace", keywords: ["analyze", "suggest", "config"] },
];

function autoAssignPersona(task: Task): PersonaType {
  const titleLower = task.title.toLowerCase();
  for (const category of TASK_CATEGORIES) {
    if (category.keywords.some(k => titleLower.includes(k))) {
      return category.persona;
    }
  }
  return "ed"; // Default to Engineer Ed
}
```

**Benefits:**
- Automatic task routing to best persona
- Consistent agent selection
- User can override when needed

---

### 4. LSP Integration (Language Server Protocol) ⭐⭐⭐

**OMO Approach:**
7 LSP tools providing IDE-level intelligence:

| Tool | Purpose |
|------|---------|
| `lsp_get_diagnostics` | Get errors/warnings for file |
| `lsp_goto_definition` | Jump to symbol definition |
| `lsp_goto_references` | Find all references |
| `lsp_get_hover` | Get type info on hover |
| `lsp_get_completions` | Autocomplete suggestions |
| `lsp_get_signature` | Function signature help |
| `lsp_document_symbols` | Get file structure |

```typescript
// LSP client management
class LSPServerManager {
  private clients = new Map<string, ManagedClient>();
  private readonly IDLE_TIMEOUT = 5 * 60 * 1000;  // 5 min

  async getClient(root: string, server: ResolvedServer): Promise<LSPClient>;
  private cleanupIdleClients(): void;  // Auto-cleanup
}
```

**Chorus Gap:**
No LSP integration. Agents rely on grep/glob for code understanding.

**Recommendation:**
```typescript
// src/services/LSPService.ts
interface LSPService {
  getDiagnostics(file: string): Promise<Diagnostic[]>;
  gotoDefinition(file: string, line: number, col: number): Promise<Location[]>;
  findReferences(file: string, line: number, col: number): Promise<Location[]>;
  getHover(file: string, line: number, col: number): Promise<HoverInfo>;
}

// Integration with AgentMachine
// After agent completes file edit:
//   1. Get diagnostics for edited file
//   2. If errors, inject into next iteration
//   3. Track LSP-detected issues in task context
```

**Benefits:**
- Real-time type errors during agent work
- Accurate "go to definition" for understanding
- Better code navigation than grep

**Note:** This is a significant undertaking. Consider MVP scope carefully.

---

### 5. AST-Grep for Semantic Search ⭐⭐

**OMO Approach:**
```typescript
// Using @ast-grep/napi for AST-based search
import { parse, Lang } from "@ast-grep/napi";

// Find all function declarations
const result = parse(Lang.TypeScript, sourceCode);
const functions = result.root().findAll({
  rule: { kind: "function_declaration" }
});

// Semantic replace (preserves structure)
const replaced = result.root().replace({
  rule: { pattern: "console.log($MSG)" },
  fix: "logger.info($MSG)"
});
```

Two tools:
- `ast_grep_search` - Find patterns by AST structure
- `ast_grep_replace` - Semantic find-and-replace

**Chorus Gap:**
Only regex-based search (grep). No AST awareness.

**Recommendation:**
```typescript
// src/services/ASTSearchService.ts
interface ASTSearchService {
  search(pattern: string, lang: string, path?: string): Promise<Match[]>;
  replace(pattern: string, replacement: string, lang: string, path?: string): Promise<EditResult>;
}

// Example usage in agent context
// "Find all React components that use useState"
// Pattern: "function $NAME() { useState($INIT) }"
```

**Benefits:**
- More precise code search
- Semantic refactoring
- Language-aware transformations

---

### 6. Background Task Manager with Concurrency ⭐⭐

**OMO Approach:**
```typescript
class BackgroundManager {
  private concurrencyManager: ConcurrencyManager;
  private readonly TASK_TTL_MS = 30 * 60 * 1000;  // 30 min TTL
  private readonly MIN_STABILITY_TIME_MS = 10_000;  // 10s before stable
  private readonly DEFAULT_STALE_TIMEOUT_MS = 180_000;  // 3 min stale

  async launch(input: LaunchInput): Promise<BackgroundTask> {
    await this.concurrencyManager.acquire(input.agent);  // Wait for slot
    // Create session, track task...
  }

  // Process cleanup on shutdown
  private registerProcessCleanup(): void {
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
    process.on("beforeExit", cleanup);
  }
}
```

Features:
- Per-agent concurrency limits
- Stale task detection (no activity for 3 min)
- Parent-child task batching for notifications
- TTL-based auto-cleanup

**Chorus Gap:**
XState handles spawning but no explicit concurrency limits or TTL.

**Recommendation:**
```typescript
// src/services/ConcurrencyManager.ts
interface ConcurrencyConfig {
  maxConcurrentAgents: number;       // Total agents
  perPersonaConcurrency: number;     // Per persona limit
  staleTimeout: number;              // When to consider stale
  taskTTL: number;                   // Auto-cleanup after
}

class ConcurrencyManager {
  async acquire(persona: PersonaType): Promise<void>;
  release(persona: PersonaType): void;
  getActiveCount(): number;
  getWaitingCount(): number;
}
```

**Benefits:**
- Prevent resource exhaustion
- Fair scheduling across personas
- Automatic cleanup of zombie agents

---

### 7. System Directive Injection ⭐⭐

**OMO Approach:**
```typescript
const SYSTEM_DIRECTIVE_PREFIX = "[SYSTEM DIRECTIVE";

// Directive types
const directives = {
  DELEGATION_REQUIRED: "You MUST delegate this task to a specialist",
  BOULDER_CONTINUATION: "Continue working on the active plan",
  RALPH_LOOP: "Previous attempt incomplete, continue from checkpoint",
  TODO_CONTINUATION: "Pending TODOs detected, continue work",
};

// Injected into agent context
function injectDirective(type: string, content: string): string {
  return `${SYSTEM_DIRECTIVE_PREFIX} - ${type}]\n${content}`;
}
```

Structured directives that guide agent behavior without modifying system prompt.

**Chorus Gap:**
No standardized directive injection system.

**Recommendation:**
```typescript
// src/services/DirectiveInjector.ts
type DirectiveType =
  | "TASK_CONTEXT"
  | "PLAN_CONTINUATION"
  | "ERROR_RECOVERY"
  | "CONFLICT_RESOLUTION"
  | "LEARNING_INJECTION";

interface Directive {
  type: DirectiveType;
  priority: number;          // Higher = more important
  content: string;
  source: string;            // Where it came from
}

class DirectiveInjector {
  private directives: Map<string, Directive[]> = new Map();

  addDirective(taskId: string, directive: Directive): void;
  getDirectives(taskId: string): Directive[];  // Sorted by priority
  formatForAgent(taskId: string): string;      // Ready for context
}
```

**Benefits:**
- Consistent agent guidance
- Traceable directive sources
- Priority-based injection

---

### 8. Hook Message Injector (Cross-Hook Communication) ⭐⭐

**OMO Approach:**
```typescript
// Hooks communicate via file-based message storage
const MESSAGE_STORAGE = ".opencode/messages";

interface StoredMessage {
  sessionId: string;
  hookName: string;
  timestamp: number;
  fields: Record<string, unknown>;
}

function storeMessage(sessionId: string, hookName: string, fields: object): void;
function findNearestMessageWithFields(sessionId: string, fields: string[]): StoredMessage | null;
```

Hooks can store data that other hooks or subsequent iterations read.

**Chorus Gap:**
XState context is in-memory. No cross-session hook communication.

**Recommendation:**
```typescript
// src/services/HookMessageStore.ts
interface HookMessage {
  id: string;
  taskId: string;
  hookName: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

class HookMessageStore {
  store(taskId: string, hookName: string, data: object): void;
  findLatest(taskId: string, hookName: string): HookMessage | null;
  findByFields(taskId: string, fields: string[]): HookMessage | null;
}

// Use case: Error recovery hook stores failure info
// Next iteration's context injector reads it
```

**Benefits:**
- Cross-hook data sharing
- Debugging and tracing
- Error context preservation

---

### 9. Pre-Delegation Planning Protocol ⭐⭐

**OMO Approach:**
Before every delegation, Sisyphus must explicitly reason:

```markdown
### Pre-Delegation Planning (MANDATORY)

#### Step 1: Identify Task Requirements
- What is the CORE objective?
- What domain? (visual, business-logic, data, docs, exploration)
- What skills are CRITICAL?

#### Step 2: Select Category or Agent

Decision Tree:
1. Is this a skill-triggering pattern? → Declare skill name + reason
2. Is this visual/frontend? → Category: visual
3. Is this backend/architecture? → Category: business-logic
4. Is this documentation? → Category: docs
```

Forces agents to think before delegating.

**Chorus Gap:**
Task assignment is direct. No required reasoning step.

**Recommendation:**
Add pre-task reasoning to agent prompts:
```typescript
const PRE_TASK_PROTOCOL = `
Before starting any task, reason through:

1. **Task Classification**
   - Type: [implementation/bugfix/refactor/exploration]
   - Complexity: [trivial/moderate/complex]
   - Files likely affected: [list]

2. **Approach Selection**
   - Direct implementation OR
   - Need exploration first OR
   - Need architectural decision

3. **Verification Plan**
   - How will I know this is complete?
   - What tests should pass?
`;
```

**Benefits:**
- Reduced false starts
- Better task estimates
- Self-documented reasoning

---

### 10. Toast Notifications for Background Tasks ⭐

**OMO Approach:**
```typescript
class TaskToastManager {
  private pendingNotifications: Map<string, BackgroundTask[]> = new Map();

  // Batch notifications by parent session
  queueNotification(task: BackgroundTask): void;

  // Deliver when parent is ready
  deliverBatched(parentSessionId: string): void;

  // Format for display
  formatTaskStatus(task: BackgroundTask): string {
    const duration = formatDuration(task.startedAt, task.completedAt);
    return `✓ ${task.description} (${duration})`;
  }
}
```

Background task completions are batched and delivered to parent context.

**Chorus Gap:**
TUI shows agent status but no notification system for background events.

**Recommendation:**
```typescript
// src/features/NotificationQueue.ts
interface Notification {
  type: "task_complete" | "error" | "warning" | "info";
  agentId: string;
  message: string;
  timestamp: Date;
}

class NotificationQueue {
  private queue: Notification[] = [];

  push(notification: Notification): void;
  popBatch(): Notification[];
  hasUnread(): boolean;
}

// TUI integration
// Show notification badge: "3 updates"
// Press 'n' to view notification panel
```

**Benefits:**
- Non-intrusive updates
- Batched delivery (not spammy)
- History of events

---

### 11. Skill Trigger Detection ⭐

**OMO Approach:**
```typescript
// Step 0: Check Skills FIRST (BLOCKING)
// Before ANY classification or action, scan for matching skills.

const SKILL_TRIGGERS = {
  "git-master": ["git", "commit", "push", "merge", "branch"],
  "playwright": ["browser", "e2e", "screenshot", "automation"],
  "frontend-ui-ux": ["ui", "ux", "design", "component", "style"],
};

function detectSkillTrigger(userRequest: string): string | null {
  for (const [skill, triggers] of Object.entries(SKILL_TRIGGERS)) {
    if (triggers.some(t => userRequest.toLowerCase().includes(t))) {
      return skill;
    }
  }
  return null;
}
```

Skills are checked BEFORE general task classification.

**Chorus Gap:**
Skills exist in `.chorus/agents/*/skills/` but no auto-detection.

**Recommendation:**
```typescript
// src/services/SkillDetector.ts
interface SkillMatcher {
  skillName: string;
  triggers: string[];           // Keywords
  patterns?: RegExp[];          // Advanced patterns
  persona?: PersonaType;        // Which persona owns this skill
}

class SkillDetector {
  private matchers: SkillMatcher[] = [];

  loadFromDirectory(dir: string): void;  // Parse skill files
  detect(userInput: string): string | null;
  getSkillContent(skillName: string): string;
}
```

**Benefits:**
- Automatic skill invocation
- Consistent specialized handling
- User doesn't need to know skill names

---

### 12. Request Classification Matrix ⭐

**OMO Approach:**
Explicit classification before action:

| Type | Signal | Action |
|------|--------|--------|
| **Trivial** | Single file, known location | Direct tools only |
| **Explicit** | Specific file/line, clear command | Execute directly |
| **Exploratory** | "How does X work?" | Fire explore agents |
| **Open-ended** | "Improve", "Refactor" | Assess codebase first |
| **Ambiguous** | Unclear scope | Ask ONE clarifying question |

**Chorus Gap:**
No explicit request classification step.

**Recommendation:**
```typescript
type RequestType = "trivial" | "explicit" | "exploratory" | "open_ended" | "ambiguous";

interface ClassifiedRequest {
  type: RequestType;
  confidence: number;
  suggestedPersona: PersonaType;
  needsExploration: boolean;
  ambiguityReason?: string;
}

function classifyRequest(userInput: string, codebaseContext: Context): ClassifiedRequest;
```

**Benefits:**
- Appropriate response depth
- Prevents over-engineering trivial tasks
- Catches ambiguity early

---

## Ideas NOT to Adopt

### 1. OpenCode Plugin Architecture
OMO is tightly coupled to OpenCode's plugin API. Chorus's standalone TUI is more portable.

### 2. Bun-Exclusive Tooling
OMO requires Bun. Chorus's npm compatibility is more accessible.

### 3. 10+ Specialized Agents
OMO has many agents (Sisyphus, Oracle, Librarian, Explore, Frontend-Engineer, etc.). Chorus's 6-persona model is simpler and sufficient for MVP.

### 4. Multi-Model Orchestration
OMO uses different models per agent (GPT-5.2, Gemini-3, Grok). Chorus is Claude-focused (MVP scope).

### 5. tmux Integration
OMO has interactive bash sessions via tmux. Chorus handles this differently through XState.

### 6. MCP (Model Context Protocol) Embedding
OMO embeds MCP servers in skills. Chorus uses Claude Code's native MCP. No need to duplicate.

### 7. JSONC Config with Comments
Nice-to-have but not essential. TypeScript config works for Chorus.

---

## Implementation Priority

| Priority | Idea | Effort | Impact |
|----------|------|--------|--------|
| **P0** | Ralph Loop (Self-Retry) | Medium | High |
| **P0** | Boulder State (Plan Persistence) | Medium | High |
| **P0** | Category-Based Delegation | Low | High |
| **P1** | Background Task Concurrency | Medium | Medium |
| **P1** | System Directive Injection | Low | Medium |
| **P1** | Pre-Delegation Planning | Low | Medium |
| **P2** | Request Classification | Medium | Medium |
| **P2** | Skill Trigger Detection | Low | Medium |
| **P2** | Toast Notifications | Low | Low |
| **P2** | Hook Message Store | Medium | Medium |
| **P3** | LSP Integration | High | High |
| **P3** | AST-Grep Search | High | Medium |

---

## Detailed Feature Comparison

### Agent/Persona Philosophy

| Aspect | Oh-My-OpenCode | Chorus |
|--------|----------------|--------|
| **Count** | 10+ agents | 6 personas |
| **Model diversity** | Multi-model (Claude, GPT, Gemini, Grok) | Claude-only (MVP) |
| **Specialization** | Deep (Frontend-UI-UX, Document-Writer) | Role-based (Implementer, Fixer, Explorer) |
| **Delegation** | Category-based auto-select | Manual/Orchestrator assigns |
| **Background** | Concurrent with limits | XState spawned actors |

### State Persistence

| Aspect | Oh-My-OpenCode | Chorus |
|--------|----------------|--------|
| **Plan tracking** | Boulder state (JSON) | planning-state.json |
| **Progress** | Markdown checkbox parsing | Task status in TaskStore |
| **Session recovery** | Hook-based recovery | XState snapshot + events |
| **Cross-session** | Session IDs in boulder | Not yet implemented |

### Task Management

| Aspect | Oh-My-OpenCode | Chorus |
|--------|----------------|--------|
| **Format** | Markdown plans + checkboxes | JSONL TaskStore |
| **Priority** | Not explicit | P0-P3 |
| **Dependencies** | Implicit in plan order | Explicit `blockedBy` |
| **Auto-assignment** | Category → Agent | Future: keyword-based |

### Error Handling

| Aspect | Oh-My-OpenCode | Chorus |
|--------|----------------|--------|
| **Context recovery** | context-window-limit-recovery hook | NEEDS_HELP signal |
| **Edit errors** | edit-error-recovery hook | Agent retry |
| **Session crash** | session-recovery hook | XState snapshot restore |
| **Stale detection** | 3 min timeout | Monitoring region (planned) |

---

## OMO Architecture Insights

### Three-Phase Orchestration

```
Phase 0: Skill Check (BLOCKING)
  ↓
Phase 1: Codebase Assessment (for open-ended)
  ↓
Phase 2: Execution with Delegation
```

### Delegation Flow

```
User Request
  ↓
Classify Request Type
  ↓
Check Ambiguity → ASK if unclear
  ↓
Select Category/Agent
  ↓
Pre-Delegation Planning (mandatory reasoning)
  ↓
delegate_task() with:
  - description
  - category OR subagent_type
  - run_in_background
  - skills (optional)
  ↓
Background Manager tracks
  ↓
Completion → Toast Notification
```

### Boulder Lifecycle

```
Plan Created (Prometheus)
  ↓
Boulder State Created
  - active_plan: path
  - session_ids: [first]
  ↓
Work Progresses
  - Checkbox parsed: 5/20 done
  ↓
Session Ends (crash or complete)
  ↓
New Session Starts
  - Detects boulder state
  - Injects continuation directive
  - Appends session_id
  ↓
Continue from checkpoint
```

---

## Summary

Oh-My-OpenCode brings sophisticated ideas around:

1. **Plan Persistence** - Boulder state for cross-session work
2. **Self-Retry** - Ralph loop for completion guarantee
3. **Smart Delegation** - Category-based agent selection
4. **Code Intelligence** - LSP + AST-Grep integration
5. **Concurrency Control** - Background manager with limits
6. **Directive System** - Structured agent guidance

Chorus should adopt these patterns while keeping its strengths:
- XState-based state management (more robust)
- Visual TUI interface (better UX)
- Simpler persona model (6 vs 10+)
- Claude-focused (clearer MVP scope)
- **Learning system (Logger Lou)** - OMO lacks this!
- **Metrics system (Counter Carl)** - OMO lacks this!

### Key Takeaways

**Adopt from OMO:**
1. 🪨 **Boulder State** - Cross-session plan persistence
2. 🔄 **Ralph Loop** - Self-referential retry until complete
3. 📦 **Category Delegation** - Auto-assign persona by task type
4. 📋 **Pre-Delegation Planning** - Mandatory reasoning step
5. 🔧 **Directive Injection** - Structured context guidance
6. ⏱️ **Concurrency Limits** - Per-persona limits + TTL

**Chorus Innovations (not in OMO):**
1. 📈 **Counter Carl** - Dedicated metrics persona
2. 💡 **Logger Lou** - Learning extraction persona
3. 🎭 **Persona System** - Named agents with personalities
4. 🖥️ **TUI Dashboard** - Visual orchestration interface

---

**End of Comparison Report**
