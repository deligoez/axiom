import * as fs from "node:fs";
import * as path from "node:path";

export interface PlanSummary {
	userGoal: string;
	estimatedTasks: number;
}

export interface Task {
	id: string;
	title: string;
	[key: string]: unknown;
}

export interface ReviewIteration {
	timestamp: string;
	feedback: string;
	[key: string]: unknown;
}

export type PlanningStatus =
	| "planning"
	| "reviewing"
	| "ready"
	| "implementation";

export interface PlanningStateData {
	status: PlanningStatus;
	chosenMode?: "semi-auto" | "autopilot";
	planSummary: PlanSummary;
	tasks: Task[];
	reviewIterations: ReviewIteration[];
}

const STATE_FILE = "planning-state.json";
const CHORUS_DIR = ".chorus";

export class PlanningState {
	private filePath: string;
	private chorusDir: string;

	constructor(projectDir: string) {
		this.chorusDir = path.join(projectDir, CHORUS_DIR);
		this.filePath = path.join(this.chorusDir, STATE_FILE);
	}

	/**
	 * Save planning state to file
	 */
	save(state: PlanningStateData): void {
		this.validate(state);

		if (!fs.existsSync(this.chorusDir)) {
			fs.mkdirSync(this.chorusDir, { recursive: true });
		}

		fs.writeFileSync(this.filePath, JSON.stringify(state, null, 2), "utf-8");
	}

	/**
	 * Load planning state from file
	 */
	load(): PlanningStateData | null {
		if (!fs.existsSync(this.filePath)) {
			return null;
		}

		const content = fs.readFileSync(this.filePath, "utf-8");
		return JSON.parse(content) as PlanningStateData;
	}

	/**
	 * Validate state before saving
	 */
	private validate(state: PlanningStateData): void {
		// chosenMode is required when status is 'ready' or 'implementation'
		if (
			(state.status === "ready" || state.status === "implementation") &&
			!state.chosenMode
		) {
			throw new Error(
				"chosenMode is required when status is 'ready' or 'implementation'",
			);
		}
	}
}
