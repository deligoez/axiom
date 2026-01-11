export type AgentType = "claude" | "codex" | "opencode";
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
		createdAt: now,
		updatedAt: now,
	};
}
