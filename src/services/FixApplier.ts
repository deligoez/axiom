import type { SessionLogger } from "./SessionLogger.js";

export interface FixableTask {
	id: string;
	title: string;
	description?: string;
	deps: string[];
}

export type FixType = "rewrite" | "split" | "reorder" | "clarify";

export interface RewriteFix {
	type: "rewrite";
	field: "title" | "description";
	newValue: string;
}

export interface SplitFix {
	type: "split";
	splitInto: Array<{
		title: string;
		description?: string;
	}>;
}

export interface ReorderFix {
	type: "reorder";
	newOrder: string[];
}

export interface ClarifyFix {
	type: "clarify";
	question: string;
	options: string[];
}

export type Fix = RewriteFix | SplitFix | ReorderFix | ClarifyFix;

export interface ApplyFixResult {
	original: FixableTask;
	modified: FixableTask[];
	fixType: FixType;
}

export interface FixApplierOptions {
	sessionLogger: SessionLogger;
	taskIdPrefix: string;
}

/**
 * FixApplier applies suggested fixes to tasks (modify, split, reorder)
 */
export class FixApplier {
	private readonly sessionLogger: SessionLogger;
	private readonly taskIdPrefix: string;

	constructor(options: FixApplierOptions) {
		this.sessionLogger = options.sessionLogger;
		this.taskIdPrefix = options.taskIdPrefix;
	}

	/**
	 * Apply a fix to a single task
	 */
	applyFix(task: FixableTask, fix: Fix): ApplyFixResult {
		let modified: FixableTask[];

		switch (fix.type) {
			case "rewrite":
				modified = [this.applyRewriteFix(task, fix)];
				break;
			case "split":
				modified = this.applySplitFix(task, fix);
				break;
			case "clarify":
				// Clarify fixes need user input, return unchanged
				modified = [{ ...task }];
				break;
			default:
				modified = [{ ...task }];
		}

		// Log the applied fix
		this.sessionLogger.log({
			mode: "planning",
			eventType: "fix_applied",
			details: {
				taskId: task.id,
				fixType: fix.type,
				resultCount: modified.length,
			},
		});

		return {
			original: task,
			modified,
			fixType: fix.type,
		};
	}

	/**
	 * Apply a reorder fix to a list of tasks
	 */
	applyFixToList(tasks: FixableTask[], fix: Fix): FixableTask[] {
		if (fix.type !== "reorder") {
			return tasks;
		}

		const taskMap = new Map<string, FixableTask>();
		for (const task of tasks) {
			taskMap.set(task.id, task);
		}

		const reordered: FixableTask[] = [];
		for (const id of fix.newOrder) {
			const task = taskMap.get(id);
			if (task) {
				reordered.push(task);
			}
		}

		// Log the reorder
		this.sessionLogger.log({
			mode: "planning",
			eventType: "fix_applied",
			details: {
				fixType: "reorder",
				newOrder: fix.newOrder,
			},
		});

		return reordered;
	}

	/**
	 * Check if a fix requires user input
	 */
	needsUserInput(fix: Fix): boolean {
		return fix.type === "clarify";
	}

	/**
	 * Apply a rewrite fix
	 */
	private applyRewriteFix(task: FixableTask, fix: RewriteFix): FixableTask {
		return {
			...task,
			[fix.field]: fix.newValue,
		};
	}

	/**
	 * Apply a split fix - creates multiple tasks from one
	 */
	private applySplitFix(task: FixableTask, fix: SplitFix): FixableTask[] {
		const newTasks: FixableTask[] = [];
		let previousId: string | null = null;

		for (let i = 0; i < fix.splitInto.length; i++) {
			const splitDef = fix.splitInto[i];
			const newId = this.generateId();

			// Build dependencies:
			// - First task inherits original task's dependencies
			// - Subsequent tasks depend on the previous split task
			const deps: string[] = [];
			if (i === 0) {
				deps.push(...task.deps);
			} else if (previousId) {
				deps.push(previousId);
			}

			newTasks.push({
				id: newId,
				title: splitDef.title,
				description: splitDef.description,
				deps,
			});

			previousId = newId;
		}

		return newTasks;
	}

	/**
	 * Generate a unique task ID
	 */
	private generateId(): string {
		const suffix = Math.random().toString(36).substring(2, 6);
		return `${this.taskIdPrefix}${suffix}`;
	}
}
