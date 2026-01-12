import { assign, setup } from "xstate";
import type { SprintTarget } from "../types/sprint.js";

// ============================================================================
// Types
// ============================================================================

export interface SprintRegionContext {
	target: SprintTarget | null;
	tasksCompleted: number;
	tasksFailed: number;
	startedAt: Date | null;
}

export type SprintRegionEvent =
	| { type: "START_PLANNING"; target: SprintTarget }
	| { type: "START_SPRINT" }
	| { type: "TASK_COMPLETED"; taskId: string }
	| { type: "TASK_FAILED"; taskId: string }
	| { type: "PAUSE" }
	| { type: "RESUME" }
	| { type: "CANCEL" }
	| { type: "NO_READY_TASKS" };

// ============================================================================
// Machine
// ============================================================================

export const sprintRegionMachine = setup({
	types: {
		context: {} as SprintRegionContext,
		events: {} as SprintRegionEvent,
	},
	guards: {
		isTargetReached: ({ context }) => {
			if (!context.target) return false;

			switch (context.target.type) {
				case "taskCount":
					return context.tasksCompleted >= context.target.count;
				case "duration":
					// Duration check would be done externally via timeout
					return false;
				case "untilTime":
					// Time check would be done externally
					return false;
				case "noReady":
					// noReady target never auto-completes on count
					return false;
			}
		},
	},
	actions: {
		setTarget: assign({
			target: (_, params: { target: SprintTarget }) => params.target,
		}),
		setStartTime: assign({
			startedAt: () => new Date(),
		}),
		incrementCompleted: assign({
			tasksCompleted: ({ context }) => context.tasksCompleted + 1,
		}),
		incrementFailed: assign({
			tasksFailed: ({ context }) => context.tasksFailed + 1,
		}),
		resetState: assign({
			target: () => null,
			tasksCompleted: () => 0,
			tasksFailed: () => 0,
			startedAt: () => null,
		}),
	},
}).createMachine({
	id: "sprintRegion",
	initial: "idle",
	context: {
		target: null,
		tasksCompleted: 0,
		tasksFailed: 0,
		startedAt: null,
	},
	states: {
		idle: {
			on: {
				START_PLANNING: {
					target: "planning",
					actions: {
						type: "setTarget",
						params: ({ event }) => ({ target: event.target }),
					},
				},
			},
		},
		planning: {
			on: {
				START_SPRINT: {
					target: "running",
					actions: "setStartTime",
				},
				CANCEL: {
					target: "idle",
					actions: "resetState",
				},
			},
		},
		running: {
			on: {
				TASK_COMPLETED: [
					{
						target: "completed",
						guard: ({ context }) => {
							// Pre-increment check for taskCount target
							if (context.target?.type === "taskCount") {
								return context.tasksCompleted + 1 >= context.target.count;
							}
							return false;
						},
						actions: "incrementCompleted",
					},
					{
						actions: "incrementCompleted",
					},
				],
				TASK_FAILED: {
					actions: "incrementFailed",
				},
				PAUSE: {
					target: "paused",
				},
				CANCEL: {
					target: "idle",
					actions: "resetState",
				},
				NO_READY_TASKS: {
					target: "completed",
					guard: ({ context }) => context.target?.type === "noReady",
				},
			},
		},
		paused: {
			on: {
				RESUME: {
					target: "running",
				},
				CANCEL: {
					target: "idle",
					actions: "resetState",
				},
			},
		},
		completed: {
			type: "final",
		},
	},
});
