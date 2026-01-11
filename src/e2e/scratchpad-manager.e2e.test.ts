import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ScratchpadManager } from "../services/ScratchpadManager.js";

describe("E2E: ScratchpadManager Integration", () => {
	let tempDir: string;
	let agentDir: string;
	let scratchpadManager: ScratchpadManager;

	beforeEach(() => {
		// Create temp directory structure
		tempDir = join(
			tmpdir(),
			`chorus-scratchpad-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		);
		agentDir = join(tempDir, ".agent");
		mkdirSync(agentDir, { recursive: true });

		scratchpadManager = new ScratchpadManager(tempDir);
	});

	afterEach(() => {
		try {
			rmSync(tempDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	it("reads scratchpad content when file exists", async () => {
		// Arrange
		const content = "# Scratchpad\n\nTest content";
		writeFileSync(join(agentDir, "scratchpad.md"), content);

		// Act
		const scratchpad = await scratchpadManager.read();

		// Assert
		expect(scratchpad).not.toBeNull();
		expect(scratchpad?.content).toBe(content);
	});

	it("returns null when scratchpad doesn't exist", async () => {
		// Arrange - no scratchpad file

		// Act
		const scratchpad = await scratchpadManager.read();

		// Assert
		expect(scratchpad).toBeNull();
	});

	it("clears scratchpad file", async () => {
		// Arrange
		writeFileSync(join(agentDir, "scratchpad.md"), "content to delete");
		expect(await scratchpadManager.exists()).toBe(true);

		// Act
		await scratchpadManager.clear();

		// Assert
		expect(await scratchpadManager.exists()).toBe(false);
	});

	it("handles clear when file doesn't exist", async () => {
		// Arrange - no file

		// Act & Assert - should not throw
		await expect(scratchpadManager.clear()).resolves.not.toThrow();
	});

	it("extracts learnings section from content", () => {
		// Arrange
		const content = `# Scratchpad

## Notes
Some notes here

## Learnings
- Important learning 1
- Important learning 2

## Other Section
Other content`;

		// Act
		const learnings = scratchpadManager.extractLearningsSection(content);

		// Assert
		expect(learnings).toBe("- Important learning 1\n- Important learning 2");
	});

	it("returns null when no learnings section exists", () => {
		// Arrange
		const content = `# Scratchpad

## Notes
Some notes here

## Other Section
Other content`;

		// Act
		const learnings = scratchpadManager.extractLearningsSection(content);

		// Assert
		expect(learnings).toBeNull();
	});
});
