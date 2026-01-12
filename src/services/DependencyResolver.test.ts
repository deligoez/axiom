import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskProviderTask } from "../types/task-provider.js";
import { DependencyResolver } from "./DependencyResolver.js";

describe("DependencyResolver", () => {
	let resolver: DependencyResolver;
	let mockGetTask: ReturnType<typeof vi.fn>;
	let mockGetReadyTasks: ReturnType<typeof vi.fn>;

	const createTask = (
		id: string,
		status: string,
		dependencies: string[] = [],
	): TaskProviderTask => ({
		id,
		title: `Task ${id}`,
		status,
		priority: 1,
		labels: [],
		dependencies,
	});

	beforeEach(() => {
		mockGetTask = vi.fn();
		mockGetReadyTasks = vi.fn().mockResolvedValue([]);
		const mockTaskProvider = {
			getTask: mockGetTask,
			claimTask: vi.fn().mockResolvedValue(undefined),
			releaseTask: vi.fn().mockResolvedValue(undefined),
			getReadyTasks: mockGetReadyTasks,
			closeTask: vi.fn().mockResolvedValue(undefined),
			getTaskStatus: vi.fn().mockResolvedValue(null),
			updateStatus: vi.fn().mockResolvedValue(undefined),
			getTaskLabels: vi.fn().mockResolvedValue([]),
			addLabel: vi.fn().mockResolvedValue(undefined),
			removeLabel: vi.fn().mockResolvedValue(undefined),
			addNote: vi.fn().mockResolvedValue(undefined),
			updateTask: vi.fn().mockResolvedValue(undefined),
		} as unknown as import("../types/task-provider.js").TaskProvider;
		resolver = new DependencyResolver(mockTaskProvider);
	});

	// check() - 5 tests
	describe("check()", () => {
		it("returns satisfied: true when no dependencies", async () => {
			// Arrange
			const task = createTask("ch-123", "open", []);
			mockGetTask.mockResolvedValue(task);

			// Act
			const result = await resolver.check("ch-123");

			// Assert
			expect(result.satisfied).toBe(true);
			expect(result.pending).toEqual([]);
		});

		it("returns satisfied: true when all deps closed", async () => {
			// Arrange
			const task = createTask("ch-123", "open", ["ch-dep1", "ch-dep2"]);
			const dep1 = createTask("ch-dep1", "closed");
			const dep2 = createTask("ch-dep2", "closed");
			mockGetTask
				.mockResolvedValueOnce(task)
				.mockResolvedValueOnce(dep1)
				.mockResolvedValueOnce(dep2);

			// Act
			const result = await resolver.check("ch-123");

			// Assert
			expect(result.satisfied).toBe(true);
		});

		it("returns pending[] for open deps", async () => {
			// Arrange
			const task = createTask("ch-123", "open", ["ch-dep1", "ch-dep2"]);
			const dep1 = createTask("ch-dep1", "open");
			const dep2 = createTask("ch-dep2", "closed");
			mockGetTask
				.mockResolvedValueOnce(task)
				.mockResolvedValueOnce(dep1)
				.mockResolvedValueOnce(dep2);

			// Act
			const result = await resolver.check("ch-123");

			// Assert
			expect(result.satisfied).toBe(false);
			expect(result.pending).toContain("ch-dep1");
		});

		it("returns inProgress[] for in_progress deps", async () => {
			// Arrange
			const task = createTask("ch-123", "open", ["ch-dep1"]);
			const dep1 = createTask("ch-dep1", "in_progress");
			mockGetTask.mockResolvedValueOnce(task).mockResolvedValueOnce(dep1);

			// Act
			const result = await resolver.check("ch-123");

			// Assert
			expect(result.satisfied).toBe(false);
			expect(result.inProgress).toContain("ch-dep1");
		});

		it("returns failed[] for missing deps", async () => {
			// Arrange
			const task = createTask("ch-123", "open", ["ch-missing"]);
			mockGetTask.mockResolvedValueOnce(task).mockResolvedValueOnce(null);

			// Act
			const result = await resolver.check("ch-123");

			// Assert
			expect(result.satisfied).toBe(false);
			expect(result.failed).toContain("ch-missing");
		});
	});

	// getDependencies() - 2 tests
	describe("getDependencies()", () => {
		it("returns empty array for no deps", async () => {
			// Arrange
			const task = createTask("ch-123", "open", []);
			mockGetTask.mockResolvedValue(task);

			// Act
			const result = await resolver.getDependencies("ch-123");

			// Assert
			expect(result).toEqual([]);
		});

		it("returns list of dependency IDs", async () => {
			// Arrange
			const task = createTask("ch-123", "open", ["ch-dep1", "ch-dep2"]);
			mockGetTask.mockResolvedValue(task);

			// Act
			const result = await resolver.getDependencies("ch-123");

			// Assert
			expect(result).toEqual(["ch-dep1", "ch-dep2"]);
		});
	});

	// isDependencySatisfied() - 2 tests
	describe("isDependencySatisfied()", () => {
		it("returns true if dep is closed", async () => {
			// Arrange
			const dep = createTask("ch-dep1", "closed");
			mockGetTask.mockResolvedValue(dep);

			// Act
			const result = await resolver.isDependencySatisfied("ch-dep1");

			// Assert
			expect(result).toBe(true);
		});

		it("returns false if dep is open/in_progress", async () => {
			// Arrange
			const dep = createTask("ch-dep1", "open");
			mockGetTask.mockResolvedValue(dep);

			// Act
			const result = await resolver.isDependencySatisfied("ch-dep1");

			// Assert
			expect(result).toBe(false);
		});
	});

	// getDependents() - 2 tests
	describe("getDependents()", () => {
		it("returns tasks blocked by this task", async () => {
			// Arrange
			const allTasks: TaskProviderTask[] = [
				createTask("ch-a", "open", ["ch-target"]),
				createTask("ch-b", "open", ["ch-target", "ch-other"]),
				createTask("ch-c", "open", []),
			];
			mockGetReadyTasks.mockResolvedValue(allTasks);

			// Act
			const result = await resolver.getDependents("ch-target");

			// Assert
			expect(result).toContain("ch-a");
			expect(result).toContain("ch-b");
			expect(result).not.toContain("ch-c");
		});

		it("returns empty array if nothing blocked", async () => {
			// Arrange
			const allTasks: TaskProviderTask[] = [
				createTask("ch-a", "open", ["ch-other"]),
				createTask("ch-b", "open", []),
			];
			mockGetReadyTasks.mockResolvedValue(allTasks);

			// Act
			const result = await resolver.getDependents("ch-target");

			// Assert
			expect(result).toEqual([]);
		});
	});

	// hasCircularDependency() - 3 tests
	describe("hasCircularDependency()", () => {
		it("returns false for linear deps", async () => {
			// Arrange - A -> B -> C (linear)
			const taskA = createTask("ch-a", "open", ["ch-b"]);
			const taskB = createTask("ch-b", "open", ["ch-c"]);
			const taskC = createTask("ch-c", "open", []);
			mockGetTask
				.mockResolvedValueOnce(taskA)
				.mockResolvedValueOnce(taskB)
				.mockResolvedValueOnce(taskC);

			// Act
			const result = await resolver.hasCircularDependency("ch-a");

			// Assert
			expect(result).toBe(false);
		});

		it("returns true for circular deps", async () => {
			// Arrange - A -> B -> A (circular)
			const taskA = createTask("ch-a", "open", ["ch-b"]);
			const taskB = createTask("ch-b", "open", ["ch-a"]);
			mockGetTask.mockResolvedValueOnce(taskA).mockResolvedValueOnce(taskB);

			// Act
			const result = await resolver.hasCircularDependency("ch-a");

			// Assert
			expect(result).toBe(true);
		});

		it("returns false for no dependencies", async () => {
			// Arrange
			const task = createTask("ch-a", "open", []);
			mockGetTask.mockResolvedValue(task);

			// Act
			const result = await resolver.hasCircularDependency("ch-a");

			// Assert
			expect(result).toBe(false);
		});
	});
});
