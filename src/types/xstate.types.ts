/**
 * XState Machine Type Definitions
 *
 * These types define the context, events, and input for the
 * ChorusMachine (root) and AgentMachine (child) state machines.
 */

import type { AnyActorRef } from "xstate";

// ============================================================================
// Common Types
// ============================================================================

export interface ChorusConfig {
	projectRoot: string;
	maxAgents?: number;
	testCommand?: string;
	qualityCommands?: string[];
}

export interface SessionStats {
	completed: number;
	failed: number;
	inProgress: number;
}

export interface MergeQueueItem {
	taskId: string;
	branch: string;
	priority: number;
	enqueuedAt: number;
}

export interface AgentResult {
	success: boolean;
	iteration?: number;
	signal?: string;
}

// ============================================================================
// ChorusMachine Types (Root Machine)
// ============================================================================

export interface ChorusMachineContext {
	config: ChorusConfig;
	mode: "semi-auto" | "autopilot";
	agents: AnyActorRef[];
	maxAgents: number;
	mergeQueue: MergeQueueItem[];
	stats: SessionStats;
	planningState?: PlanningState;
}

export interface PlanningState {
	tasks: Task[];
	validationIssues: ValidationIssue[];
}

export interface Task {
	id: string;
	title: string;
	status: "pending" | "in_progress" | "completed" | "failed";
}

export interface ValidationIssue {
	taskId: string;
	message: string;
	severity: "error" | "warning";
}

export type ChorusMachineEvent =
	// Agent management
	| { type: "SPAWN_AGENT"; taskId: string }
	| { type: "STOP_AGENT"; agentId: string }
	| { type: "AGENT_COMPLETED"; agentId: string; result: AgentResult }
	| { type: "AGENT_FAILED"; agentId: string; error: Error }
	| { type: "AGENT_BLOCKED"; agentId: string; reason: string }
	// Orchestration control
	| { type: "PAUSE" }
	| { type: "RESUME" }
	| { type: "SET_MODE"; mode: "semi-auto" | "autopilot" }
	// Merge queue
	| { type: "ENQUEUE_MERGE"; taskId: string; branch: string }
	| { type: "MERGE_COMPLETED"; taskId: string }
	| { type: "MERGE_CONFLICT"; taskId: string; level: "trivial" | "complex" }
	// Config & Planning
	| { type: "CONFIG_COMPLETE"; config: ChorusConfig }
	| { type: "PLAN_APPROVED"; tasks: Task[] }
	| { type: "REVIEW_PASSED" }
	| { type: "NEEDS_REVISION"; issues: ValidationIssue[] }
	// Recovery
	| { type: "RESTORE"; snapshot: unknown }
	| { type: "CHECKPOINT_CREATED"; tag: string };

export interface ChorusMachineInput {
	config: ChorusConfig;
	maxAgents?: number;
}

// ============================================================================
// AgentMachine Types (Child Actor)
// ============================================================================

export interface AgentMachineContext {
	taskId: string;
	agentId: string;
	iteration: number;
	maxIterations: number;
	worktree: string;
	branch: string;
	pid?: number;
	startedAt?: number;
	lastSignal?: string;
	error?: Error;
}

export type AgentMachineEvent =
	| { type: "START" }
	| { type: "READY" }
	| { type: "ITERATION_DONE"; signal?: string }
	| { type: "QUALITY_CHECKED"; passed: boolean }
	| { type: "ALL_PASS" }
	| { type: "RETRY" }
	| { type: "BLOCKED"; reason: string }
	| { type: "COMPLETE" }
	| { type: "FAIL"; error: Error }
	| { type: "TIMEOUT" }
	| { type: "STOP" };

export interface AgentMachineInput {
	taskId: string;
	parentRef: AnyActorRef;
	maxIterations?: number;
}
