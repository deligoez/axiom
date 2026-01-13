import { execSync } from "node:child_process";
import {
	appendFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { RulesScaffold } from "./RulesScaffold.js";

export type ProjectType = "node" | "python" | "go" | "unknown";

export interface DetectedSettings {
	testCommand?: string;
	buildCommand?: string;
	projectType: ProjectType;
}

const SCRATCHPAD_TEMPLATE = `# Scratchpad

## Current Task
Task ID: {taskId}

## Notes
<!-- Working notes, decisions, blockers -->

## Files Modified
<!-- Track files changed during this task -->
`;

const IMPL_AGENT_TEMPLATE = `# Implementation Agent

You are an implementation agent for Chorus multi-agent orchestration.

## Your Context
- Working in an isolated git worktree
- Task details are in your scratchpad
- Use TDD: write tests first, then implement

## Signals
When done, output: <chorus>COMPLETE</chorus>
On blocker, output: <chorus>BLOCKED: reason</chorus>
If you need clarification, output: <chorus>NEEDS_HELP: what you need</chorus>
`;

const TASK_RULES_TEMPLATE = `# Task Validation Rules

## Required Fields
- Task ID must follow format: ch-xxxx
- Title must be non-empty
- Priority must be P0, P1, P2, or P3

## Completion Criteria
- All acceptance criteria must be checked
- Tests must pass
- Quality checks must pass
`;

const PATTERNS_TEMPLATE = `# Patterns

## Architecture


## Testing


## Code Style

`;

const LEARNINGS_TEMPLATE = `# Project Learnings

<!-- Cross-session learnings shared by all agents -->
`;

const PLANNING_STATE_TEMPLATE = {
	status: "planning",
	planSummary: { userGoal: "", estimatedTasks: 0 },
	tasks: [],
	reviewIterations: [],
};

const AGENTS_MD_TEMPLATE = `# Agents

This file documents agent behaviors for AI coding assistants.

## Chorus

This project uses Chorus for multi-agent orchestration.
See \`.chorus/\` for configuration.
`;

const PLAN_AGENT_TEMPLATE = `# Plan Agent

You are a planning agent for Chorus multi-agent orchestration.

## Your Role
- Analyze user goals and create task decomposition
- Validate task specifications
- Review and iterate on plans

## Guidelines
- Keep tasks atomic and testable
- Estimate test counts accurately
- Identify dependencies between tasks
`;

const GITIGNORE_ENTRIES = [".worktrees/", ".chorus/state.json", ".agent/"];

export class BeadsInitError extends Error {
	constructor(
		message: string,
		public exitCode: number,
	) {
		super(message);
		this.name = "BeadsInitError";
	}
}

export class InitScaffold {
	constructor(private projectDir: string) {}

	createDirectories(): void {
		const dirs = [
			".chorus",
			".chorus/hooks",
			".chorus/prompts",
			".chorus/templates",
			".chorus/specs",
			".chorus/specs/archive",
			".worktrees",
			".agent",
		];

		for (const dir of dirs) {
			const fullPath = join(this.projectDir, dir);
			if (!existsSync(fullPath)) {
				mkdirSync(fullPath, { recursive: true });
			}
		}

		// Create .agent/learnings.md
		const learningsPath = join(this.projectDir, ".agent", "learnings.md");
		if (!existsSync(learningsPath)) {
			writeFileSync(learningsPath, LEARNINGS_TEMPLATE);
		}

		// Create empty session-log.jsonl
		const sessionLogPath = join(
			this.projectDir,
			".chorus",
			"session-log.jsonl",
		);
		if (!existsSync(sessionLogPath)) {
			writeFileSync(sessionLogPath, "");
		}
	}

	createPlanningFiles(): void {
		const files = [
			{
				path: ".chorus/planning-state.json",
				content: JSON.stringify(PLANNING_STATE_TEMPLATE, null, 2),
			},
			{
				path: ".chorus/task-rules.md",
				content: TASK_RULES_TEMPLATE,
			},
			{
				path: ".chorus/PATTERNS.md",
				content: PATTERNS_TEMPLATE,
			},
			{
				path: ".chorus/pending-patterns.json",
				content: "[]",
			},
			{
				path: ".chorus/specs/spec-progress.json",
				content: "{}",
			},
			{
				path: ".chorus/templates/scratchpad.md",
				content: SCRATCHPAD_TEMPLATE,
			},
			{
				path: ".chorus/prompts/impl-agent.md",
				content: IMPL_AGENT_TEMPLATE,
			},
		];

		for (const file of files) {
			const fullPath = join(this.projectDir, file.path);
			if (!existsSync(fullPath)) {
				writeFileSync(fullPath, file.content);
			}
		}
	}

	detectProjectSettings(): DetectedSettings {
		// Check for package.json (node) - highest priority
		const packageJsonPath = join(this.projectDir, "package.json");
		if (existsSync(packageJsonPath)) {
			return this.detectNodeSettings(packageJsonPath);
		}

		// Check for pyproject.toml (python)
		const pyprojectPath = join(this.projectDir, "pyproject.toml");
		if (existsSync(pyprojectPath)) {
			return this.detectPythonSettings(pyprojectPath);
		}

		// Check for go.mod (go)
		const goModPath = join(this.projectDir, "go.mod");
		if (existsSync(goModPath)) {
			return {
				projectType: "go",
				testCommand: "go test ./...",
			};
		}

		// Unknown project type
		return {
			projectType: "unknown",
		};
	}

	private detectNodeSettings(packageJsonPath: string): DetectedSettings {
		const result: DetectedSettings = {
			projectType: "node",
		};

		try {
			const content = readFileSync(packageJsonPath, "utf-8");
			const pkg = JSON.parse(content);

			if (pkg.scripts?.test) {
				result.testCommand = "npm test";
			}

			if (pkg.scripts?.build) {
				result.buildCommand = "npm run build";
			}
		} catch {
			// If we can't parse, just return with projectType
		}

		return result;
	}

	private detectPythonSettings(pyprojectPath: string): DetectedSettings {
		const result: DetectedSettings = {
			projectType: "python",
		};

		try {
			const content = readFileSync(pyprojectPath, "utf-8");

			if (content.includes("[tool.pytest]")) {
				result.testCommand = "pytest";
			}
		} catch {
			// If we can't parse, just return with projectType
		}

		return result;
	}

	initBeads(): void {
		const beadsDir = join(this.projectDir, ".beads");

		if (existsSync(beadsDir)) {
			return; // Skip if already exists
		}

		try {
			execSync("bd init", {
				cwd: this.projectDir,
				stdio: "pipe",
				encoding: "utf-8",
			});
		} catch (error) {
			const err = error as { status?: number; message?: string };
			throw new BeadsInitError(
				`bd init failed: ${err.message}`,
				err.status ?? 1,
			);
		}
	}

	createAgentsMd(): void {
		const agentsPath = join(this.projectDir, "AGENTS.md");
		if (!existsSync(agentsPath)) {
			writeFileSync(agentsPath, AGENTS_MD_TEMPLATE);
		}
	}

	createTaskRulesMd(): void {
		const rulesPath = join(this.projectDir, ".chorus", "task-rules.md");
		if (!existsSync(rulesPath)) {
			writeFileSync(rulesPath, TASK_RULES_TEMPLATE);
		}
	}

	createPatternsMd(): void {
		const patternsPath = join(this.projectDir, ".chorus", "PATTERNS.md");
		if (!existsSync(patternsPath)) {
			writeFileSync(patternsPath, PATTERNS_TEMPLATE);
		}
	}

	createPlanAgentPrompt(): void {
		const promptPath = join(
			this.projectDir,
			".chorus",
			"prompts",
			"plan-agent.md",
		);
		if (!existsSync(promptPath)) {
			writeFileSync(promptPath, PLAN_AGENT_TEMPLATE);
		}
	}

	createImplAgentPrompt(): void {
		const promptPath = join(
			this.projectDir,
			".chorus",
			"prompts",
			"impl-agent.md",
		);
		if (!existsSync(promptPath)) {
			writeFileSync(promptPath, IMPL_AGENT_TEMPLATE);
		}
	}

	updateGitignore(): void {
		const gitignorePath = join(this.projectDir, ".gitignore");

		let content = "";
		if (existsSync(gitignorePath)) {
			content = readFileSync(gitignorePath, "utf-8");
		}

		const linesToAdd: string[] = [];
		for (const entry of GITIGNORE_ENTRIES) {
			if (!content.includes(entry)) {
				linesToAdd.push(entry);
			}
		}

		if (linesToAdd.length > 0) {
			const suffix = content.endsWith("\n") || content === "" ? "" : "\n";
			const newContent = `${linesToAdd.join("\n")}\n`;
			appendFileSync(gitignorePath, suffix + newContent);
		}
	}

	/**
	 * Scaffold shared rules files in .chorus/rules/
	 * Uses RulesScaffold to create signal-types.md, learning-format.md,
	 * commit-format.md, and completion-protocol.md
	 */
	scaffoldRules(): void {
		const rulesScaffold = new RulesScaffold(this.projectDir);
		rulesScaffold.scaffoldAll();
	}

	/**
	 * Scaffold agent persona files in .chorus/personas/
	 * TODO: Implement after AP03 (PersonaScaffold)
	 */
	scaffoldPersonas(): void {
		// Placeholder for future PersonaScaffold integration
		// Will be implemented after AP03 task is complete
	}
}
