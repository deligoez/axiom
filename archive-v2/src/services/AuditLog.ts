import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";

/**
 * Audit entry structure.
 */
export interface AuditEntry {
	timestamp: string;
	type: string;
	action?: string;
	[key: string]: unknown;
}

/**
 * Read audit log entries for a task.
 *
 * Checks for both uncompressed (.jsonl) and compressed (.jsonl.gz) files.
 * Returns empty array if no audit file exists.
 *
 * @param projectDir - The project root directory
 * @param taskId - The task ID
 * @returns Array of audit entries
 */
export function readAuditLog(projectDir: string, taskId: string): AuditEntry[] {
	const auditDir = join(projectDir, ".chorus", "audit");

	// Check for uncompressed file first
	const jsonlPath = join(auditDir, `${taskId}.jsonl`);
	if (existsSync(jsonlPath)) {
		const content = readFileSync(jsonlPath, "utf-8");
		return parseAuditContent(content);
	}

	// Check for compressed file
	const gzPath = join(auditDir, `${taskId}.jsonl.gz`);
	if (existsSync(gzPath)) {
		const compressed = readFileSync(gzPath);
		const content = gunzipSync(compressed).toString("utf-8");
		return parseAuditContent(content);
	}

	// No audit file found
	return [];
}

/**
 * Parse JSONL content into audit entries.
 */
function parseAuditContent(content: string): AuditEntry[] {
	const lines = content.trim().split("\n").filter(Boolean);
	return lines.map((line) => JSON.parse(line) as AuditEntry);
}

/**
 * Archive (compress) an audit log file.
 *
 * Compresses the .jsonl file to .jsonl.gz and deletes the original.
 * Does nothing if the log file doesn't exist.
 *
 * @param projectDir - The project root directory
 * @param taskId - The task ID
 */
export function archiveAuditLog(projectDir: string, taskId: string): void {
	const auditDir = join(projectDir, ".chorus", "audit");
	const jsonlPath = join(auditDir, `${taskId}.jsonl`);

	// Do nothing if log file doesn't exist
	if (!existsSync(jsonlPath)) {
		return;
	}

	// Read, compress, write
	const content = readFileSync(jsonlPath, "utf-8");
	const compressed = gzipSync(content);
	const gzPath = join(auditDir, `${taskId}.jsonl.gz`);
	writeFileSync(gzPath, compressed);

	// Delete original
	unlinkSync(jsonlPath);
}
