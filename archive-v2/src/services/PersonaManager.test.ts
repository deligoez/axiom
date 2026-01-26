import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PersonaManager } from "./PersonaManager.js";

describe("PersonaManager", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "persona-manager-test-"));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	describe("loadPrompt()", () => {
		it("reads .chorus/agents/{persona}/prompt.md", () => {
			// Arrange
			const promptPath = join(
				tempDir,
				".chorus",
				"agents",
				"sage",
				"prompt.md",
			);
			mkdirSync(join(tempDir, ".chorus", "agents", "sage"), {
				recursive: true,
			});
			writeFileSync(promptPath, "# Sage Prompt\nYou are Sage.");
			const manager = new PersonaManager(tempDir);

			// Act
			const content = manager.loadPrompt("sage");

			// Assert
			expect(content).toBe("# Sage Prompt\nYou are Sage.");
		});

		it("returns null if file missing", () => {
			// Arrange
			const manager = new PersonaManager(tempDir);

			// Act
			const content = manager.loadPrompt("sage");

			// Assert
			expect(content).toBeNull();
		});
	});

	describe("loadRules()", () => {
		it("reads .chorus/agents/{persona}/rules.md", () => {
			// Arrange
			const rulesPath = join(tempDir, ".chorus", "agents", "chip", "rules.md");
			mkdirSync(join(tempDir, ".chorus", "agents", "chip"), {
				recursive: true,
			});
			writeFileSync(rulesPath, "# Chip Rules\n1. Write tests first");
			const manager = new PersonaManager(tempDir);

			// Act
			const content = manager.loadRules("chip");

			// Assert
			expect(content).toBe("# Chip Rules\n1. Write tests first");
		});

		it("returns null if file missing", () => {
			// Arrange
			const manager = new PersonaManager(tempDir);

			// Act
			const content = manager.loadRules("chip");

			// Assert
			expect(content).toBeNull();
		});
	});

	describe("loadSkills()", () => {
		it("reads all .md files from .chorus/agents/{persona}/skills/", () => {
			// Arrange
			const skillsDir = join(tempDir, ".chorus", "agents", "patch", "skills");
			mkdirSync(skillsDir, { recursive: true });
			writeFileSync(
				join(skillsDir, "debugging.md"),
				"# Debugging\nHow to debug.",
			);
			writeFileSync(join(skillsDir, "testing.md"), "# Testing\nHow to test.");
			writeFileSync(join(skillsDir, "readme.txt"), "Not a skill"); // Should be ignored
			const manager = new PersonaManager(tempDir);

			// Act
			const skills = manager.loadSkills("patch");

			// Assert
			expect(skills).toHaveLength(2);
			expect(skills).toContainEqual({
				name: "debugging",
				content: "# Debugging\nHow to debug.",
			});
			expect(skills).toContainEqual({
				name: "testing",
				content: "# Testing\nHow to test.",
			});
		});

		it("returns empty array if directory missing", () => {
			// Arrange
			const manager = new PersonaManager(tempDir);

			// Act
			const skills = manager.loadSkills("patch");

			// Assert
			expect(skills).toEqual([]);
		});
	});

	describe("caching", () => {
		it("loadPrompt called twice with same persona reads file only once", () => {
			// Arrange
			const promptPath = join(
				tempDir,
				".chorus",
				"agents",
				"sage",
				"prompt.md",
			);
			mkdirSync(join(tempDir, ".chorus", "agents", "sage"), {
				recursive: true,
			});
			writeFileSync(promptPath, "# Sage Prompt");
			const manager = new PersonaManager(tempDir);

			// Act
			const content1 = manager.loadPrompt("sage");
			// Modify file after first read
			writeFileSync(promptPath, "# Modified Prompt");
			const content2 = manager.loadPrompt("sage");

			// Assert - should return cached value, not modified
			expect(content1).toBe("# Sage Prompt");
			expect(content2).toBe("# Sage Prompt");
		});

		it("clearCache forces re-read on next load", () => {
			// Arrange
			const promptPath = join(
				tempDir,
				".chorus",
				"agents",
				"sage",
				"prompt.md",
			);
			mkdirSync(join(tempDir, ".chorus", "agents", "sage"), {
				recursive: true,
			});
			writeFileSync(promptPath, "# Sage Prompt");
			const manager = new PersonaManager(tempDir);

			// Act
			const content1 = manager.loadPrompt("sage");
			// Modify file and clear cache
			writeFileSync(promptPath, "# Modified Prompt");
			manager.clearCache();
			const content2 = manager.loadPrompt("sage");

			// Assert - should return new value after cache clear
			expect(content1).toBe("# Sage Prompt");
			expect(content2).toBe("# Modified Prompt");
		});
	});
});
