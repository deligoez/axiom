import type { Task, TaskSelectionContext } from "../types/task.js";

/**
 * Scoring weights for task selection algorithm.
 */
const WEIGHTS = {
	USER_HINT: 200, // 'next' tag
	UNBLOCKING: 100, // Per stuck dependent
	MILESTONE_FOCUS: 30, // Per same-milestone task completed
	SERIES_CONTINUATION: 25, // Per shared tag with last task
	ATOMICITY: 50, // No dependencies
	PREFERRED_TAG: 10, // Per matching preferred tag
} as const;

/**
 * TaskSelector - Intelligent task selection algorithm.
 *
 * Scoring system:
 * - User hint: +200 for 'next' tag
 * - Unblocking: +100 per stuck dependent
 * - Milestone focus: +30 per same-milestone task completed
 * - Series continuation: +25 per shared tag with last task
 * - Atomicity: +50 for tasks with no dependencies
 * - Preferred tags: +10 per matching tag
 * - FIFO fallback: oldest task wins ties
 */
export class TaskSelector {
	/**
	 * Select the best next task to work on.
	 *
	 * @param tasks All tasks (including non-ready ones for context)
	 * @param context Optional context for intelligent selection
	 * @returns Best task to work on, or undefined if none ready
	 */
	selectNextTask(
		tasks: Task[],
		context?: TaskSelectionContext,
	): Task | undefined {
		// Filter to ready tasks (todo + no unmet dependencies)
		const readyTasks = tasks.filter((task) => {
			if (task.status !== "todo") return false;

			// Check excludeIds
			if (context?.excludeIds?.includes(task.id)) return false;

			// Check all dependencies are done
			if (task.dependencies.length > 0) {
				const allDepsDone = task.dependencies.every((depId) => {
					const dep = tasks.find((t) => t.id === depId);
					return dep?.status === "done";
				});
				if (!allDepsDone) return false;
			}

			return true;
		});

		if (readyTasks.length === 0) {
			return undefined;
		}

		// Score each ready task
		const scored = readyTasks.map((task) => ({
			task,
			score: this.scoreTask(task, tasks, context),
		}));

		// Sort by score (descending), then by createdAt (ascending - FIFO)
		scored.sort((a, b) => {
			if (b.score !== a.score) {
				return b.score - a.score;
			}
			// FIFO fallback: older tasks first
			return (
				new Date(a.task.createdAt).getTime() -
				new Date(b.task.createdAt).getTime()
			);
		});

		return scored[0]?.task;
	}

	/**
	 * Calculate score for a single task.
	 */
	private scoreTask(
		task: Task,
		allTasks: Task[],
		context?: TaskSelectionContext,
	): number {
		let score = 0;

		// User hint: +200 for 'next' tag
		if (task.tags.includes("next")) {
			score += WEIGHTS.USER_HINT;
		}

		// Unblocking: +100 per stuck dependent
		const dependents = allTasks.filter(
			(t) => t.status === "todo" && t.dependencies.includes(task.id),
		);
		score += dependents.length * WEIGHTS.UNBLOCKING;

		// Atomicity: +50 for tasks with no dependencies
		if (task.dependencies.length === 0) {
			score += WEIGHTS.ATOMICITY;
		}

		// Milestone focus: +30 per same-milestone task completed
		const milestone = task.tags.find((tag) => tag.startsWith("m"));
		if (milestone) {
			const sameMillestoneCompleted = allTasks.filter(
				(t) => t.status === "done" && t.tags.includes(milestone),
			);
			score += sameMillestoneCompleted.length * WEIGHTS.MILESTONE_FOCUS;
		}

		// Series continuation: +25 per shared tag with last task
		if (context?.lastCompletedTaskId) {
			const lastTask = allTasks.find(
				(t) => t.id === context.lastCompletedTaskId,
			);
			if (lastTask) {
				const sharedTags = task.tags.filter((tag) =>
					lastTask.tags.includes(tag),
				);
				score += sharedTags.length * WEIGHTS.SERIES_CONTINUATION;
			}
		}

		// Preferred tags: +10 per matching tag
		if (context?.preferredTags && context.preferredTags.length > 0) {
			const matchingTags = task.tags.filter((tag) =>
				context.preferredTags?.includes(tag),
			);
			score += matchingTags.length * WEIGHTS.PREFERRED_TAG;
		}

		return score;
	}
}
