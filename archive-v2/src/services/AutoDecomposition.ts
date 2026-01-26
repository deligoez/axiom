import type { SpecChunker } from "./SpecChunker.js";
import type { GeneratedTask, TaskGenerator } from "./TaskGenerator.js";
import type {
	BatchValidationResult,
	TaskValidator,
	ValidatorTask,
} from "./TaskValidator.js";

export interface DecompositionProgress {
	currentChunk: number;
	totalChunks: number;
	percentComplete: number;
	tasksGenerated: number;
}

export interface DecompositionStats {
	totalChunks: number;
	processedChunks: number;
	totalTasks: number;
	duplicatesRemoved: number;
	cancelled: boolean;
}

export interface DecompositionResult {
	tasks: ValidatorTask[];
	validation: BatchValidationResult;
	stats: DecompositionStats;
}

export interface CancelToken {
	cancelled: boolean;
}

export interface DecompositionOptions {
	onProgress?: (progress: DecompositionProgress) => void;
	cancelToken?: CancelToken;
}

export interface AutoDecompositionOptions {
	specChunker: SpecChunker;
	taskGenerator: TaskGenerator;
	taskValidator: TaskValidator;
	readFile: (path: string) => string;
}

/**
 * AutoDecomposition orchestrates spec parsing and task generation flow
 */
export class AutoDecomposition {
	private readonly specChunker: SpecChunker;
	private readonly taskGenerator: TaskGenerator;
	private readonly taskValidator: TaskValidator;
	private readonly readFile: (path: string) => string;

	constructor(options: AutoDecompositionOptions) {
		this.specChunker = options.specChunker;
		this.taskGenerator = options.taskGenerator;
		this.taskValidator = options.taskValidator;
		this.readFile = options.readFile;
	}

	/**
	 * Decompose a spec file into tasks
	 */
	async decompose(
		specPath: string,
		options: DecompositionOptions = {},
	): Promise<DecompositionResult> {
		const { onProgress, cancelToken } = options;

		// Read spec file
		const content = this.readFile(specPath);

		// Chunk content
		const chunks = this.specChunker.chunk(content);
		const totalChunks = chunks.length;

		// Process chunks
		const allTasks: GeneratedTask[] = [];
		let processedChunks = 0;
		let cancelled = false;

		for (let i = 0; i < chunks.length; i++) {
			// Check cancellation
			if (cancelToken?.cancelled) {
				cancelled = true;
				break;
			}

			const chunk = chunks[i];
			const tasks = await this.taskGenerator.generate(chunk);
			allTasks.push(...tasks);

			processedChunks++;

			// Report progress
			if (onProgress) {
				onProgress({
					currentChunk: i + 1,
					totalChunks,
					percentComplete: Math.round(((i + 1) / totalChunks) * 100),
					tasksGenerated: allTasks.length,
				});
			}
		}

		// Deduplicate tasks
		const { uniqueTasks, duplicatesRemoved } = this.deduplicateTasks(allTasks);

		// Convert to ValidatorTask format (add deps array)
		const validatorTasks: ValidatorTask[] = uniqueTasks.map((task) => ({
			id: task.id,
			title: task.title,
			description: task.description,
			acceptanceCriteria: task.acceptanceCriteria,
			deps: task.dependsOn ?? [],
		}));

		// Validate tasks
		const validation = this.taskValidator.validateAll(validatorTasks);

		return {
			tasks: validatorTasks,
			validation,
			stats: {
				totalChunks,
				processedChunks,
				totalTasks: validatorTasks.length,
				duplicatesRemoved,
				cancelled,
			},
		};
	}

	/**
	 * Remove duplicate tasks with same title and description
	 */
	private deduplicateTasks(tasks: GeneratedTask[]): {
		uniqueTasks: GeneratedTask[];
		duplicatesRemoved: number;
	} {
		const seen = new Map<string, GeneratedTask>();

		for (const task of tasks) {
			// Create key from title and description
			const key = `${task.title}::${task.description ?? ""}`;

			if (!seen.has(key)) {
				seen.set(key, task);
			}
		}

		const uniqueTasks = Array.from(seen.values());
		const duplicatesRemoved = tasks.length - uniqueTasks.length;

		return { uniqueTasks, duplicatesRemoved };
	}
}
