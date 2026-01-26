/**
 * RulesScaffold Service
 *
 * Scaffolds default rules files during init.
 * Creates `.chorus/rules/` directory with default rule templates.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Default content for signal-types.md
 */
const SIGNAL_TYPES_CONTENT = `# Signal Types

Defines the signal types agents can emit to communicate status.

## COMPLETE
- **Description:** Task completed successfully
- **Payload Required:** false
- **Example:** \`<chorus>COMPLETE</chorus>\`

## BLOCKED
- **Description:** Cannot proceed due to blocker
- **Payload Required:** true
- **Payload Format:** Reason for blockage
- **Example:** \`<chorus>BLOCKED:Missing dependency</chorus>\`

## NEEDS_HELP
- **Description:** Need human assistance
- **Payload Required:** true
- **Payload Format:** Description of help needed
- **Example:** \`<chorus>NEEDS_HELP:Unclear requirements</chorus>\`

## PROGRESS
- **Description:** Report progress percentage
- **Payload Required:** true
- **Payload Format:** Percentage (0-100)
- **Example:** \`<chorus>PROGRESS:50</chorus>\`

## RESOLVED
- **Description:** Blocker has been resolved
- **Payload Required:** false
- **Example:** \`<chorus>RESOLVED</chorus>\`

## NEEDS_HUMAN
- **Description:** Requires human intervention
- **Payload Required:** true
- **Payload Format:** Reason for human intervention
- **Example:** \`<chorus>NEEDS_HUMAN:Security review required</chorus>\`
`;

/**
 * Default content for learning-format.md
 */
const LEARNING_FORMAT_CONTENT = `# Learning Format

Defines how agents should categorize and emit learnings.

## local
- **Description:** Only affects this task
- **Category Prefix:** local
- **Triggers Plan Review:** false
- **Triggers Alert:** false
- **Example:** "This function needs null check"

## cross-cutting
- **Description:** Affects multiple features
- **Category Prefix:** cross
- **Triggers Plan Review:** true
- **Triggers Alert:** false
- **Example:** "API rate limits require backoff"

## architectural
- **Description:** Fundamental design decision
- **Category Prefix:** arch
- **Triggers Plan Review:** true
- **Triggers Alert:** true
- **Example:** "Database schema change required"
`;

/**
 * Default content for commit-format.md
 */
const COMMIT_FORMAT_CONTENT = `# Commit Format

Defines conventional commit message format for agents.

## feat
- **Description:** New feature
- **Scope Required:** false
- **Breaking Change Marker:** true
- **Format:** feat: description [task-id]
- **Example:** feat: add user authentication [ch-123]

## fix
- **Description:** Bug fix
- **Scope Required:** false
- **Breaking Change Marker:** false
- **Format:** fix: description [task-id]
- **Example:** fix: handle null input [ch-456]

## chore
- **Description:** Maintenance task
- **Scope Required:** false
- **Breaking Change Marker:** false
- **Format:** chore: description [task-id]
- **Example:** chore: update dependencies [ch-789]

## refactor
- **Description:** Code refactoring
- **Scope Required:** false
- **Breaking Change Marker:** false
- **Format:** refactor: description [task-id]
- **Example:** refactor: extract validation logic [ch-012]

## test
- **Description:** Test changes
- **Scope Required:** false
- **Breaking Change Marker:** false
- **Format:** test: description [task-id]
- **Example:** test: add unit tests for parser [ch-345]
`;

/**
 * Default content for completion-protocol.md
 */
const COMPLETION_PROTOCOL_CONTENT = `# Completion Protocol

Defines requirements for task completion verification.

## emit-complete-signal
- **Description:** Emit COMPLETE signal when done
- **Required:** true
- **Verification Method:** signal
- **Error Message:** Task must emit COMPLETE signal

## tests-pass
- **Description:** All tests must pass
- **Required:** true
- **Verification Method:** test
- **Error Message:** Tests must pass before completion

## quality-pass
- **Description:** Quality checks must pass
- **Required:** true
- **Verification Method:** test
- **Error Message:** npm run quality must pass
`;

/**
 * Service to scaffold default rules files during init.
 */
export class RulesScaffold {
	private readonly rulesDir: string;

	constructor(projectDir: string) {
		this.rulesDir = join(projectDir, ".chorus", "rules");
	}

	/**
	 * Create the .chorus/rules/ directory if it doesn't exist
	 */
	scaffoldRulesDir(): void {
		if (!existsSync(this.rulesDir)) {
			mkdirSync(this.rulesDir, { recursive: true });
		}
	}

	/**
	 * Create signal-types.md with default content (skip if exists)
	 */
	scaffoldSignalTypes(): void {
		const filePath = join(this.rulesDir, "signal-types.md");
		this.writeIfNotExists(filePath, SIGNAL_TYPES_CONTENT);
	}

	/**
	 * Create learning-format.md with default content (skip if exists)
	 */
	scaffoldLearningFormat(): void {
		const filePath = join(this.rulesDir, "learning-format.md");
		this.writeIfNotExists(filePath, LEARNING_FORMAT_CONTENT);
	}

	/**
	 * Create commit-format.md with default content (skip if exists)
	 */
	scaffoldCommitFormat(): void {
		const filePath = join(this.rulesDir, "commit-format.md");
		this.writeIfNotExists(filePath, COMMIT_FORMAT_CONTENT);
	}

	/**
	 * Create completion-protocol.md with default content (skip if exists)
	 */
	scaffoldCompletionProtocol(): void {
		const filePath = join(this.rulesDir, "completion-protocol.md");
		this.writeIfNotExists(filePath, COMPLETION_PROTOCOL_CONTENT);
	}

	/**
	 * Scaffold all rule files (creates directory and all files)
	 */
	scaffoldAll(): void {
		this.scaffoldRulesDir();
		this.scaffoldSignalTypes();
		this.scaffoldLearningFormat();
		this.scaffoldCommitFormat();
		this.scaffoldCompletionProtocol();
	}

	/**
	 * Write content to file only if file doesn't exist
	 */
	private writeIfNotExists(filePath: string, content: string): void {
		if (!existsSync(filePath)) {
			writeFileSync(filePath, content);
		}
	}
}
