import * as fs from "node:fs";
import * as path from "node:path";
import type { AnyActorRef, Snapshot } from "xstate";

/**
 * Get the snapshot file path for a project
 */
export function getSnapshotPath(projectRoot: string): string {
	return path.join(projectRoot, ".chorus", "state.xstate.json");
}

/**
 * Persist actor snapshot to disk using atomic write
 */
export function persistSnapshot(
	actor: AnyActorRef,
	snapshotPath: string,
): void {
	const snapshot = actor.getPersistedSnapshot();
	const json = JSON.stringify(snapshot, null, 2);

	// Ensure directory exists
	const dir = path.dirname(snapshotPath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}

	// Atomic write: write to temp file then rename
	const tempPath = `${snapshotPath}.tmp.${Date.now()}`;
	fs.writeFileSync(tempPath, json, "utf-8");
	fs.renameSync(tempPath, snapshotPath);
}

/**
 * Validates that parsed JSON has the required XState snapshot structure.
 */
function isValidSnapshot(raw: unknown): raw is Snapshot<unknown> {
	if (typeof raw !== "object" || raw === null) {
		return false;
	}

	const snapshot = raw as Record<string, unknown>;

	// XState snapshots must have a status field
	if (typeof snapshot.status !== "string") {
		return false;
	}

	return true;
}

/**
 * Load snapshot from disk
 * Returns null if file doesn't exist or is invalid
 */
export function loadSnapshot(snapshotPath: string): Snapshot<unknown> | null {
	if (!fs.existsSync(snapshotPath)) {
		return null;
	}

	try {
		const content = fs.readFileSync(snapshotPath, "utf-8");
		const parsed = JSON.parse(content) as unknown;

		if (!isValidSnapshot(parsed)) {
			console.warn(
				`[persistence] Invalid snapshot structure at ${snapshotPath}`,
			);
			return null;
		}

		return parsed;
	} catch {
		return null;
	}
}

