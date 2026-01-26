import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtractedTask, PlanAgent } from "./PlanAgent.js";
import type { Chunk } from "./SpecChunker.js";
import { TaskGenerator } from "./TaskGenerator.js";

describe("TaskGenerator", () => {
	let mockPlanAgent: PlanAgent;
	let generator: TaskGenerator;

	beforeEach(() => {
		vi.clearAllMocks();

		mockPlanAgent = {
			start: vi.fn().mockResolvedValue(undefined),
			stop: vi.fn().mockResolvedValue(undefined),
			send: vi.fn().mockResolvedValue(""),
			extractTasks: vi.fn().mockReturnValue([]),
			getState: vi.fn().mockReturnValue("running"),
			getId: vi.fn().mockReturnValue("test-agent"),
			setMockResponse: vi.fn(),
			setMockError: vi.fn(),
		} as unknown as PlanAgent;

		generator = new TaskGenerator({
			planAgent: mockPlanAgent,
			taskIdPrefix: "ch-",
		});
	});

	describe("generate() - 3 tests", () => {
		it("generate(chunk) returns tasks array", async () => {
			// Arrange
			const chunk: Chunk = {
				startLine: 1,
				endLine: 10,
				content: "## Feature\nBuild login page",
			};
			const extractedTasks: ExtractedTask[] = [
				{ title: "Create login form", description: "Build form component" },
			];
			vi.mocked(mockPlanAgent.extractTasks).mockReturnValue(extractedTasks);

			// Act
			const result = await generator.generate(chunk);

			// Assert
			expect(Array.isArray(result)).toBe(true);
			expect(result.length).toBeGreaterThan(0);
		});

		it("uses PlanAgent to parse chunk content", async () => {
			// Arrange
			const chunk: Chunk = {
				startLine: 1,
				endLine: 10,
				content: "## Feature\nBuild login page",
			};

			// Act
			await generator.generate(chunk);

			// Assert
			expect(mockPlanAgent.send).toHaveBeenCalledWith(
				expect.stringContaining("Build login page"),
			);
			expect(mockPlanAgent.extractTasks).toHaveBeenCalled();
		});

		it("returns empty array for chunk with no tasks", async () => {
			// Arrange
			const chunk: Chunk = {
				startLine: 1,
				endLine: 5,
				content: "# Introduction\nThis is just a readme.",
			};
			vi.mocked(mockPlanAgent.extractTasks).mockReturnValue([]);

			// Act
			const result = await generator.generate(chunk);

			// Assert
			expect(result).toEqual([]);
		});
	});

	describe("Task conversion - 4 tests", () => {
		it("extracts user stories/requirements from chunk", async () => {
			// Arrange
			const chunk: Chunk = {
				startLine: 1,
				endLine: 20,
				content: `
## User Stories
- As a user, I want to login
- As a user, I want to logout
`,
			};
			const extractedTasks: ExtractedTask[] = [
				{ title: "Implement login", description: "Allow user to login" },
				{ title: "Implement logout", description: "Allow user to logout" },
			];
			vi.mocked(mockPlanAgent.extractTasks).mockReturnValue(extractedTasks);

			// Act
			const result = await generator.generate(chunk);

			// Assert
			expect(result.length).toBe(2);
			expect(result[0].title).toBe("Implement login");
			expect(result[1].title).toBe("Implement logout");
		});

		it("converts extracted items to task format", async () => {
			// Arrange
			const chunk: Chunk = {
				startLine: 1,
				endLine: 10,
				content: "## Feature\nBuild login",
			};
			const extractedTasks: ExtractedTask[] = [
				{
					title: "Create form",
					description: "Build form",
					acceptanceCriteria: ["Form renders", "Validates"],
				},
			];
			vi.mocked(mockPlanAgent.extractTasks).mockReturnValue(extractedTasks);

			// Act
			const result = await generator.generate(chunk);

			// Assert
			expect(result[0]).toHaveProperty("id");
			expect(result[0]).toHaveProperty("title");
			expect(result[0]).toHaveProperty("description");
			expect(result[0]).toHaveProperty("priority");
		});

		it("assigns sequential IDs with configured prefix", async () => {
			// Arrange
			const chunk: Chunk = {
				startLine: 1,
				endLine: 10,
				content: "## Tasks",
			};
			const extractedTasks: ExtractedTask[] = [
				{ title: "Task 1" },
				{ title: "Task 2" },
				{ title: "Task 3" },
			];
			vi.mocked(mockPlanAgent.extractTasks).mockReturnValue(extractedTasks);

			// Act
			const result = await generator.generate(chunk);

			// Assert
			expect(result[0].id).toMatch(/^ch-/);
			expect(result[1].id).toMatch(/^ch-/);
			expect(result[2].id).toMatch(/^ch-/);
		});

		it("sets priority based on order in spec", async () => {
			// Arrange
			const chunk: Chunk = {
				startLine: 1,
				endLine: 10,
				content: "## Tasks",
			};
			const extractedTasks: ExtractedTask[] = [
				{ title: "First task" },
				{ title: "Second task" },
				{ title: "Third task" },
			];
			vi.mocked(mockPlanAgent.extractTasks).mockReturnValue(extractedTasks);

			// Act
			const result = await generator.generate(chunk);

			// Assert
			// Earlier tasks should have higher priority (lower number)
			expect(result[0].priority).toBeLessThanOrEqual(result[1].priority);
			expect(result[1].priority).toBeLessThanOrEqual(result[2].priority);
		});
	});

	describe("Dependencies & Progress - 3 tests", () => {
		it("infers dependencies from context mentions", async () => {
			// Arrange
			const chunk: Chunk = {
				startLine: 1,
				endLine: 20,
				content: `
## Tasks
- Task A: Setup database
- Task B: Create API (depends on database)
`,
			};
			const extractedTasks: ExtractedTask[] = [
				{ title: "Setup database", description: "Configure DB" },
				{
					title: "Create API",
					description: "Create API, depends on Setup database",
				},
			];
			vi.mocked(mockPlanAgent.extractTasks).mockReturnValue(extractedTasks);

			// Act
			const result = await generator.generate(chunk);

			// Assert
			// Second task should have dependency on first
			expect(result[1].dependsOn).toBeDefined();
			expect(result[1].dependsOn).toContain(result[0].id);
		});

		it("reports progress per chunk processed", async () => {
			// Arrange
			const chunk: Chunk = {
				startLine: 1,
				endLine: 10,
				content: "## Task",
			};
			const onProgress = vi.fn();
			const progressGenerator = new TaskGenerator({
				planAgent: mockPlanAgent,
				taskIdPrefix: "ch-",
				onProgress,
			});
			vi.mocked(mockPlanAgent.extractTasks).mockReturnValue([
				{ title: "Task" },
			]);

			// Act
			await progressGenerator.generate(chunk);

			// Assert
			expect(onProgress).toHaveBeenCalledWith(
				expect.objectContaining({
					chunk: expect.any(Object),
					tasksGenerated: expect.any(Number),
				}),
			);
		});

		it("tracks total tasks generated across multiple chunks", async () => {
			// Arrange
			const chunk1: Chunk = { startLine: 1, endLine: 10, content: "Chunk 1" };
			const chunk2: Chunk = { startLine: 11, endLine: 20, content: "Chunk 2" };
			vi.mocked(mockPlanAgent.extractTasks)
				.mockReturnValueOnce([{ title: "Task 1" }])
				.mockReturnValueOnce([{ title: "Task 2" }, { title: "Task 3" }]);

			// Act
			await generator.generate(chunk1);
			await generator.generate(chunk2);

			// Assert
			expect(generator.getTotalTasksGenerated()).toBe(3);
		});
	});
});
