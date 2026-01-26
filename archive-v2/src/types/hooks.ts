import type { AgentType } from "./config.js";

export type HookEvent =
	| "pre-agent-start"
	| "post-agent-start"
	| "pre-task-claim"
	| "post-task-claim"
	| "pre-iteration"
	| "post-iteration"
	| "pre-task-complete"
	| "post-task-complete"
	| "pre-merge"
	| "post-merge"
	| "on-agent-error"
	| "on-agent-timeout"
	| "on-conflict";

export type TaskStatus =
	| "open"
	| "in_progress"
	| "blocked"
	| "closed"
	| "deferred";

export interface Signal {
	type: string;
	content?: string;
}

export interface HookAgentInput {
	id: string;
	type: AgentType;
	worktree: string;
	pid?: number;
}

export interface HookTaskInput {
	id: string;
	title: string;
	status: TaskStatus;
	priority: number;
	labels: string[];
}

export interface HookIterationInput {
	number: number;
	maxIterations: number;
}

export interface HookOutputInput {
	stdout: string;
	stderr?: string;
	exitCode: number;
	signal?: Signal;
}

export interface HookMergeInput {
	branch: string;
	targetBranch: string;
	conflictFiles?: string[];
}

export interface HookErrorInput {
	message: string;
	stack?: string;
	code?: string;
}

export interface HookInput {
	event: HookEvent;
	agent?: HookAgentInput;
	task?: HookTaskInput;
	iteration?: HookIterationInput;
	output?: HookOutputInput;
	merge?: HookMergeInput;
	error?: HookErrorInput;
}

export type HookResult = "continue" | "block" | "complete";

export interface HookOutput {
	result: HookResult;
	message?: string;
}

export interface HookHandler {
	event: HookEvent;
	command: string;
	timeout?: number;
	continueOnFailure?: boolean;
}

export interface HookConfig {
	timeout: number;
	retryOnError: boolean;
	maxRetries: number;
	continueOnFailure: boolean;
}

export function getDefaultHookConfig(): HookConfig {
	return {
		timeout: 30000,
		retryOnError: false,
		maxRetries: 1,
		continueOnFailure: true,
	};
}
