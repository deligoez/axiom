import type { AnyActorRef } from "xstate";
import { assign, setup } from "xstate";

// ============================================================================
// Types
// ============================================================================

export interface RalphLoopContext {
	parentRef: AnyActorRef;
	consecutiveErrors: number;
	errorThreshold: number;
	lastCommitTimes: Map<string, number>;
	stuckThreshold: number;
	minDiskSpaceMB: number;
	tasksAssigned: number;
	tasksCompleted: number;
	startedAt: number | null;
}

export interface RalphLoopInput {
	parentRef: AnyActorRef;
	errorThreshold?: number;
	stuckThreshold?: number;
	minDiskSpaceMB?: number;
}

export type RalphLoopEvent =
	| { type: "START" }
	| { type: "STOP" }
	| { type: "PAUSE" }
	| { type: "RESUME" }
	| { type: "TASK_ASSIGNED"; taskId: string }
	| { type: "TASK_COMPLETED"; taskId: string }
	| { type: "ERROR"; error: Error }
	| { type: "AGENT_COMMITTED"; agentId: string; commitHash: string }
	| { type: "STUCK_AGENT_DETECTED"; agentId: string }
	| { type: "DISK_FULL" }
	| { type: "DISK_CLEARED" };

// ============================================================================
// Machine
// ============================================================================

export const ralphLoopMachine = setup({
	types: {
		context: {} as RalphLoopContext,
		input: {} as RalphLoopInput,
		events: {} as RalphLoopEvent,
	},
	actions: {
		incrementErrors: assign({
			consecutiveErrors: ({ context }) => context.consecutiveErrors + 1,
		}),
		resetErrors: assign({
			consecutiveErrors: () => 0,
		}),
		recordTaskAssigned: assign({
			tasksAssigned: ({ context }) => context.tasksAssigned + 1,
		}),
		recordTaskCompleted: assign({
			tasksCompleted: ({ context }) => context.tasksCompleted + 1,
		}),
		recordCommit: assign({
			lastCommitTimes: ({ context, event }) => {
				if (event.type !== "AGENT_COMMITTED") return context.lastCommitTimes;
				const newMap = new Map(context.lastCommitTimes);
				newMap.set(event.agentId, Date.now());
				return newMap;
			},
		}),
		setStartedAt: assign({
			startedAt: () => Date.now(),
		}),
		notifyParentHalted: ({ context }) => {
			context.parentRef.send({
				type: "RALPHLOOP_HALTED",
				reason: "errorThreshold",
			});
		},
		notifyParentStuck: ({ context }) => {
			context.parentRef.send({ type: "RALPHLOOP_STUCK" });
		},
		notifyParentDiskFull: ({ context }) => {
			context.parentRef.send({ type: "RALPHLOOP_DISK_FULL" });
		},
	},
	guards: {
		hasReachedErrorThreshold: ({ context }) =>
			context.consecutiveErrors >= context.errorThreshold,
	},
}).createMachine({
	id: "ralphLoop",
	initial: "idle",
	context: ({ input }) => ({
		parentRef: input.parentRef,
		consecutiveErrors: 0,
		errorThreshold: input.errorThreshold ?? 3,
		lastCommitTimes: new Map(),
		stuckThreshold: input.stuckThreshold ?? 300000,
		minDiskSpaceMB: input.minDiskSpaceMB ?? 500,
		tasksAssigned: 0,
		tasksCompleted: 0,
		startedAt: null,
	}),
	states: {
		idle: {
			on: {
				START: {
					target: "running",
					actions: "setStartedAt",
				},
			},
		},
		running: {
			on: {
				STOP: "idle",
				PAUSE: "paused",
				TASK_ASSIGNED: {
					actions: "recordTaskAssigned",
				},
				TASK_COMPLETED: {
					actions: ["recordTaskCompleted", "resetErrors"],
				},
				AGENT_COMMITTED: {
					actions: "recordCommit",
				},
				ERROR: [
					{
						guard: ({ context }) =>
							context.consecutiveErrors + 1 >= context.errorThreshold,
						target: "errorHalt",
						actions: "incrementErrors",
					},
					{
						actions: "incrementErrors",
					},
				],
				STUCK_AGENT_DETECTED: "stuck",
				DISK_FULL: "diskFull",
			},
		},
		paused: {
			on: {
				STOP: "idle",
				RESUME: "running",
			},
		},
		errorHalt: {
			entry: "notifyParentHalted",
			on: {
				STOP: "idle",
			},
		},
		stuck: {
			entry: "notifyParentStuck",
			on: {
				STOP: "idle",
			},
		},
		diskFull: {
			entry: "notifyParentDiskFull",
			on: {
				STOP: "idle",
				DISK_CLEARED: "running",
			},
		},
	},
});
