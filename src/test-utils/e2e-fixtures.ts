/**
 * E2E test fixtures for Chorus TUI
 *
 * Provides helpers to create temporary directories with test data.
 */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TaskJSONL, TaskStatus, TaskType } from "../types/task.js";

/**
 * TestBead - Legacy interface for E2E test tasks.
 * Maps to TaskJSONL format internally.
 */
export interface TestBead {
	id: string;
	title: string;
	description?: string;
	status?: string;
	priority?: number;
	type?: string;
	tags?: string[];
	dependencies?: string[];
	assignee?: string;
	created?: string;
	updated?: string;
}

// Legacy type aliases for backward compatibility
export type BeadStatus =
	| TaskStatus
	| "open"
	| "in_progress"
	| "closed"
	| "blocked";

/**
 * Map legacy Bead status to Task status.
 */
function mapStatus(beadStatus?: string): TaskStatus {
	switch (beadStatus) {
		case "open":
			return "todo";
		case "in_progress":
			return "doing";
		case "closed":
			return "done";
		case "blocked":
			return "stuck";
		case "reviewing":
			return "review";
		default:
			return (beadStatus as TaskStatus) ?? "todo";
	}
}

/**
 * Creates a temporary project directory with test tasks.
 *
 * @param beads - Array of test tasks to create (legacy TestBead format)
 * @returns Path to the temporary directory
 */
export function createTestProject(beads: TestBead[]): string {
	// Create temp directory with unique name
	const tempDir = join(
		tmpdir(),
		`chorus-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
	);
	const chorusDir = join(tempDir, ".chorus");

	// Create .chorus directory (TaskStore writes to this)
	mkdirSync(chorusDir, { recursive: true });

	// Create tasks.jsonl with test tasks in TaskJSONL format
	const now = new Date().toISOString();
	const jsonlContent = beads
		.map((bead) => {
			const task: TaskJSONL = {
				id: bead.id,
				title: bead.title,
				description: bead.description,
				status: mapStatus(bead.status),
				type: (bead.type as TaskType) ?? "task",
				tags: bead.tags ?? [],
				dependencies: bead.dependencies ?? [],
				assignee: bead.assignee,
				created_at: bead.created ?? now,
				updated_at: bead.updated ?? now,
				review_count: 0,
				learnings_count: 0,
				has_learnings: false,
				version: 1,
			};
			return JSON.stringify(task);
		})
		.join("\n");

	writeFileSync(join(chorusDir, "tasks.jsonl"), `${jsonlContent}\n`);

	return tempDir;
}

/**
 * Removes a temporary project directory.
 *
 * @param projectDir - Path to the project directory to remove
 */
export function cleanupTestProject(projectDir: string): void {
	try {
		rmSync(projectDir, { recursive: true, force: true });
	} catch {
		// Ignore errors during cleanup
	}
}

/**
 * Creates a task with the given status for testing.
 */
export function createStatusBead(
	id: string,
	title: string,
	status: BeadStatus | string,
): TestBead {
	return { id, title, status };
}
