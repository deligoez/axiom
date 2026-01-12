import * as fs from "node:fs";
import * as path from "node:path";
import type { TaskProvider } from "../types/task-provider.js";
import type { SpecEvolutionTracker } from "./SpecEvolutionTracker.js";

const ARCHIVE_DIR = ".chorus/specs/archive";
const PROGRESS_FILE = ".chorus/specs/spec-progress.json";

export class SpecArchiver {
	private projectDir: string;
	private tracker: SpecEvolutionTracker;
	private taskProvider: Pick<TaskProvider, "getTaskStatus">;

	constructor(
		projectDir: string,
		tracker: SpecEvolutionTracker,
		taskProvider: Pick<TaskProvider, "getTaskStatus">,
	) {
		this.projectDir = projectDir;
		this.tracker = tracker;
		this.taskProvider = taskProvider;
	}

	/**
	 * Check if a spec should be archived.
	 * Returns true if all sections are tasked and all tasks are closed.
	 */
	async shouldArchive(specPath: string): Promise<boolean> {
		// Load the spec and its progress
		this.tracker.loadProgress();
		this.tracker.loadSpec(specPath);

		// Check if spec is complete (all sections tasked)
		if (!this.tracker.isSpecComplete()) {
			return false;
		}

		// Get all task IDs from all sections
		const taskIds = this.getAllTaskIds(specPath);

		// Check if all tasks are closed
		for (const taskId of taskIds) {
			try {
				const status = await this.taskProvider.getTaskStatus(taskId);
				if (status !== "closed") {
					return false;
				}
			} catch {
				// If we can't get the task, assume it's not closed
				return false;
			}
		}

		return true;
	}

	/**
	 * Archive a spec by moving it to the archive folder.
	 */
	async archive(specPath: string): Promise<void> {
		const archiveDir = path.join(this.projectDir, ARCHIVE_DIR);

		// Create archive directory if it doesn't exist
		if (!fs.existsSync(archiveDir)) {
			fs.mkdirSync(archiveDir, { recursive: true });
		}

		// Get the filename
		const filename = path.basename(specPath);
		const archivePath = path.join(archiveDir, filename);

		// Move the file
		fs.renameSync(specPath, archivePath);

		// Update spec-progress.json
		this.updateProgressForArchive(specPath, archivePath);
	}

	/**
	 * Get all archived specs.
	 */
	getArchivedSpecs(): string[] {
		const archiveDir = path.join(this.projectDir, ARCHIVE_DIR);

		if (!fs.existsSync(archiveDir)) {
			return [];
		}

		const files = fs.readdirSync(archiveDir);
		return files
			.filter((file) => file.endsWith(".md"))
			.map((file) => path.join(archiveDir, file));
	}

	/**
	 * Unarchive a spec by moving it back from archive.
	 */
	async unarchive(archivedPath: string): Promise<void> {
		const specsDir = path.join(this.projectDir, ".chorus", "specs");
		const filename = path.basename(archivedPath);
		const restoredPath = path.join(specsDir, filename);

		// Move the file back
		fs.renameSync(archivedPath, restoredPath);
	}

	/**
	 * Get all task IDs from a spec's progress.
	 */
	private getAllTaskIds(specPath: string): string[] {
		const progressPath = path.join(this.projectDir, PROGRESS_FILE);

		if (!fs.existsSync(progressPath)) {
			return [];
		}

		const progress = JSON.parse(fs.readFileSync(progressPath, "utf-8"));
		const specProgress = progress[specPath];

		if (!specProgress) {
			return [];
		}

		const taskIds: string[] = [];
		for (const sectionInfo of Object.values(specProgress) as Array<{
			taskIds?: string[];
		}>) {
			if (sectionInfo.taskIds) {
				taskIds.push(...sectionInfo.taskIds);
			}
		}

		return taskIds;
	}

	/**
	 * Update spec-progress.json when archiving.
	 */
	private updateProgressForArchive(oldPath: string, newPath: string): void {
		const progressPath = path.join(this.projectDir, PROGRESS_FILE);

		if (!fs.existsSync(progressPath)) {
			return;
		}

		const progress = JSON.parse(fs.readFileSync(progressPath, "utf-8"));

		// Move progress entry to new path and mark as archived
		if (progress[oldPath]) {
			const sections = progress[oldPath];
			// Mark all sections as archived
			for (const sectionKey of Object.keys(sections)) {
				sections[sectionKey].status = "archived";
			}
			progress[newPath] = sections;
			delete progress[oldPath];
		}

		fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2), "utf-8");
	}
}
