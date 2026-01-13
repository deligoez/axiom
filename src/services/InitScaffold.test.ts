import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BeadsInitError, InitScaffold } from "./InitScaffold.js";

describe("InitScaffold", () => {
	let tempDir: string;
	let scaffold: InitScaffold;

	beforeEach(() => {
		tempDir = join(
			tmpdir(),
			`chorus-scaffold-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		);
		mkdirSync(tempDir, { recursive: true });
		scaffold = new InitScaffold(tempDir);
	});

	afterEach(() => {
		try {
			rmSync(tempDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("createDirectories()", () => {
		it("creates .chorus/ directory if not exists", () => {
			// Arrange & Act
			scaffold.createDirectories();

			// Assert
			expect(existsSync(join(tempDir, ".chorus"))).toBe(true);
		});

		it("creates .chorus/hooks/ directory if not exists", () => {
			// Arrange & Act
			scaffold.createDirectories();

			// Assert
			expect(existsSync(join(tempDir, ".chorus/hooks"))).toBe(true);
		});

		it("creates .chorus/prompts/ directory if not exists", () => {
			// Arrange & Act
			scaffold.createDirectories();

			// Assert
			expect(existsSync(join(tempDir, ".chorus/prompts"))).toBe(true);
		});

		it("creates .chorus/templates/ directory if not exists", () => {
			// Arrange & Act
			scaffold.createDirectories();

			// Assert
			expect(existsSync(join(tempDir, ".chorus/templates"))).toBe(true);
		});

		it("creates .chorus/specs/ directory if not exists", () => {
			// Arrange & Act
			scaffold.createDirectories();

			// Assert
			expect(existsSync(join(tempDir, ".chorus/specs"))).toBe(true);
		});

		it("creates .chorus/specs/archive/ directory if not exists", () => {
			// Arrange & Act
			scaffold.createDirectories();

			// Assert
			expect(existsSync(join(tempDir, ".chorus/specs/archive"))).toBe(true);
		});

		it("creates .worktrees/ directory at project root if not exists", () => {
			// Arrange & Act
			scaffold.createDirectories();

			// Assert
			expect(existsSync(join(tempDir, ".worktrees"))).toBe(true);
		});

		it("creates .agent/ directory with learnings.md template", () => {
			// Arrange & Act
			scaffold.createDirectories();

			// Assert
			expect(existsSync(join(tempDir, ".agent"))).toBe(true);
			const learningsPath = join(tempDir, ".agent/learnings.md");
			expect(existsSync(learningsPath)).toBe(true);
			const content = readFileSync(learningsPath, "utf-8");
			expect(content).toContain("# Project Learnings");
		});

		it("creates empty .chorus/session-log.jsonl file", () => {
			// Arrange & Act
			scaffold.createDirectories();

			// Assert
			const sessionLogPath = join(tempDir, ".chorus/session-log.jsonl");
			expect(existsSync(sessionLogPath)).toBe(true);
			const content = readFileSync(sessionLogPath, "utf-8");
			expect(content).toBe("");
		});

		it("skips creation if directories already exist (idempotent)", () => {
			// Arrange - create directories first
			mkdirSync(join(tempDir, ".chorus"), { recursive: true });
			writeFileSync(join(tempDir, ".chorus/existing.txt"), "existing");

			// Act
			scaffold.createDirectories();

			// Assert - existing content should remain
			expect(existsSync(join(tempDir, ".chorus/existing.txt"))).toBe(true);
		});
	});

	describe("createPlanningFiles()", () => {
		beforeEach(() => {
			// Ensure directories exist for file creation
			scaffold.createDirectories();
		});

		it("creates .chorus/planning-state.json with empty state template", () => {
			// Arrange & Act
			scaffold.createPlanningFiles();

			// Assert
			const filePath = join(tempDir, ".chorus/planning-state.json");
			expect(existsSync(filePath)).toBe(true);
			const content = JSON.parse(readFileSync(filePath, "utf-8"));
			expect(content.status).toBe("planning");
			expect(content.tasks).toEqual([]);
		});

		it("creates .chorus/task-rules.md with default rules template", () => {
			// Arrange & Act
			scaffold.createPlanningFiles();

			// Assert
			const filePath = join(tempDir, ".chorus/task-rules.md");
			expect(existsSync(filePath)).toBe(true);
			const content = readFileSync(filePath, "utf-8");
			expect(content).toContain("# Task Validation Rules");
		});

		it("creates .chorus/PATTERNS.md with empty template sections", () => {
			// Arrange & Act
			scaffold.createPlanningFiles();

			// Assert
			const filePath = join(tempDir, ".chorus/PATTERNS.md");
			expect(existsSync(filePath)).toBe(true);
			const content = readFileSync(filePath, "utf-8");
			expect(content).toContain("# Patterns");
			expect(content).toContain("## Architecture");
		});

		it("creates .chorus/pending-patterns.json with empty array", () => {
			// Arrange & Act
			scaffold.createPlanningFiles();

			// Assert
			const filePath = join(tempDir, ".chorus/pending-patterns.json");
			expect(existsSync(filePath)).toBe(true);
			const content = readFileSync(filePath, "utf-8");
			expect(content).toBe("[]");
		});

		it("creates .chorus/specs/spec-progress.json with empty object", () => {
			// Arrange & Act
			scaffold.createPlanningFiles();

			// Assert
			const filePath = join(tempDir, ".chorus/specs/spec-progress.json");
			expect(existsSync(filePath)).toBe(true);
			const content = readFileSync(filePath, "utf-8");
			expect(content).toBe("{}");
		});

		it("creates .chorus/templates/scratchpad.md with scratchpad template", () => {
			// Arrange & Act
			scaffold.createPlanningFiles();

			// Assert
			const filePath = join(tempDir, ".chorus/templates/scratchpad.md");
			expect(existsSync(filePath)).toBe(true);
			const content = readFileSync(filePath, "utf-8");
			expect(content).toContain("# Scratchpad");
			expect(content).toContain("## Current Task");
		});

		it("creates .chorus/prompts/impl-agent.md with implementation agent prompt", () => {
			// Arrange & Act
			scaffold.createPlanningFiles();

			// Assert
			const filePath = join(tempDir, ".chorus/prompts/impl-agent.md");
			expect(existsSync(filePath)).toBe(true);
			const content = readFileSync(filePath, "utf-8");
			expect(content).toContain("# Implementation Agent");
			expect(content).toContain("<chorus>COMPLETE</chorus>");
		});
	});

	describe("detectProjectSettings()", () => {
		it("returns testCommand: 'npm test' when package.json has scripts.test", () => {
			// Arrange
			writeFileSync(
				join(tempDir, "package.json"),
				JSON.stringify({ scripts: { test: "vitest" } }),
			);

			// Act
			const settings = scaffold.detectProjectSettings();

			// Assert
			expect(settings.testCommand).toBe("npm test");
		});

		it("returns testCommand: 'pytest' when pyproject.toml exists with [tool.pytest]", () => {
			// Arrange
			writeFileSync(
				join(tempDir, "pyproject.toml"),
				`[tool.pytest]\naddopts = "-v"`,
			);

			// Act
			const settings = scaffold.detectProjectSettings();

			// Assert
			expect(settings.testCommand).toBe("pytest");
		});

		it("returns testCommand: 'go test ./...' when go.mod exists", () => {
			// Arrange
			writeFileSync(join(tempDir, "go.mod"), "module example.com/test");

			// Act
			const settings = scaffold.detectProjectSettings();

			// Assert
			expect(settings.testCommand).toBe("go test ./...");
		});

		it("returns buildCommand: 'npm run build' when package.json has scripts.build", () => {
			// Arrange
			writeFileSync(
				join(tempDir, "package.json"),
				JSON.stringify({ scripts: { build: "tsc" } }),
			);

			// Act
			const settings = scaffold.detectProjectSettings();

			// Assert
			expect(settings.buildCommand).toBe("npm run build");
		});

		it("returns projectType: 'node' when package.json exists", () => {
			// Arrange
			writeFileSync(join(tempDir, "package.json"), JSON.stringify({}));

			// Act
			const settings = scaffold.detectProjectSettings();

			// Assert
			expect(settings.projectType).toBe("node");
		});

		it("returns projectType: 'python' when pyproject.toml exists (no package.json)", () => {
			// Arrange
			writeFileSync(join(tempDir, "pyproject.toml"), "[project]");

			// Act
			const settings = scaffold.detectProjectSettings();

			// Assert
			expect(settings.projectType).toBe("python");
		});

		it("returns projectType: 'go' when go.mod exists (no package.json/pyproject.toml)", () => {
			// Arrange
			writeFileSync(join(tempDir, "go.mod"), "module test");

			// Act
			const settings = scaffold.detectProjectSettings();

			// Assert
			expect(settings.projectType).toBe("go");
		});

		it("returns projectType: 'unknown' when no project files found", () => {
			// Arrange - no files

			// Act
			const settings = scaffold.detectProjectSettings();

			// Assert
			expect(settings.projectType).toBe("unknown");
			expect(settings.testCommand).toBeUndefined();
		});
	});

	describe("initBeads()", () => {
		it("skips bd init when .beads/ directory already exists", () => {
			// Arrange
			mkdirSync(join(tempDir, ".beads"), { recursive: true });

			// Act - should not throw
			scaffold.initBeads();

			// Assert - directory still exists
			expect(existsSync(join(tempDir, ".beads"))).toBe(true);
		});

		it("creates .beads/ directory when bd init succeeds", () => {
			// Arrange - .beads does not exist
			expect(existsSync(join(tempDir, ".beads"))).toBe(false);

			// Act
			scaffold.initBeads();

			// Assert - bd init created the directory
			expect(existsSync(join(tempDir, ".beads"))).toBe(true);
		});

		it("BeadsInitError has correct properties", () => {
			// Arrange
			const error = new BeadsInitError("test error", 42);

			// Assert
			expect(error.name).toBe("BeadsInitError");
			expect(error.message).toBe("test error");
			expect(error.exitCode).toBe(42);
		});
	});

	describe("createAgentsMd()", () => {
		it("creates AGENTS.md with template content when file does not exist", () => {
			// Arrange & Act
			scaffold.createAgentsMd();

			// Assert
			const agentsPath = join(tempDir, "AGENTS.md");
			expect(existsSync(agentsPath)).toBe(true);
			const content = readFileSync(agentsPath, "utf-8");
			expect(content).toContain("# Agents");
			expect(content).toContain("Chorus");
		});

		it("skips creation when AGENTS.md already exists", () => {
			// Arrange
			const agentsPath = join(tempDir, "AGENTS.md");
			writeFileSync(agentsPath, "# Custom Content");

			// Act
			scaffold.createAgentsMd();

			// Assert
			const content = readFileSync(agentsPath, "utf-8");
			expect(content).toBe("# Custom Content");
		});
	});

	describe("createTaskRulesMd()", () => {
		beforeEach(() => {
			scaffold.createDirectories();
		});

		it("creates .chorus/task-rules.md with default validation rules", () => {
			// Arrange & Act
			scaffold.createTaskRulesMd();

			// Assert
			const rulesPath = join(tempDir, ".chorus/task-rules.md");
			expect(existsSync(rulesPath)).toBe(true);
			const content = readFileSync(rulesPath, "utf-8");
			expect(content).toContain("# Task Validation Rules");
		});

		it("skips creation when file already exists", () => {
			// Arrange
			const rulesPath = join(tempDir, ".chorus/task-rules.md");
			writeFileSync(rulesPath, "# Custom Rules");

			// Act
			scaffold.createTaskRulesMd();

			// Assert
			const content = readFileSync(rulesPath, "utf-8");
			expect(content).toBe("# Custom Rules");
		});
	});

	describe("createPatternsMd()", () => {
		beforeEach(() => {
			scaffold.createDirectories();
		});

		it("creates .chorus/PATTERNS.md with empty category sections", () => {
			// Arrange & Act
			scaffold.createPatternsMd();

			// Assert
			const patternsPath = join(tempDir, ".chorus/PATTERNS.md");
			expect(existsSync(patternsPath)).toBe(true);
			const content = readFileSync(patternsPath, "utf-8");
			expect(content).toContain("# Patterns");
		});

		it("skips creation when file already exists", () => {
			// Arrange
			const patternsPath = join(tempDir, ".chorus/PATTERNS.md");
			writeFileSync(patternsPath, "# Custom Patterns");

			// Act
			scaffold.createPatternsMd();

			// Assert
			const content = readFileSync(patternsPath, "utf-8");
			expect(content).toBe("# Custom Patterns");
		});
	});

	describe("createPlanAgentPrompt()", () => {
		beforeEach(() => {
			scaffold.createDirectories();
		});

		it("creates .chorus/prompts/plan-agent.md with plan agent system prompt", () => {
			// Arrange & Act
			scaffold.createPlanAgentPrompt();

			// Assert
			const promptPath = join(tempDir, ".chorus/prompts/plan-agent.md");
			expect(existsSync(promptPath)).toBe(true);
			const content = readFileSync(promptPath, "utf-8");
			expect(content).toContain("# Plan Agent");
		});

		it("skips creation when file already exists", () => {
			// Arrange
			const promptPath = join(tempDir, ".chorus/prompts/plan-agent.md");
			writeFileSync(promptPath, "# Custom Prompt");

			// Act
			scaffold.createPlanAgentPrompt();

			// Assert
			const content = readFileSync(promptPath, "utf-8");
			expect(content).toBe("# Custom Prompt");
		});
	});

	describe("createImplAgentPrompt()", () => {
		beforeEach(() => {
			scaffold.createDirectories();
		});

		it("creates .chorus/prompts/impl-agent.md with implementation agent prompt", () => {
			// Arrange & Act
			scaffold.createImplAgentPrompt();

			// Assert
			const promptPath = join(tempDir, ".chorus/prompts/impl-agent.md");
			expect(existsSync(promptPath)).toBe(true);
			const content = readFileSync(promptPath, "utf-8");
			expect(content).toContain("# Implementation Agent");
		});

		it("skips creation when file already exists", () => {
			// Arrange
			const promptPath = join(tempDir, ".chorus/prompts/impl-agent.md");
			writeFileSync(promptPath, "# Custom Implementation");

			// Act
			scaffold.createImplAgentPrompt();

			// Assert
			const content = readFileSync(promptPath, "utf-8");
			expect(content).toBe("# Custom Implementation");
		});
	});

	describe("updateGitignore()", () => {
		it("appends .worktrees/ to .gitignore if not present", () => {
			// Arrange & Act
			scaffold.updateGitignore();

			// Assert
			const gitignorePath = join(tempDir, ".gitignore");
			const content = readFileSync(gitignorePath, "utf-8");
			expect(content).toContain(".worktrees/");
		});

		it("appends .chorus/state.json to .gitignore if not present", () => {
			// Arrange & Act
			scaffold.updateGitignore();

			// Assert
			const gitignorePath = join(tempDir, ".gitignore");
			const content = readFileSync(gitignorePath, "utf-8");
			expect(content).toContain(".chorus/state.json");
		});

		it("appends .agent/ to .gitignore if not present", () => {
			// Arrange & Act
			scaffold.updateGitignore();

			// Assert
			const gitignorePath = join(tempDir, ".gitignore");
			const content = readFileSync(gitignorePath, "utf-8");
			expect(content).toContain(".agent/");
		});

		it("does not duplicate entries already in .gitignore", () => {
			// Arrange
			const gitignorePath = join(tempDir, ".gitignore");
			writeFileSync(gitignorePath, ".worktrees/\nnode_modules/\n");

			// Act
			scaffold.updateGitignore();

			// Assert
			const content = readFileSync(gitignorePath, "utf-8");
			const occurrences = (content.match(/\.worktrees\//g) || []).length;
			expect(occurrences).toBe(1);
		});

		it("creates .gitignore if file does not exist", () => {
			// Arrange - no .gitignore

			// Act
			scaffold.updateGitignore();

			// Assert
			const gitignorePath = join(tempDir, ".gitignore");
			expect(existsSync(gitignorePath)).toBe(true);
		});
	});

	// MH04: RulesScaffold Integration Tests (4 tests)
	describe("scaffoldRules()", () => {
		it("creates .chorus/rules/ directory with all rule files", () => {
			// Arrange & Act
			scaffold.scaffoldRules();

			// Assert
			const rulesDir = join(tempDir, ".chorus", "rules");
			expect(existsSync(rulesDir)).toBe(true);
			expect(existsSync(join(rulesDir, "signal-types.md"))).toBe(true);
			expect(existsSync(join(rulesDir, "learning-format.md"))).toBe(true);
			expect(existsSync(join(rulesDir, "commit-format.md"))).toBe(true);
			expect(existsSync(join(rulesDir, "completion-protocol.md"))).toBe(true);
		});

		it("creates signal-types.md with COMPLETE and BLOCKED signals", () => {
			// Arrange & Act
			scaffold.scaffoldRules();

			// Assert
			const filePath = join(tempDir, ".chorus", "rules", "signal-types.md");
			const content = readFileSync(filePath, "utf-8");
			expect(content).toContain("## COMPLETE");
			expect(content).toContain("## BLOCKED");
		});

		it("creates learning-format.md with scope definitions", () => {
			// Arrange & Act
			scaffold.scaffoldRules();

			// Assert
			const filePath = join(tempDir, ".chorus", "rules", "learning-format.md");
			const content = readFileSync(filePath, "utf-8");
			expect(content).toContain("## local");
			expect(content).toContain("## cross-cutting");
		});

		it("does not overwrite existing rule files", () => {
			// Arrange - create custom rule file
			const rulesDir = join(tempDir, ".chorus", "rules");
			mkdirSync(rulesDir, { recursive: true });
			const customContent = "# Custom Signal Types\n\nMy custom rules.";
			writeFileSync(join(rulesDir, "signal-types.md"), customContent);

			// Act
			scaffold.scaffoldRules();

			// Assert - custom content preserved
			const content = readFileSync(join(rulesDir, "signal-types.md"), "utf-8");
			expect(content).toBe(customContent);
		});
	});
});
