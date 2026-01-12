import * as fs from "node:fs/promises";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TaskCompletionResult } from "../types/review.js";
import { CompletionResultStorage } from "./CompletionResultStorage.js";

describe("CompletionResultStorage", () => {
	let tempDir: string;
	let storage: CompletionResultStorage;

	const createTestResult = (
		taskId: string,
		overrides: Partial<TaskCompletionResult> = {},
	): TaskCompletionResult => ({
		taskId,
		agentId: "agent-1",
		iterations: 1,
		duration: 5000,
		signal: {
			type: "COMPLETE",
			payload: "Task finished",
			raw: "<chorus>COMPLETE:Task finished</chorus>",
		},
		quality: [{ name: "test", passed: true, duration: 1000 }],
		changes: [
			{ path: "src/new.ts", type: "added", linesAdded: 10, linesRemoved: 0 },
		],
		...overrides,
	});

	beforeEach(async () => {
		// Create temp directory
		tempDir = path.join(
			process.cwd(),
			".test-tmp",
			`completions-test-${Date.now()}`,
		);
		await fs.mkdir(tempDir, { recursive: true });
		storage = new CompletionResultStorage(tempDir);
	});

	afterEach(async () => {
		// Cleanup
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	it("saveCompletionResult writes to .chorus/completions/{taskId}.json", async () => {
		// Arrange
		const result = createTestResult("ch-test1");

		// Act
		await storage.saveCompletionResult("ch-test1", result);

		// Assert
		const filePath = path.join(
			tempDir,
			".chorus",
			"completions",
			"ch-test1.json",
		);
		const exists = await fs
			.access(filePath)
			.then(() => true)
			.catch(() => false);
		expect(exists).toBe(true);

		const content = await fs.readFile(filePath, "utf-8");
		const parsed = JSON.parse(content);
		expect(parsed.taskId).toBe("ch-test1");
	});

	it("creates .chorus/completions/ directory if not exists", async () => {
		// Arrange
		const result = createTestResult("ch-test2");

		// Act
		await storage.saveCompletionResult("ch-test2", result);

		// Assert
		const dirPath = path.join(tempDir, ".chorus", "completions");
		const dirExists = await fs
			.access(dirPath)
			.then(() => true)
			.catch(() => false);
		expect(dirExists).toBe(true);
	});

	it("loadCompletionResult returns parsed JSON for existing file", async () => {
		// Arrange
		const result = createTestResult("ch-test3", {
			iterations: 3,
			duration: 15000,
		});
		await storage.saveCompletionResult("ch-test3", result);

		// Act
		const loaded = await storage.loadCompletionResult("ch-test3");

		// Assert
		expect(loaded).not.toBeNull();
		expect(loaded?.taskId).toBe("ch-test3");
		expect(loaded?.iterations).toBe(3);
		expect(loaded?.duration).toBe(15000);
	});

	it("loadCompletionResult returns null for non-existent file", async () => {
		// Arrange - no file created

		// Act
		const loaded = await storage.loadCompletionResult("ch-nonexistent");

		// Assert
		expect(loaded).toBeNull();
	});

	it("handles JSON parse errors gracefully (returns null)", async () => {
		// Arrange - write invalid JSON
		const dirPath = path.join(tempDir, ".chorus", "completions");
		await fs.mkdir(dirPath, { recursive: true });
		const filePath = path.join(dirPath, "ch-invalid.json");
		await fs.writeFile(filePath, "{ invalid json }", "utf-8");

		// Act
		const loaded = await storage.loadCompletionResult("ch-invalid");

		// Assert
		expect(loaded).toBeNull();
	});

	it("preserves all fields when saving and loading", async () => {
		// Arrange
		const result = createTestResult("ch-test4", {
			agentId: "special-agent",
			iterations: 5,
			duration: 300000,
			signal: {
				type: "COMPLETE",
				payload: "All done",
				raw: "<chorus>COMPLETE:All done</chorus>",
			},
			quality: [
				{ name: "test", passed: true, duration: 5000 },
				{ name: "lint", passed: true, duration: 2000 },
				{
					name: "typecheck",
					passed: false,
					duration: 3000,
					error: "Type error",
				},
			],
			changes: [
				{ path: "src/a.ts", type: "added", linesAdded: 100, linesRemoved: 0 },
				{ path: "src/b.ts", type: "modified", linesAdded: 5, linesRemoved: 10 },
				{ path: "src/c.ts", type: "deleted", linesAdded: 0, linesRemoved: 50 },
			],
		});

		// Act
		await storage.saveCompletionResult("ch-test4", result);
		const loaded = await storage.loadCompletionResult("ch-test4");

		// Assert
		expect(loaded).toEqual(result);
	});
});
