/**
 * E2E test fixtures for Chorus TUI
 *
 * Provides helpers to create temporary directories with test data.
 */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Bead, BeadPriority, BeadStatus } from "../types/bead.js";

export interface TestBead extends Partial<Bead> {
	id: string;
	title: string;
}

/**
 * Creates a temporary project directory with beads test data.
 *
 * @param beads - Array of test beads to create
 * @returns Path to the temporary directory
 */
export function createTestProject(beads: TestBead[]): string {
	// Create temp directory with unique name
	const tempDir = join(
		tmpdir(),
		`chorus-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
	);
	const beadsDir = join(tempDir, ".beads");

	mkdirSync(beadsDir, { recursive: true });

	// Create issues.jsonl with test beads
	// Field names must match BeadsParser expectations: type, created, updated
	const jsonlContent = beads
		.map((bead) => {
			const fullBead: Record<string, unknown> = {
				id: bead.id,
				title: bead.title,
				description: bead.description ?? "",
				status: bead.status ?? "open",
				priority: bead.priority ?? 2,
				type: bead.type ?? "task",
				created: bead.created ?? new Date().toISOString(),
				updated: bead.updated ?? new Date().toISOString(),
			};
			return JSON.stringify(fullBead);
		})
		.join("\n");

	writeFileSync(join(beadsDir, "issues.jsonl"), `${jsonlContent}\n`);

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
 * Creates a bead with the given status for testing.
 */
export function createStatusBead(
	id: string,
	title: string,
	status: BeadStatus,
): TestBead {
	return { id, title, status };
}

/**
 * Creates a bead with the given priority for testing.
 */
export function createPriorityBead(
	id: string,
	title: string,
	priority: BeadPriority,
): TestBead {
	return { id, title, priority, status: "open" };
}
