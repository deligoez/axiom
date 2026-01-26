import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PERSONAS, type PersonaName } from "../types/persona.js";
import { PersonaScaffold } from "./PersonaScaffold.js";

describe("PersonaScaffold", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "persona-scaffold-test-"));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	describe("scaffold()", () => {
		it("creates .chorus/agents/ directory structure", () => {
			// Arrange
			const scaffold = new PersonaScaffold(tempDir);

			// Act
			scaffold.scaffold();

			// Assert
			expect(existsSync(join(tempDir, ".chorus", "agents"))).toBe(true);
		});

		it("creates directory for each persona", () => {
			// Arrange
			const scaffold = new PersonaScaffold(tempDir);
			const personaNames: PersonaName[] = Object.keys(
				PERSONAS,
			) as PersonaName[];

			// Act
			scaffold.scaffold();

			// Assert
			for (const name of personaNames) {
				const personaDir = join(tempDir, ".chorus", "agents", name);
				expect(existsSync(personaDir)).toBe(true);
			}
		});

		it("creates prompt.md for AI-powered personas", () => {
			// Arrange
			const scaffold = new PersonaScaffold(tempDir);
			const aiPersonas = Object.entries(PERSONAS)
				.filter(([_, p]) => p.powerSource === "claude")
				.map(([name]) => name);

			// Act
			scaffold.scaffold();

			// Assert
			for (const name of aiPersonas) {
				const promptPath = join(
					tempDir,
					".chorus",
					"agents",
					name,
					"prompt.md",
				);
				expect(existsSync(promptPath)).toBe(true);
			}
		});

		it("creates rules.md for each persona", () => {
			// Arrange
			const scaffold = new PersonaScaffold(tempDir);
			const personaNames = Object.keys(PERSONAS);

			// Act
			scaffold.scaffold();

			// Assert
			for (const name of personaNames) {
				const rulesPath = join(tempDir, ".chorus", "agents", name, "rules.md");
				expect(existsSync(rulesPath)).toBe(true);
			}
		});

		it("creates skills/ directory for each persona", () => {
			// Arrange
			const scaffold = new PersonaScaffold(tempDir);
			const personaNames = Object.keys(PERSONAS);

			// Act
			scaffold.scaffold();

			// Assert
			for (const name of personaNames) {
				const skillsDir = join(tempDir, ".chorus", "agents", name, "skills");
				expect(existsSync(skillsDir)).toBe(true);
			}
		});

		it("creates config.json for heuristic personas", () => {
			// Arrange
			const scaffold = new PersonaScaffold(tempDir);
			const heuristicPersonas = Object.entries(PERSONAS)
				.filter(([_, p]) => p.powerSource === "heuristic")
				.map(([name]) => name);

			// Act
			scaffold.scaffold();

			// Assert - currently no heuristic personas, so this just verifies the logic
			for (const name of heuristicPersonas) {
				const configPath = join(
					tempDir,
					".chorus",
					"agents",
					name,
					"config.json",
				);
				expect(existsSync(configPath)).toBe(true);
			}
			// Test passes even with empty array (vacuously true)
			expect(heuristicPersonas).toHaveLength(0);
		});

		it("default prompts contain persona description", () => {
			// Arrange
			const scaffold = new PersonaScaffold(tempDir);
			const aiPersonas = Object.entries(PERSONAS)
				.filter(([_, p]) => p.powerSource === "claude")
				.map(([name, persona]) => ({ name, persona }));

			// Act
			scaffold.scaffold();

			// Assert
			for (const { name, persona } of aiPersonas) {
				const promptPath = join(
					tempDir,
					".chorus",
					"agents",
					name,
					"prompt.md",
				);
				const content = readFileSync(promptPath, "utf-8");
				expect(content).toContain(persona.displayName);
				expect(content).toContain(persona.description);
			}
		});

		it("does not overwrite existing files", () => {
			// Arrange
			const scaffold = new PersonaScaffold(tempDir);
			scaffold.scaffold();

			// Modify a file
			const sagePromptPath = join(
				tempDir,
				".chorus",
				"agents",
				"sage",
				"prompt.md",
			);
			const originalContent = readFileSync(sagePromptPath, "utf-8");
			const modifiedContent = "# Custom Sage Prompt\nUser customization.";
			require("node:fs").writeFileSync(sagePromptPath, modifiedContent);

			// Act - scaffold again
			scaffold.scaffold();

			// Assert - file should not be overwritten
			const finalContent = readFileSync(sagePromptPath, "utf-8");
			expect(finalContent).toBe(modifiedContent);
			expect(finalContent).not.toBe(originalContent);
		});
	});
});
