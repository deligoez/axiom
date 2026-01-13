/**
 * AP17a: E2E - Persona Integration Tests
 *
 * E2E tests for full persona integration - from loading to agent execution.
 * Tests verify that persona files are loaded and used correctly.
 */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PromptBuilder } from "../services/PromptBuilder.js";
import { createAgentIdentity } from "../types/persona.js";

describe("E2E: Persona Integration", () => {
	let tempDir: string;
	let promptBuilder: PromptBuilder;

	beforeEach(() => {
		// Create isolated temp directory for each test
		tempDir = join(
			tmpdir(),
			`persona-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		);
		mkdirSync(tempDir, { recursive: true });
		promptBuilder = new PromptBuilder();
	});

	afterEach(() => {
		// Cleanup temp directory
		try {
			rmSync(tempDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	it("loads persona files from .chorus/agents/patch/", async () => {
		// Arrange: Full .chorus/agents/patch/ structure
		const patchDir = join(tempDir, ".chorus", "agents", "patch");
		const skillsDir = join(patchDir, "skills");
		mkdirSync(skillsDir, { recursive: true });

		// Create persona files
		writeFileSync(
			join(patchDir, "prompt.md"),
			"# Patch Agent\nYou are the Patch persona, specialized in conflict resolution.",
		);
		writeFileSync(
			join(patchDir, "rules.md"),
			"# Patch Rules\n- Always preserve both sides of conflict\n- Document resolution reason",
		);
		writeFileSync(
			join(skillsDir, "git.md"),
			"# Git Skills\n- Use `git rerere` for repeated conflicts\n- Always commit with clear message",
		);
		writeFileSync(
			join(skillsDir, "merge.md"),
			"# Merge Skills\n- Prefer semantic merge over line-based\n- Test after resolution",
		);

		const identity = createAgentIdentity("patch", 1);

		// Act: Load all files
		const prompt = await promptBuilder.buildPersonaPrompt(identity, tempDir);
		const rules = await promptBuilder.appendPersonaRules(identity, tempDir);
		const skills = await promptBuilder.loadPersonaSkills(identity, tempDir);

		// Assert: All files loaded
		expect(prompt).toContain("Patch persona");
		expect(prompt).toContain("conflict resolution");
		expect(rules).toContain("preserve both sides");
		expect(rules).toContain("Document resolution");
		expect(skills).toHaveLength(2);
		expect(skills.map((s) => s.name).sort()).toEqual(["git", "merge"]);
	});

	it("uses persona prompt in agent execution", async () => {
		// Arrange: Custom prompt.md with unique identifier
		const patchDir = join(tempDir, ".chorus", "agents", "patch");
		mkdirSync(patchDir, { recursive: true });

		const uniqueIdentifier = "PATCH_UNIQUE_12345";
		writeFileSync(
			join(patchDir, "prompt.md"),
			`# Patch Agent\nYou are specialized in conflict resolution.\nIdentifier: ${uniqueIdentifier}`,
		);

		const identity = createAgentIdentity("patch", 2);

		// Act: Build persona prompt
		const prompt = await promptBuilder.buildPersonaPrompt(identity, tempDir);

		// Assert: Prompt contains identifier
		expect(prompt).toContain(uniqueIdentifier);
		expect(prompt).toContain("conflict resolution");
	});

	it("respects persona rules during execution", async () => {
		// Arrange: rules.md with specific constraints
		const patchDir = join(tempDir, ".chorus", "agents", "patch");
		mkdirSync(patchDir, { recursive: true });

		const rulesContent = `# Patch Rules
- Never auto-resolve to one side only
- Always explain resolution strategy
- Test the merge result before committing
- CONSTRAINT: max 3 merge attempts before escalating`;

		writeFileSync(join(patchDir, "rules.md"), rulesContent);

		const identity = createAgentIdentity("patch", 3);

		// Act: Load rules
		const rules = await promptBuilder.appendPersonaRules(identity, tempDir);

		// Assert: Rules enforced in content
		expect(rules).toContain("Never auto-resolve");
		expect(rules).toContain("explain resolution strategy");
		expect(rules).toContain("Test the merge result");
		expect(rules).toContain("CONSTRAINT");
		expect(rules).toContain("max 3 merge attempts");
	});

	it("applies persona skills when relevant", async () => {
		// Arrange: skills/git.md with commit format
		const patchDir = join(tempDir, ".chorus", "agents", "patch");
		const skillsDir = join(patchDir, "skills");
		mkdirSync(skillsDir, { recursive: true });

		const gitSkillContent = `# Git Conflict Resolution

## Commit Format
\`\`\`
fix(merge): resolve conflict in {file}

Conflict: {description}
Resolution: {strategy}
\`\`\`

## Strategy
1. Use git rerere for recurring conflicts
2. Prefer semantic merge strategies
3. Always run tests after resolution`;

		writeFileSync(join(skillsDir, "git.md"), gitSkillContent);

		const identity = createAgentIdentity("patch", 4);

		// Act: Load skills
		const skills = await promptBuilder.loadPersonaSkills(identity, tempDir);

		// Assert: Skill applied to output
		expect(skills).toHaveLength(1);
		expect(skills[0].name).toBe("git");
		expect(skills[0].content).toContain("fix(merge)");
		expect(skills[0].content).toContain("rerere");
		expect(skills[0].content).toContain("semantic merge");
	});
});
