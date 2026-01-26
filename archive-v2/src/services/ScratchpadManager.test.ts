import type { Stats } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScratchpadManager } from "./ScratchpadManager.js";

// Mock fs/promises
vi.mock("node:fs/promises", () => ({
	readFile: vi.fn(),
	stat: vi.fn(),
	unlink: vi.fn(),
	access: vi.fn(),
}));

const mockReadFile = vi.mocked(fs.readFile);
const mockStat = vi.mocked(fs.stat);
const mockUnlink = vi.mocked(fs.unlink);
const mockAccess = vi.mocked(fs.access);

describe("ScratchpadManager", () => {
	let manager: ScratchpadManager;
	const worktreePath = "/test/worktree";

	beforeEach(() => {
		vi.clearAllMocks();
		manager = new ScratchpadManager(worktreePath);
	});

	// F39b: scratchpadPath test (1)
	it("scratchpadPath returns correct path (.agent/scratchpad.md)", () => {
		// Arrange - manager already created

		// Act
		const result = manager.scratchpadPath;

		// Assert
		expect(result).toBe(path.join(worktreePath, ".agent", "scratchpad.md"));
	});

	// F39b: read() tests (3)
	it("read() returns Scratchpad when file exists", async () => {
		// Arrange
		const content = "# Scratchpad\n\nSome content";
		const modifiedTime = new Date("2026-01-11T12:00:00Z");
		mockReadFile.mockResolvedValue(content);
		mockStat.mockResolvedValue({ mtime: modifiedTime } as Stats);

		// Act
		const result = await manager.read();

		// Assert
		expect(result).not.toBeNull();
		expect(result?.content).toBe(content);
		expect(result?.path).toBe(manager.scratchpadPath);
	});

	it("read() includes modifiedAt from file stats", async () => {
		// Arrange
		const modifiedTime = new Date("2026-01-11T12:00:00Z");
		mockReadFile.mockResolvedValue("content");
		mockStat.mockResolvedValue({ mtime: modifiedTime } as Stats);

		// Act
		const result = await manager.read();

		// Assert
		expect(result?.modifiedAt).toEqual(modifiedTime);
	});

	it("read() returns null when file missing", async () => {
		// Arrange
		mockReadFile.mockRejectedValue({ code: "ENOENT" });

		// Act
		const result = await manager.read();

		// Assert
		expect(result).toBeNull();
	});

	// F39b: extractLearningsSection() tests (4)
	it("extractLearningsSection() extracts until next heading", () => {
		// Arrange
		const content = `# Task Scratchpad

## Notes
Some notes

## Learnings
- [LOCAL] Learning 1
- [CROSS-CUTTING] Learning 2

## Blockers
Something blocking`;

		// Act
		const result = manager.extractLearningsSection(content);

		// Assert
		expect(result).toBe("- [LOCAL] Learning 1\n- [CROSS-CUTTING] Learning 2");
	});

	it("extractLearningsSection() extracts until EOF", () => {
		// Arrange
		const content = `# Task Scratchpad

## Notes
Some notes

## Learnings
- [LOCAL] Learning 1
- [ARCHITECTURAL] Learning 2`;

		// Act
		const result = manager.extractLearningsSection(content);

		// Assert
		expect(result).toBe("- [LOCAL] Learning 1\n- [ARCHITECTURAL] Learning 2");
	});

	it("extractLearningsSection() returns null without heading", () => {
		// Arrange
		const content = `# Task Scratchpad

## Notes
Some notes without learnings section`;

		// Act
		const result = manager.extractLearningsSection(content);

		// Assert
		expect(result).toBeNull();
	});

	it("extractLearningsSection() is case-insensitive", () => {
		// Arrange
		const content = `# Task

## LEARNINGS
- Some learning`;

		// Act
		const result = manager.extractLearningsSection(content);

		// Assert
		expect(result).toBe("- Some learning");
	});

	// F39b: clear() tests (2)
	it("clear() removes scratchpad file", async () => {
		// Arrange
		mockUnlink.mockResolvedValue();

		// Act
		await manager.clear();

		// Assert
		expect(mockUnlink).toHaveBeenCalledWith(manager.scratchpadPath);
	});

	it("clear() succeeds when file missing", async () => {
		// Arrange
		mockUnlink.mockRejectedValue({ code: "ENOENT" });

		// Act & Assert
		await expect(manager.clear()).resolves.not.toThrow();
	});

	// F39b: exists() test (1)
	it("exists() returns correct boolean", async () => {
		// Arrange
		mockAccess
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error());

		// Act
		const exists1 = await manager.exists();
		const exists2 = await manager.exists();

		// Assert
		expect(exists1).toBe(true);
		expect(exists2).toBe(false);
	});
});
