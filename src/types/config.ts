import type { AgentType } from "./agent.js";
import type { ReviewConfig } from "./review.js";
import type { SprintConfig } from "./sprint.js";

// Re-export AgentType for convenience
export type { AgentType };

export type ProjectType = "node" | "php" | "python" | "go" | "rust" | "unknown";

export interface QualityCommand {
	name: string;
	command: string;
	required: boolean;
	order: number;
}

export interface AgentTypeConfig {
	command: string;
	args: string[];
	model?: string;
	allowModelOverride?: boolean;
}

export interface CheckpointsConfig {
	beforeAutopilot: boolean;
	beforeMerge: boolean;
	periodic: number; // 0 = disabled
}

export interface PlanReviewConfig {
	enabled: boolean;
	maxIterations: number;
	triggerOn: string[]; // 'cross_cutting' | 'architectural'
	autoApply: "none" | "minor" | "all";
	requireApproval: string[]; // 'redundant' | 'dependency_change'
}

export interface FileWatcherConfig {
	usePolling: boolean;
	interval: number; // polling interval in ms (only used if usePolling: true)
}

export interface TaskStoreConfig {
	maxTasks: number; // Maximum number of tasks before warning (0 = unlimited)
	warnThreshold: number; // Emit warning when size > maxTasks * warnThreshold (0.0-1.0)
}

export interface ChorusConfig {
	version: string;
	mode: "semi-auto" | "autopilot";

	project: {
		name?: string;
		type?: ProjectType;
		taskIdPrefix: string;
	};

	agents: {
		default: AgentType;
		maxParallel: number;
		timeoutMinutes: number;
		available: Partial<Record<AgentType, AgentTypeConfig>>;
	};

	qualityCommands: QualityCommand[];

	completion: {
		signal: string;
		requireTests: boolean;
		maxIterations: number;
		taskTimeout: number;
	};

	merge: {
		autoResolve: boolean;
		agentResolve: boolean;
		requireApproval: boolean;
	};

	tui: {
		agentGrid: "auto" | string;
	};

	checkpoints: CheckpointsConfig;

	planReview: PlanReviewConfig;

	review: ReviewConfig;

	sprint?: SprintConfig;

	fileWatcher: FileWatcherConfig;

	taskStore: TaskStoreConfig;

	createdAt?: string;
	updatedAt?: string;
}

export function getDefaultConfig(): ChorusConfig {
	const now = new Date().toISOString();
	return {
		version: "3.1",
		mode: "semi-auto",
		project: { taskIdPrefix: "ch-" },
		agents: {
			default: "claude",
			maxParallel: 3,
			timeoutMinutes: 30,
			available: {
				claude: { command: "claude", args: ["--dangerously-skip-permissions"] },
			},
		},
		qualityCommands: [
			{ name: "test", command: "npm test", required: true, order: 1 },
		],
		completion: {
			signal: "<chorus>COMPLETE</chorus>",
			requireTests: true,
			maxIterations: 50,
			taskTimeout: 30,
		},
		merge: {
			autoResolve: true,
			agentResolve: true,
			requireApproval: false,
		},
		tui: { agentGrid: "auto" },
		checkpoints: {
			beforeAutopilot: true,
			beforeMerge: true,
			periodic: 5,
		},
		planReview: {
			enabled: true,
			maxIterations: 5,
			triggerOn: ["cross_cutting", "architectural"],
			autoApply: "minor",
			requireApproval: ["redundant", "dependency_change"],
		},
		review: {
			defaultMode: "batch",
			autoApprove: {
				enabled: true,
				maxIterations: 3,
				requireQualityPass: true,
			},
			labelRules: [],
		},
		sprint: {
			target: { type: "noReady" },
			iterationSettings: {
				maxIterations: 50,
				timeoutMinutes: 30,
			},
			pauseOnStuck: true,
			pauseOnErrors: true,
		},
		fileWatcher: {
			usePolling: false, // Use native fs.watch by default (more efficient)
			interval: 100, // If polling needed, use 100ms (default chokidar interval)
		},
		taskStore: {
			maxTasks: 50000, // Warn when approaching 50k tasks
			warnThreshold: 0.8, // Warn at 80% capacity (40k tasks)
		},
		createdAt: now,
		updatedAt: now,
	};
}
