# F07: Task Prompt Builder

**Milestone:** 2 - Agent Preparation
**Dependencies:** None
**Estimated Tests:** 8

---

## What It Does

Builds agent prompts with task context, acceptance criteria, and the Chorus signal protocol.

---

## Why It's Needed

- Agent needs to know what task to complete
- Agent needs to know how to signal completion
- Non-Claude agents need AGENTS.md + learnings injected
- Different prompt for different agent types

---

## Prompt Template

```markdown
# Task: {task_id}

## Description
{task_description}

## Acceptance Criteria
{acceptance_criteria or "All tests pass"}

## Completion Protocol
When ALL criteria are met:
1. Ensure tests pass: `{testCommand}`
2. Output exactly: <chorus>COMPLETE</chorus>

If blocked, output: <chorus>BLOCKED: reason</chorus>
If need help, output: <chorus>NEEDS_HELP: question</chorus>

## Context
- Read AGENTS.md for project conventions
- Read .agent/learnings.md for known patterns
- Current branch: agent/{agent}/{task_id}
- Commit format: "type(scope): description [{task_id}]"

## Important
- Log discoveries to .agent/scratchpad.md
- Commit frequently with task ID in message
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/services/PromptBuilder.ts` | Build prompts for agents |
| `tests/services/PromptBuilder.test.ts` | Unit tests |

---

## PromptBuilder API

```typescript
// src/services/PromptBuilder.ts

import type { Bead } from '../types/bead';
import type { ChorusConfig } from '../types/config';

export interface PromptContext {
  task: Bead;
  agentType: 'claude' | 'codex' | 'opencode';
  branch: string;
  config: ChorusConfig;
  learnings?: string;  // For non-Claude agents
}

export class PromptBuilder {
  // Build full prompt for agent
  build(context: PromptContext): string;

  // Build task section only
  buildTaskSection(task: Bead): string;

  // Build completion protocol section
  buildCompletionSection(config: ChorusConfig): string;

  // Load AGENTS.md content (for non-Claude)
  loadAgentsMd(projectDir: string): string | null;

  // Load learnings (for non-Claude)
  loadLearnings(projectDir: string): string | null;

  // Check if agent needs context injection
  needsContextInjection(agentType: string): boolean;
}
```

---

## Agent Type Handling

```typescript
build(context: PromptContext): string {
  const { task, agentType, branch, config, learnings } = context;

  // Base prompt (all agents)
  let prompt = this.buildTaskSection(task);
  prompt += this.buildCompletionSection(config);
  prompt += this.buildContextSection(branch, task.id);

  // Non-Claude agents need extra context
  if (this.needsContextInjection(agentType)) {
    const agentsMd = this.loadAgentsMd(config.projectDir);
    if (agentsMd) {
      prompt = `# Project Context\n${agentsMd}\n\n` + prompt;
    }
    if (learnings) {
      prompt = prompt.replace('## Context', `## Relevant Learnings\n${learnings}\n\n## Context`);
    }
  }

  return prompt;
}

needsContextInjection(agentType: string): boolean {
  // Claude loads .claude/rules natively
  return agentType !== 'claude';
}
```

---

## Test Cases

```typescript
// tests/services/PromptBuilder.test.ts

describe('PromptBuilder', () => {
  describe('build', () => {
    it('should include task description');
    it('should include acceptance criteria from task');
    it('should use default criteria if none specified');
    it('should include completion protocol');
    it('should include branch name');
  });

  describe('context injection', () => {
    it('should NOT inject for claude agent');
    it('should inject AGENTS.md for codex');
    it('should inject learnings for non-claude');
  });
});
```

---

## Acceptance Criteria

- [ ] Generates prompt with task description
- [ ] Includes acceptance criteria (or default)
- [ ] Includes completion protocol with signal
- [ ] Includes branch/context info
- [ ] Claude: no extra injection
- [ ] Codex/OpenCode: includes AGENTS.md
- [ ] Codex/OpenCode: includes learnings if available
- [ ] All 8 tests pass

---

## Implementation Notes

1. Task description comes from Bead.description or Bead.title
2. Acceptance criteria from Bead.custom?.acceptance_criteria
3. Test command from config.project.testCommand
4. Signal from config.completion.signal
5. Claude natively loads its own context - don't duplicate
