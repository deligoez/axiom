export type AgentStatus = "idle" | "running" | "paused" | "stopped" | "error";
export type MergeQueueItemStatus =
	| "pending"
	| "merging"
	| "conflict"
	| "resolving";

export interface AgentState {
	id: string;
	type: "claude" | "codex" | "opencode";
	pid: number;
	taskId: string;
	worktree: string;
	branch: string;
	iteration: number;
	startedAt: number;
	status: AgentStatus;
}

export interface MergeQueueItem {
	taskId: string;
	branch: string;
	worktree: string;
	priority: number;
	status: MergeQueueItemStatus;
	retries: number;
	enqueuedAt: number;
}

export interface SessionStats {
	tasksCompleted: number;
	tasksFailed: number;
	mergesAuto: number;
	mergesManual: number;
	totalIterations: number;
	totalRuntime: number;
}

export interface ChorusState {
	version: string;
	sessionId: string;
	startedAt: number;
	mode: "semi-auto" | "autopilot";
	paused: boolean;
	agents: Record<string, AgentState>;
	mergeQueue: MergeQueueItem[];
	checkpoint: string | null;
	stats: SessionStats;
}
