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
import { PatternsManager } from "../services/PatternsManager.js";

describe("E2E: PatternsManager Integration", () => {
	let tempDir: string;
	let chorusDir: string;
	let patternsManager: PatternsManager;

	beforeEach(() => {
		// Create temp directory structure
		tempDir = join(
			tmpdir(),
			`chorus-patterns-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		);
		chorusDir = join(tempDir, ".chorus");
		mkdirSync(chorusDir, { recursive: true });

		patternsManager = new PatternsManager(tempDir);
	});

	afterEach(() => {
		try {
			rmSync(tempDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	it("returns empty patterns when file doesn't exist", () => {
		// Arrange - no PATTERNS.md file

		// Act
		const patterns = patternsManager.read();

		// Assert
		expect(patterns).toEqual({});
	});

	it("creates PATTERNS.md when writing patterns", () => {
		// Arrange
		const patternsPath = join(chorusDir, "PATTERNS.md");
		expect(existsSync(patternsPath)).toBe(false);

		// Act
		patternsManager.write({ Testing: ["Use AAA pattern"] });

		// Assert
		expect(existsSync(patternsPath)).toBe(true);
	});

	it("writes patterns in markdown format", () => {
		// Arrange & Act
		patternsManager.write({
			Testing: ["Use AAA pattern", "One assertion per test"],
			Naming: ["Use camelCase for functions"],
		});

		// Assert
		const patternsPath = join(chorusDir, "PATTERNS.md");
		const content = readFileSync(patternsPath, "utf-8");

		expect(content).toContain("# Patterns");
		expect(content).toContain("## Testing");
		expect(content).toContain("- Use AAA pattern");
		expect(content).toContain("- One assertion per test");
		expect(content).toContain("## Naming");
		expect(content).toContain("- Use camelCase for functions");
	});

	it("reads patterns from existing file", () => {
		// Arrange
		const patternsPath = join(chorusDir, "PATTERNS.md");
		const content = `# Patterns

## Architecture
- Use dependency injection
- Follow SOLID principles

## Testing
- Write tests first
`;
		writeFileSync(patternsPath, content);

		// Act
		const patterns = patternsManager.read();

		// Assert
		expect(patterns.Architecture).toEqual([
			"Use dependency injection",
			"Follow SOLID principles",
		]);
		expect(patterns.Testing).toEqual(["Write tests first"]);
	});

	it("adds pattern to new category", () => {
		// Arrange - empty patterns

		// Act
		patternsManager.addPattern("Security", "Validate all inputs");

		// Assert
		const patterns = patternsManager.read();
		expect(patterns.Security).toEqual(["Validate all inputs"]);
	});

	it("adds pattern to existing category", () => {
		// Arrange
		patternsManager.write({ Performance: ["Use caching"] });

		// Act
		patternsManager.addPattern("Performance", "Minimize database calls");

		// Assert
		const patterns = patternsManager.read();
		expect(patterns.Performance).toEqual([
			"Use caching",
			"Minimize database calls",
		]);
	});

	it("gets patterns by category", () => {
		// Arrange
		patternsManager.write({
			ErrorHandling: ["Use try-catch", "Log errors"],
			Logging: ["Use structured logs"],
		});

		// Act
		const errorPatterns =
			patternsManager.getPatternsByCategory("ErrorHandling");
		const loggingPatterns = patternsManager.getPatternsByCategory("Logging");
		const emptyPatterns = patternsManager.getPatternsByCategory("NonExistent");

		// Assert
		expect(errorPatterns).toEqual(["Use try-catch", "Log errors"]);
		expect(loggingPatterns).toEqual(["Use structured logs"]);
		expect(emptyPatterns).toEqual([]);
	});

	it("creates .chorus directory if missing", () => {
		// Arrange - create new manager with non-existent directory
		const newTempDir = join(
			tmpdir(),
			`chorus-patterns-new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		);
		const newManager = new PatternsManager(newTempDir);

		try {
			// Act
			newManager.write({ API: ["Use REST conventions"] });

			// Assert
			const patternsPath = join(newTempDir, ".chorus", "PATTERNS.md");
			expect(existsSync(patternsPath)).toBe(true);
		} finally {
			rmSync(newTempDir, { recursive: true, force: true });
		}
	});
});
