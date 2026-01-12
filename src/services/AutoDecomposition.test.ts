import { beforeEach, describe, expect, it, vi } from "vitest";
import { AutoDecomposition } from "./AutoDecomposition.js";
import type { Chunk, SpecChunker } from "./SpecChunker.js";
import type { GeneratedTask, TaskGenerator } from "./TaskGenerator.js";
import type { BatchValidationResult, TaskValidator } from "./TaskValidator.js";

describe("AutoDecomposition", () => {
	let mockSpecChunker: SpecChunker;
	let mockTaskGenerator: TaskGenerator;
	let mockTaskValidator: TaskValidator;
	let mockReadFile: (path: string) => string;
	let decomposition: AutoDecomposition;

	beforeEach(() => {
		vi.clearAllMocks();

		mockSpecChunker = {
			chunk: vi.fn().mockReturnValue([
				{ startLine: 1, endLine: 50, content: "## Feature 1\nContent" },
				{ startLine: 51, endLine: 100, content: "## Feature 2\nMore content" },
			] as Chunk[]),
			getProgress: vi.fn().mockReturnValue(50),
		} as unknown as SpecChunker;

		mockTaskGenerator = {
			generate: vi
				.fn()
				.mockResolvedValue([
					{ id: "ch-001", title: "Task 1", description: "Desc 1", priority: 1 },
				] as GeneratedTask[]),
			getTotalTasksGenerated: vi.fn().mockReturnValue(2),
			getAllTasks: vi.fn().mockReturnValue([]),
		} as unknown as TaskGenerator;

		mockTaskValidator = {
			validateAll: vi.fn().mockReturnValue({
				tasks: [],
				valid: true,
				errors: [],
				warnings: [],
				suggestions: [],
				getFixableTasks: vi.fn().mockReturnValue([]),
				applyAllFixes: vi.fn().mockReturnValue([]),
				getCounts: vi
					.fn()
					.mockReturnValue({ errors: 0, warnings: 0, suggestions: 0 }),
			} as BatchValidationResult),
		} as unknown as TaskValidator;

		mockReadFile = vi
			.fn()
			.mockReturnValue("# Spec Content\n\n## Feature 1\n...");

		decomposition = new AutoDecomposition({
			specChunker: mockSpecChunker,
			taskGenerator: mockTaskGenerator,
			taskValidator: mockTaskValidator,
			readFile: mockReadFile,
		});
	});

	describe("decompose() - Core functionality", () => {
		it("decompose(specPath) reads spec file from path", async () => {
			// Arrange
			const specPath = "/path/to/spec.md";

			// Act
			await decomposition.decompose(specPath);

			// Assert
			expect(mockReadFile).toHaveBeenCalledWith(specPath);
		});

		it("decompose(specPath) returns DecompositionResult", async () => {
			// Arrange
			const specPath = "/path/to/spec.md";

			// Act
			const result = await decomposition.decompose(specPath);

			// Assert
			expect(result).toHaveProperty("tasks");
			expect(result).toHaveProperty("validation");
			expect(result).toHaveProperty("stats");
		});

		it("chunks content using SpecChunker", async () => {
			// Arrange
			const specPath = "/path/to/spec.md";
			const content = "# Spec Content";
			vi.mocked(mockReadFile).mockReturnValue(content);

			// Act
			await decomposition.decompose(specPath);

			// Assert
			expect(mockSpecChunker.chunk).toHaveBeenCalledWith(content);
		});
	});

	describe("Task generation", () => {
		it("generates tasks for each chunk via TaskGenerator", async () => {
			// Arrange
			const chunks: Chunk[] = [
				{ startLine: 1, endLine: 50, content: "Chunk 1" },
				{ startLine: 51, endLine: 100, content: "Chunk 2" },
			];
			vi.mocked(mockSpecChunker.chunk).mockReturnValue(chunks);

			// Act
			await decomposition.decompose("/path/to/spec.md");

			// Assert
			expect(mockTaskGenerator.generate).toHaveBeenCalledTimes(2);
			expect(mockTaskGenerator.generate).toHaveBeenNthCalledWith(1, chunks[0]);
			expect(mockTaskGenerator.generate).toHaveBeenNthCalledWith(2, chunks[1]);
		});

		it("merges all chunk results into single array", async () => {
			// Arrange
			vi.mocked(mockSpecChunker.chunk).mockReturnValue([
				{ startLine: 1, endLine: 50, content: "Chunk 1" },
				{ startLine: 51, endLine: 100, content: "Chunk 2" },
			]);
			vi.mocked(mockTaskGenerator.generate)
				.mockResolvedValueOnce([
					{ id: "ch-001", title: "Task 1", priority: 1 },
				] as GeneratedTask[])
				.mockResolvedValueOnce([
					{ id: "ch-002", title: "Task 2", priority: 1 },
				] as GeneratedTask[]);

			// Act
			const result = await decomposition.decompose("/path/to/spec.md");

			// Assert
			expect(result.tasks.length).toBe(2);
		});

		it("deduplicates similar tasks (same title)", async () => {
			// Arrange
			vi.mocked(mockSpecChunker.chunk).mockReturnValue([
				{ startLine: 1, endLine: 50, content: "Chunk 1" },
				{ startLine: 51, endLine: 100, content: "Chunk 2" },
			]);
			vi.mocked(mockTaskGenerator.generate)
				.mockResolvedValueOnce([
					{
						id: "ch-001",
						title: "Same Title",
						description: "Desc 1",
						priority: 1,
					},
				] as GeneratedTask[])
				.mockResolvedValueOnce([
					{
						id: "ch-002",
						title: "Same Title",
						description: "Desc 1",
						priority: 1,
					},
				] as GeneratedTask[]);

			// Act
			const result = await decomposition.decompose("/path/to/spec.md");

			// Assert
			expect(result.tasks.length).toBe(1);
		});
	});

	describe("Validation", () => {
		it("validates generated tasks via TaskValidator", async () => {
			// Arrange
			vi.mocked(mockSpecChunker.chunk).mockReturnValue([
				{ startLine: 1, endLine: 50, content: "Chunk 1" },
			]);
			vi.mocked(mockTaskGenerator.generate).mockResolvedValue([
				{ id: "ch-001", title: "Task", priority: 1 },
			] as GeneratedTask[]);

			// Act
			await decomposition.decompose("/path/to/spec.md");

			// Assert
			expect(mockTaskValidator.validateAll).toHaveBeenCalled();
		});
	});

	describe("Progress reporting", () => {
		it("reports progress (chunk X of Y)", async () => {
			// Arrange
			const progressCallback = vi.fn();
			vi.mocked(mockSpecChunker.chunk).mockReturnValue([
				{ startLine: 1, endLine: 50, content: "Chunk 1" },
				{ startLine: 51, endLine: 100, content: "Chunk 2" },
			]);

			// Act
			await decomposition.decompose("/path/to/spec.md", {
				onProgress: progressCallback,
			});

			// Assert
			expect(progressCallback).toHaveBeenCalledTimes(2);
			expect(progressCallback).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({ currentChunk: 1, totalChunks: 2 }),
			);
			expect(progressCallback).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({ currentChunk: 2, totalChunks: 2 }),
			);
		});
	});

	describe("Cancellation", () => {
		it("supports pause/continue via cancel token", async () => {
			// Arrange
			const cancelToken = { cancelled: false };
			vi.mocked(mockSpecChunker.chunk).mockReturnValue([
				{ startLine: 1, endLine: 50, content: "Chunk 1" },
				{ startLine: 51, endLine: 100, content: "Chunk 2" },
				{ startLine: 101, endLine: 150, content: "Chunk 3" },
			]);

			// Cancel after first chunk
			vi.mocked(mockTaskGenerator.generate).mockImplementation(async () => {
				cancelToken.cancelled = true;
				return [
					{ id: "ch-001", title: "Task", priority: 1 },
				] as GeneratedTask[];
			});

			// Act
			const result = await decomposition.decompose("/path/to/spec.md", {
				cancelToken,
			});

			// Assert
			expect(mockTaskGenerator.generate).toHaveBeenCalledTimes(1);
			expect(result.stats.cancelled).toBe(true);
		});
	});

	describe("Statistics", () => {
		it("returns stats with task counts and chunk info", async () => {
			// Arrange
			vi.mocked(mockSpecChunker.chunk).mockReturnValue([
				{ startLine: 1, endLine: 50, content: "Chunk 1" },
				{ startLine: 51, endLine: 100, content: "Chunk 2" },
			]);
			vi.mocked(mockTaskGenerator.generate)
				.mockResolvedValueOnce([
					{ id: "ch-001", title: "Task 1", priority: 1 },
				] as GeneratedTask[])
				.mockResolvedValueOnce([
					{ id: "ch-002", title: "Task 2", priority: 1 },
				] as GeneratedTask[]);

			// Act
			const result = await decomposition.decompose("/path/to/spec.md");

			// Assert
			expect(result.stats).toEqual(
				expect.objectContaining({
					totalChunks: 2,
					processedChunks: 2,
					totalTasks: 2,
					cancelled: false,
				}),
			);
		});
	});
});
