import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BeadsCLI } from "../services/BeadsCLI.js";
import {
	createGitRepoWithBeads,
	type GitTestRepo,
} from "../test-utils/git-fixtures.js";

describe("E2E: BeadsCLI", () => {
	let repo: GitTestRepo;
	let cli: BeadsCLI;

	beforeEach(() => {
		repo = createGitRepoWithBeads();
		cli = new BeadsCLI(repo.path);
	});

	afterEach(() => {
		repo.cleanup();
	});

	// Availability tests (2 tests)

	describe("isAvailable()", () => {
		it("returns true when bd CLI is installed", () => {
			// Act
			const result = cli.isAvailable();

			// Assert
			expect(result).toBe(true);
		});

		it("isInitialized() returns true for repo with .beads", () => {
			// Act
			const result = cli.isInitialized();

			// Assert
			expect(result).toBe(true);
		});
	});

	// Task creation tests (2 tests)

	describe("createTask()", () => {
		it("creates task and returns ID", async () => {
			// Act
			const taskId = await cli.createTask("Test Task for E2E");

			// Assert - bd generates IDs like "prefix-dirname-number"
			expect(taskId).toBeTruthy();
			expect(typeof taskId).toBe("string");
			expect(taskId.length).toBeGreaterThan(0);
		});

		it("creates task with labels", async () => {
			// Act
			const taskId = await cli.createTask("Labeled Task", {
				labels: ["test-label"],
			});

			// Assert - verify task was created (labels may not persist in no-db mode)
			expect(taskId).toBeTruthy();
		});
	});

	// Task retrieval tests (2 tests)
	// Note: bd show has limited support in no-db JSONL-only mode

	describe("getTask()", () => {
		// SKIPPED: bd show doesn't work in no-db mode - see ch-5imz
		it.skip("returns task object for existing task", async () => {
			// Arrange
			const taskId = await cli.createTask("Get Task Test");

			// Act
			const task = await cli.getTask(taskId);

			// Assert
			expect(task).not.toBeNull();
		});

		it("returns null for non-existent task", async () => {
			// Act
			const task = await cli.getTask("nonexistent-task-id");

			// Assert
			expect(task).toBeNull();
		});
	});

	// Task status updates (2 tests)
	// Note: bd update doesn't resolve task IDs in no-db JSONL-only mode

	describe("claimTask() and releaseTask()", () => {
		// SKIPPED: bd update doesn't resolve task IDs in no-db mode - see ch-5imz
		it.skip("claims task without error", async () => {
			// Arrange
			const taskId = await cli.createTask("Claim Test");

			// Act & Assert - should not throw
			await expect(cli.claimTask(taskId, "test-agent")).resolves.not.toThrow();
		});

		// SKIPPED: bd update doesn't resolve task IDs in no-db mode - see ch-5imz
		it.skip("releases task without error", async () => {
			// Arrange
			const taskId = await cli.createTask("Release Test");
			await cli.claimTask(taskId, "test-agent");

			// Act & Assert
			await expect(cli.releaseTask(taskId)).resolves.not.toThrow();
		});
	});

	// Task close/reopen tests (2 tests)
	// Note: bd close/update have limited support in no-db JSONL-only mode

	describe("closeTask() and reopenTask()", () => {
		// SKIPPED: bd close doesn't resolve task IDs in no-db mode - see ch-5imz
		it.skip("closes task without error", async () => {
			// Arrange
			const taskId = await cli.createTask("Close Test");

			// Act & Assert
			await expect(cli.closeTask(taskId)).resolves.not.toThrow();
		});

		// SKIPPED: bd update doesn't resolve task IDs in no-db mode - see ch-5imz
		it.skip("reopens task without error", async () => {
			// Arrange
			const taskId = await cli.createTask("Reopen Test");

			// Act & Assert
			await expect(cli.reopenTask(taskId)).resolves.not.toThrow();
		});
	});

	// Ready tasks (1 test)

	describe("getReadyTasks()", () => {
		it("returns list of ready tasks", async () => {
			// Arrange
			await cli.createTask("Ready Task 1");
			await cli.createTask("Ready Task 2");

			// Act
			const tasks = await cli.getReadyTasks();

			// Assert
			expect(tasks.length).toBeGreaterThanOrEqual(2);
			expect(tasks.some((t) => t.title === "Ready Task 1")).toBe(true);
			expect(tasks.some((t) => t.title === "Ready Task 2")).toBe(true);
		});
	});

	// In-progress tasks (1 test)
	// Note: claimTask depends on bd update which has issues in no-db mode

	describe("getInProgressTasks()", () => {
		// SKIPPED: claimTask uses bd update which doesn't work in no-db mode - see ch-5imz
		it.skip("returns list of in-progress tasks", async () => {
			// Arrange
			const taskId = await cli.createTask("In Progress Task");
			await cli.claimTask(taskId, "test-agent");

			// Act
			const tasks = await cli.getInProgressTasks();

			// Assert
			expect(tasks.some((t) => t.id === taskId)).toBe(true);
		});
	});
});
