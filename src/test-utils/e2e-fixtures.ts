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
 * TestTask - Simplified Task interface for E2E tests.
 * Only requires id, title, and status. Other fields get sensible defaults.
 */
export interface TestTask {
	id: string;
	title: string;
	description?: string;
	status?: TaskStatus;
	type?: TaskType;
	tags?: string[];
	dependencies?: string[];
	assignee?: string;
	createdAt?: string;
	updatedAt?: string;
}

/**
 * Creates a temporary project directory with test tasks.
 *
 * @param tasks - Array of test tasks to create
 * @returns Path to the temporary directory
 */
export function createTestProject(tasks: TestTask[]): string {
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
	const jsonlContent = tasks
		.map((task) => {
			const jsonlTask: TaskJSONL = {
				id: task.id,
				title: task.title,
				description: task.description,
				status: task.status ?? "todo",
				type: task.type ?? "task",
				tags: task.tags ?? [],
				dependencies: task.dependencies ?? [],
				assignee: task.assignee,
				created_at: task.createdAt ?? now,
				updated_at: task.updatedAt ?? now,
				review_count: 0,
				learnings_count: 0,
				has_learnings: false,
				version: 1,
			};
			return JSON.stringify(jsonlTask);
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
 * Status should be one of: "todo", "doing", "done", "stuck", "later", "failed", "review"
 */
export function createStatusBead(
	id: string,
	title: string,
	status: TaskStatus,
): TestTask {
	return { id, title, status };
}

// Legacy type aliases for backward compatibility with existing tests
/** @deprecated Use TestTask instead */
export type TestBead = TestTask;

/** @deprecated Use TaskStatus instead */
export type BeadStatus = TaskStatus;
