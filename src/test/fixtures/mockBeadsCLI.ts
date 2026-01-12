/**
 * Mock BeadsCLI for TUI Integration Tests
 *
 * Provides mock task data helpers for testing
 * the full TUI without actual beads CLI interactions.
 */

import type { Bead, BeadPriority } from "../../types/bead.js";

export function createTestTask(id: string, overrides?: Partial<Bead>): Bead {
	return {
		id,
		title: `Task ${id}`,
		status: "open",
		priority: 1 as BeadPriority,
		type: "task",
		created: new Date().toISOString(),
		updated: new Date().toISOString(),
		...overrides,
	};
}

export function createReadyTasks(count: number): Bead[] {
	return Array.from({ length: count }, (_, i) =>
		createTestTask(`ch-ready${i + 1}`, {
			title: `Ready Task ${i + 1}`,
			status: "open",
			priority: (i % 3) as BeadPriority,
		}),
	);
}

export function createBlockedTasks(count: number): Bead[] {
	return Array.from({ length: count }, (_, i) =>
		createTestTask(`ch-blocked${i + 1}`, {
			title: `Blocked Task ${i + 1}`,
			status: "blocked",
			dependencies: ["ch-dep1"],
		}),
	);
}

export function createInProgressTasks(count: number): Bead[] {
	return Array.from({ length: count }, (_, i) =>
		createTestTask(`ch-progress${i + 1}`, {
			title: `In Progress Task ${i + 1}`,
			status: "in_progress",
		}),
	);
}

export function createMixedTasks(): Bead[] {
	return [
		...createReadyTasks(3),
		...createInProgressTasks(2),
		...createBlockedTasks(1),
		createTestTask("ch-closed1", {
			title: "Closed Task",
			status: "closed",
			closed: new Date().toISOString(),
		}),
	];
}
