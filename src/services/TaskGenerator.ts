import type { ExtractedTask, PlanAgent } from "./PlanAgent.js";
import type { Chunk } from "./SpecChunker.js";

export interface GeneratedTask {
	id: string;
	title: string;
	description?: string;
	acceptanceCriteria?: string[];
	priority: number;
	dependsOn?: string[];
}

export interface ProgressReport {
	chunk: Chunk;
	tasksGenerated: number;
}

export interface TaskGeneratorOptions {
	planAgent: PlanAgent;
	taskIdPrefix: string;
	onProgress?: (progress: ProgressReport) => void;
}

/**
 * TaskGenerator converts spec chunks into tasks using PlanAgent
 */
export class TaskGenerator {
	private readonly planAgent: PlanAgent;
	private readonly taskIdPrefix: string;
	private readonly onProgress?: (progress: ProgressReport) => void;

	private totalTasksGenerated = 0;
	private generatedTasks: GeneratedTask[] = [];

	constructor(options: TaskGeneratorOptions) {
		this.planAgent = options.planAgent;
		this.taskIdPrefix = options.taskIdPrefix;
		this.onProgress = options.onProgress;
	}

	/**
	 * Generate tasks from a spec chunk
	 */
	async generate(chunk: Chunk): Promise<GeneratedTask[]> {
		// Send chunk content to PlanAgent for parsing
		const prompt = this.buildPrompt(chunk);
		await this.planAgent.send(prompt);

		// Extract tasks from agent response
		const extractedTasks = this.planAgent.extractTasks();

		// Convert extracted tasks to generated task format
		const tasks = this.convertTasks(extractedTasks);

		// Infer dependencies between tasks
		this.inferDependencies(tasks);

		// Track totals
		this.generatedTasks.push(...tasks);
		this.totalTasksGenerated += tasks.length;

		// Report progress
		if (this.onProgress) {
			this.onProgress({
				chunk,
				tasksGenerated: tasks.length,
			});
		}

		return tasks;
	}

	/**
	 * Get total tasks generated across all chunks
	 */
	getTotalTasksGenerated(): number {
		return this.totalTasksGenerated;
	}

	/**
	 * Get all generated tasks
	 */
	getAllTasks(): GeneratedTask[] {
		return [...this.generatedTasks];
	}

	/**
	 * Build prompt for PlanAgent
	 */
	private buildPrompt(chunk: Chunk): string {
		return `Analyze the following spec content and extract tasks:

${chunk.content}

For each task found, provide:
- A clear title
- Description
- Acceptance criteria`;
	}

	/**
	 * Convert extracted tasks to generated task format
	 */
	private convertTasks(extractedTasks: ExtractedTask[]): GeneratedTask[] {
		return extractedTasks.map((extracted, index) => {
			const id = this.generateId();

			return {
				id,
				title: extracted.title,
				description: extracted.description,
				acceptanceCriteria: extracted.acceptanceCriteria,
				// Priority based on order (earlier = higher priority, lower number)
				priority: index + 1,
			};
		});
	}

	/**
	 * Generate unique task ID
	 */
	private generateId(): string {
		// Generate a short random suffix
		const suffix = Math.random().toString(36).substring(2, 6);
		return `${this.taskIdPrefix}${suffix}`;
	}

	/**
	 * Infer dependencies between tasks based on description mentions
	 */
	private inferDependencies(tasks: GeneratedTask[]): void {
		// Build map of task titles to IDs
		const titleToId = new Map<string, string>();
		for (const task of tasks) {
			titleToId.set(task.title.toLowerCase(), task.id);
		}

		// Check each task description for mentions of other tasks
		for (const task of tasks) {
			const description = task.description?.toLowerCase() ?? "";

			// Look for "depends on" pattern
			const dependsOnMatch = description.match(/depends on\s+(.+?)(?:[,.]|$)/);
			if (dependsOnMatch) {
				const dependencyText = dependsOnMatch[1].toLowerCase();

				// Find matching task title
				for (const [title, id] of titleToId) {
					if (dependencyText.includes(title) && id !== task.id) {
						task.dependsOn = task.dependsOn ?? [];
						if (!task.dependsOn.includes(id)) {
							task.dependsOn.push(id);
						}
					}
				}
			}

			// Also check for explicit mentions of other task titles
			for (const [title, id] of titleToId) {
				if (id !== task.id && description.includes(title)) {
					// Only add if it seems like a dependency context
					if (
						description.includes("after") ||
						description.includes("requires") ||
						description.includes("needs")
					) {
						task.dependsOn = task.dependsOn ?? [];
						if (!task.dependsOn.includes(id)) {
							task.dependsOn.push(id);
						}
					}
				}
			}
		}
	}
}
