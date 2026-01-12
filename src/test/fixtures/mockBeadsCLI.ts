/**
 * Mock TaskProvider for TUI Integration Tests
 *
 * Provides mock task data helpers for testing
 * the full TUI without actual beads CLI interactions.
 */

import type { TaskProviderTask } from "../../types/task-provider.js";

export function createTestTask(
	id: string,
	overrides?: Partial<TaskProviderTask>,
): TaskProviderTask {
	return {
		id,
		title: `Task ${id}`,
		status: "open",
		priority: 1,
		labels: [],
		dependencies: [],
		...overrides,
	};
}

export function createReadyTasks(count: number): TaskProviderTask[] {
	return Array.from({ length: count }, (_, i) =>
		createTestTask(`ch-ready${i + 1}`, {
			title: `Ready Task ${i + 1}`,
			status: "open",
			priority: i % 3,
		}),
	);
}

export function createBlockedTasks(count: number): TaskProviderTask[] {
	return Array.from({ length: count }, (_, i) =>
		createTestTask(`ch-blocked${i + 1}`, {
			title: `Blocked Task ${i + 1}`,
			status: "blocked",
			dependencies: ["ch-dep1"],
		}),
	);
}

export function createInProgressTasks(count: number): TaskProviderTask[] {
	return Array.from({ length: count }, (_, i) =>
		createTestTask(`ch-progress${i + 1}`, {
			title: `In Progress Task ${i + 1}`,
			status: "in_progress",
		}),
	);
}

export function createMixedTasks(): TaskProviderTask[] {
	return [
		...createReadyTasks(3),
		...createInProgressTasks(2),
		...createBlockedTasks(1),
		createTestTask("ch-closed1", {
			title: "Closed Task",
			status: "closed",
		}),
	];
}
