import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BeadsService } from "../services/BeadsService.js";

// Helper to create a valid bead object with all required fields
const createBead = (
	id: string,
	title: string,
	status: string,
	priority: number,
) => ({
	id,
	title,
	status,
	priority,
	type: "task",
	created: new Date().toISOString(),
	updated: new Date().toISOString(),
});

describe("E2E: File Watcher Integration", () => {
	let tempDir: string;
	let beadsDir: string;
	let issuesPath: string;
	let beadsService: BeadsService;

	beforeEach(() => {
		// Create temp directory structure
		tempDir = join(
			tmpdir(),
			`chorus-watcher-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		);
		beadsDir = join(tempDir, ".beads");
		issuesPath = join(beadsDir, "issues.jsonl");
		mkdirSync(beadsDir, { recursive: true });

		beadsService = new BeadsService(tempDir);
	});

	afterEach(async () => {
		await beadsService.stop();
		try {
			rmSync(tempDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("Beads File Change Detection", () => {
		it("detects when beads task file is created", async () => {
			// Arrange
			const changePromise = new Promise<void>((resolve) => {
				beadsService.on("change", () => resolve());
			});
			beadsService.watch();

			// Wait a bit for watcher to be ready
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Act - create issues.jsonl
			const bead = createBead("ch-test1", "Test Task", "open", 1);
			writeFileSync(issuesPath, `${JSON.stringify(bead)}\n`);

			// Assert - wait for change event (with timeout)
			const result = await Promise.race([
				changePromise.then(() => true),
				new Promise((resolve) => setTimeout(() => resolve(false), 2000)),
			]);
			expect(result).toBe(true);
		});

		it("detects when task is appended to file", async () => {
			// Arrange - create initial file
			const initialBead = createBead("ch-test2", "Initial Task", "open", 1);
			writeFileSync(issuesPath, `${JSON.stringify(initialBead)}\n`);

			// Start watching
			const changePromise = new Promise<void>((resolve) => {
				beadsService.on("change", () => resolve());
			});
			beadsService.watch();
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Act - append new task
			const newBead = createBead("ch-test3", "New Task", "open", 2);
			writeFileSync(
				issuesPath,
				`${JSON.stringify(initialBead)}\n${JSON.stringify(newBead)}\n`,
			);

			// Assert
			const result = await Promise.race([
				changePromise.then(() => true),
				new Promise((resolve) => setTimeout(() => resolve(false), 2000)),
			]);
			expect(result).toBe(true);
		});

		it("parses multiple tasks from file", () => {
			// Arrange
			const beads = [
				createBead("ch-multi1", "Task 1", "open", 1),
				createBead("ch-multi2", "Task 2", "in_progress", 0),
				createBead("ch-multi3", "Task 3", "closed", 2),
			];
			const content = beads.map((b) => JSON.stringify(b)).join("\n");
			writeFileSync(issuesPath, content);

			// Act
			const result = beadsService.getBeads();

			// Assert
			expect(result).toHaveLength(3);
			expect(result[0].id).toBe("ch-multi1");
			expect(result[1].status).toBe("in_progress");
			expect(result[2].title).toBe("Task 3");
		});
	});

	describe("Beads Service Operations", () => {
		it("returns empty array when file does not exist", () => {
			// Act
			const beads = beadsService.getBeads();

			// Assert
			expect(beads).toEqual([]);
		});

		it("finds bead by ID", () => {
			// Arrange
			const beads = [
				createBead("ch-find1", "Find Me", "open", 1),
				createBead("ch-find2", "Not Me", "open", 2),
			];
			const content = beads.map((b) => JSON.stringify(b)).join("\n");
			writeFileSync(issuesPath, content);

			// Act
			const found = beadsService.getBead("ch-find1");

			// Assert
			expect(found).toBeDefined();
			expect(found?.title).toBe("Find Me");
		});

		it("sorts beads by priority", () => {
			// Arrange
			const beads = [
				createBead("ch-sort1", "Low Priority", "open", 2),
				createBead("ch-sort2", "High Priority", "open", 0),
				createBead("ch-sort3", "Medium Priority", "open", 1),
			];
			const content = beads.map((b) => JSON.stringify(b)).join("\n");
			writeFileSync(issuesPath, content);

			// Act
			const sorted = beadsService.getBeadsSortedByPriority();

			// Assert
			expect(sorted[0].title).toBe("High Priority");
			expect(sorted[1].title).toBe("Medium Priority");
			expect(sorted[2].title).toBe("Low Priority");
		});

		it("handles invalid JSON gracefully", () => {
			// Arrange
			writeFileSync(issuesPath, "{ invalid json }");

			// Act
			const beads = beadsService.getBeads();

			// Assert - should handle gracefully by returning empty
			expect(beads).toEqual([]);
		});
	});
});
