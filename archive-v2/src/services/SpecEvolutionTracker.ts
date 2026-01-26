import * as fs from "node:fs";
import * as path from "node:path";

export type SectionState = "draft" | "planning" | "tasked" | "archived";

export interface SectionInfo {
	status: SectionState;
	taskIds: string[];
}

interface SpecProgress {
	[specPath: string]: {
		[sectionHeading: string]: SectionInfo;
	};
}

const PROGRESS_FILE = ".chorus/specs/spec-progress.json";

export class SpecEvolutionTracker {
	private projectDir: string;
	private progress: SpecProgress = {};
	private currentSpecPath: string | null = null;
	private sections: Map<string, SectionInfo> = new Map();

	constructor(projectDir: string) {
		this.projectDir = projectDir;
	}

	/**
	 * Load and parse a spec file, extracting sections
	 */
	loadSpec(specPath: string): void {
		this.currentSpecPath = specPath;
		const content = fs.readFileSync(specPath, "utf-8");

		// Parse ## level headings as sections
		const headingRegex = /^## (.+)$/gm;
		let match = headingRegex.exec(content);

		this.sections.clear();

		while (match !== null) {
			const heading = match[1].trim();
			// Check if we have progress for this section
			const savedInfo = this.progress[specPath]?.[heading];

			if (savedInfo) {
				this.sections.set(heading, savedInfo);
			} else {
				this.sections.set(heading, { status: "draft", taskIds: [] });
			}
			match = headingRegex.exec(content);
		}
	}

	/**
	 * Get the status of a specific section
	 */
	getSectionStatus(heading: string): SectionState | undefined {
		return this.sections.get(heading)?.status;
	}

	/**
	 * Mark a section as tasked with associated task IDs
	 */
	markSectionTasked(heading: string, taskIds: string[]): void {
		const info = this.sections.get(heading);
		if (info) {
			info.status = "tasked";
			info.taskIds = taskIds;
		}
	}

	/**
	 * Get all sections still in draft state
	 */
	getUnplannedSections(): string[] {
		const result: string[] = [];
		for (const [heading, info] of this.sections) {
			if (info.status === "draft") {
				result.push(heading);
			}
		}
		return result;
	}

	/**
	 * Get the first draft section for planning
	 */
	getNextPlanningSection(): string | undefined {
		for (const [heading, info] of this.sections) {
			if (info.status === "draft") {
				return heading;
			}
		}
		return undefined;
	}

	/**
	 * Check if all sections are tasked (or archived)
	 */
	isSpecComplete(): boolean {
		for (const info of this.sections.values()) {
			if (info.status === "draft" || info.status === "planning") {
				return false;
			}
		}
		return true;
	}

	/**
	 * Save progress to spec-progress.json
	 */
	saveProgress(): void {
		if (this.currentSpecPath) {
			// Update progress with current sections
			this.progress[this.currentSpecPath] = {};
			for (const [heading, info] of this.sections) {
				this.progress[this.currentSpecPath][heading] = info;
			}
		}

		const filePath = path.join(this.projectDir, PROGRESS_FILE);
		const dir = path.dirname(filePath);

		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}

		fs.writeFileSync(filePath, JSON.stringify(this.progress, null, 2), "utf-8");
	}

	/**
	 * Load progress from spec-progress.json
	 */
	loadProgress(): void {
		const filePath = path.join(this.projectDir, PROGRESS_FILE);

		if (fs.existsSync(filePath)) {
			const content = fs.readFileSync(filePath, "utf-8");
			this.progress = JSON.parse(content) as SpecProgress;
		}
	}
}
