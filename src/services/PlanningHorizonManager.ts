import * as fs from "node:fs";
import * as path from "node:path";

export type StopCondition =
	| "unknownDependency"
	| "decisionPoint"
	| "taskCountReached"
	| "specComplete";

export interface HorizonConfig {
	initialTaskCount: number;
	minReadyTasks: number;
	stopConditions: StopCondition[];
}

export interface HorizonSummary {
	horizon: number;
	sectionsPlanned: number;
	sectionsPending: number;
}

interface PlanningStateData {
	status?: string;
	planSummary?: { userGoal: string; estimatedTasks: number };
	tasks?: unknown[];
	reviewIterations?: unknown[];
	horizon?: number;
}

interface SpecProgress {
	[specPath: string]: {
		[sectionHeading: string]: {
			status: string;
			taskIds?: string[];
		};
	};
}

interface ChorusConfig {
	planningHorizon?: {
		initialTaskCount?: number;
		minReadyTasks?: number;
		stopConditions?: StopCondition[];
	};
}

const DEFAULT_CONFIG: HorizonConfig = {
	initialTaskCount: 10,
	minReadyTasks: 3,
	stopConditions: [
		"unknownDependency",
		"decisionPoint",
		"taskCountReached",
		"specComplete",
	],
};

const STATE_FILE = "planning-state.json";
const CONFIG_FILE = "config.json";
const PROGRESS_FILE = "specs/spec-progress.json";
const CHORUS_DIR = ".chorus";

export class PlanningHorizonManager {
	private projectDir: string;
	private config: HorizonConfig;

	constructor(projectDir: string) {
		this.projectDir = projectDir;
		this.config = this.loadConfig();
	}

	/**
	 * Get the current horizon number (1-based).
	 */
	getCurrentHorizon(): number {
		const state = this.loadState();
		return state?.horizon ?? 1;
	}

	/**
	 * Get the configured stop conditions.
	 */
	getStopConditions(): StopCondition[] {
		return this.config.stopConditions;
	}

	/**
	 * Check if a reason matches any stop condition.
	 */
	shouldStopPlanning(reason: string): boolean {
		return this.config.stopConditions.includes(reason as StopCondition);
	}

	/**
	 * Advance to the next horizon and persist.
	 */
	advanceHorizon(): void {
		const state = this.loadState() ?? this.getDefaultState();
		state.horizon = (state.horizon ?? 1) + 1;
		this.saveState(state);
	}

	/**
	 * Get a summary of the current horizon state.
	 */
	getHorizonSummary(): HorizonSummary {
		const progress = this.loadSpecProgress();

		let sectionsPlanned = 0;
		let sectionsPending = 0;

		for (const spec of Object.values(progress)) {
			for (const section of Object.values(spec)) {
				if (section.status === "tasked" || section.status === "archived") {
					sectionsPlanned++;
				} else if (
					section.status === "draft" ||
					section.status === "planning"
				) {
					sectionsPending++;
				}
			}
		}

		return {
			horizon: this.getCurrentHorizon(),
			sectionsPlanned,
			sectionsPending,
		};
	}

	/**
	 * Get the horizon configuration.
	 */
	getHorizonConfig(): HorizonConfig {
		return this.config;
	}

	/**
	 * Load config from config.json.
	 */
	private loadConfig(): HorizonConfig {
		const configPath = path.join(this.projectDir, CHORUS_DIR, CONFIG_FILE);

		if (!fs.existsSync(configPath)) {
			return { ...DEFAULT_CONFIG };
		}

		try {
			const rawConfig = JSON.parse(
				fs.readFileSync(configPath, "utf-8"),
			) as ChorusConfig;
			const horizonConfig = rawConfig.planningHorizon;

			if (!horizonConfig) {
				return { ...DEFAULT_CONFIG };
			}

			return {
				initialTaskCount:
					horizonConfig.initialTaskCount ?? DEFAULT_CONFIG.initialTaskCount,
				minReadyTasks:
					horizonConfig.minReadyTasks ?? DEFAULT_CONFIG.minReadyTasks,
				stopConditions:
					horizonConfig.stopConditions ?? DEFAULT_CONFIG.stopConditions,
			};
		} catch {
			return { ...DEFAULT_CONFIG };
		}
	}

	/**
	 * Load planning state from file.
	 */
	private loadState(): PlanningStateData | null {
		const statePath = path.join(this.projectDir, CHORUS_DIR, STATE_FILE);

		if (!fs.existsSync(statePath)) {
			return null;
		}

		try {
			return JSON.parse(
				fs.readFileSync(statePath, "utf-8"),
			) as PlanningStateData;
		} catch {
			return null;
		}
	}

	/**
	 * Save planning state to file.
	 */
	private saveState(state: PlanningStateData): void {
		const chorusDir = path.join(this.projectDir, CHORUS_DIR);
		const statePath = path.join(chorusDir, STATE_FILE);

		if (!fs.existsSync(chorusDir)) {
			fs.mkdirSync(chorusDir, { recursive: true });
		}

		fs.writeFileSync(statePath, JSON.stringify(state, null, 2), "utf-8");
	}

	/**
	 * Get default state structure.
	 */
	private getDefaultState(): PlanningStateData {
		return {
			status: "planning",
			planSummary: { userGoal: "", estimatedTasks: 0 },
			tasks: [],
			reviewIterations: [],
			horizon: 1,
		};
	}

	/**
	 * Load spec progress from file.
	 */
	private loadSpecProgress(): SpecProgress {
		const progressPath = path.join(this.projectDir, CHORUS_DIR, PROGRESS_FILE);

		if (!fs.existsSync(progressPath)) {
			return {};
		}

		try {
			return JSON.parse(fs.readFileSync(progressPath, "utf-8")) as SpecProgress;
		} catch {
			return {};
		}
	}
}
