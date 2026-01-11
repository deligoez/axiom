import type { AnyActorRef } from "xstate";
import { assign, setup } from "xstate";

// ============================================================================
// Types
// ============================================================================

export interface ChorusConfig {
	projectRoot: string;
	maxAgents?: number;
}

export interface SessionStats {
	completed: number;
	failed: number;
	inProgress: number;
}

export interface MergeQueueItem {
	taskId: string;
	branch: string;
	enqueuedAt: number;
}

export interface ChorusMachineContext {
	config: ChorusConfig;
	mode: "semi-auto" | "autopilot";
	agents: AnyActorRef[];
	maxAgents: number;
	mergeQueue: MergeQueueItem[];
	stats: SessionStats;
}

export interface ChorusMachineInput {
	config: ChorusConfig;
	maxAgents?: number;
}

export type ChorusMachineEvent =
	// App-level transitions
	| { type: "CONFIG_COMPLETE"; config: ChorusConfig }
	| { type: "PLAN_APPROVED" }
	| { type: "REVIEW_PASSED" }
	| { type: "NEEDS_REVISION" }
	| { type: "TRIGGER_PLANNING" }
	// Orchestration control
	| { type: "PAUSE" }
	| { type: "RESUME" }
	| { type: "SET_MODE"; mode: "semi-auto" | "autopilot" }
	// Agent management
	| { type: "SPAWN_AGENT"; taskId: string }
	| { type: "STOP_AGENT"; agentId: string };

// ============================================================================
// Machine
// ============================================================================

export const chorusMachine = setup({
	types: {
		context: {} as ChorusMachineContext,
		input: {} as ChorusMachineInput,
		events: {} as ChorusMachineEvent,
	},
	actions: {
		setMode: assign({
			mode: (_, params: { mode: "semi-auto" | "autopilot" }) => params.mode,
		}),
		updateConfig: assign({
			config: (_, params: { config: ChorusConfig }) => params.config,
		}),
		spawnAgent: assign({
			agents: ({ context }, params: { taskId: string }) => {
				// In real implementation, this would spawn an actual actor
				// For now, we add a placeholder
				const mockAgent = { id: `agent-${params.taskId}` } as AnyActorRef;
				return [...context.agents, mockAgent];
			},
			stats: ({ context }) => ({
				...context.stats,
				inProgress: context.stats.inProgress + 1,
			}),
		}),
		stopAgent: assign({
			agents: ({ context }, params: { agentId: string }) =>
				context.agents.filter((a) => a.id !== params.agentId),
			stats: ({ context }) => ({
				...context.stats,
				inProgress: Math.max(0, context.stats.inProgress - 1),
			}),
		}),
	},
}).createMachine({
	id: "chorus",
	type: "parallel",
	context: ({ input }) => ({
		config: input.config,
		mode: "semi-auto",
		agents: [],
		maxAgents: input.maxAgents ?? 3,
		mergeQueue: [],
		stats: { completed: 0, failed: 0, inProgress: 0 },
	}),
	states: {
		// App-level state (sequential)
		app: {
			initial: "init",
			states: {
				init: {
					on: {
						CONFIG_COMPLETE: {
							target: "planning",
							actions: {
								type: "updateConfig",
								params: ({ event }) => ({ config: event.config }),
							},
						},
					},
				},
				planning: {
					on: {
						PLAN_APPROVED: "review",
					},
				},
				review: {
					on: {
						REVIEW_PASSED: "implementation",
						NEEDS_REVISION: "planning",
					},
				},
				implementation: {
					on: {
						TRIGGER_PLANNING: "planning",
					},
				},
			},
		},
		// Orchestration region (parallel)
		orchestration: {
			initial: "idle",
			states: {
				idle: {
					on: {
						RESUME: "running",
					},
				},
				running: {
					on: {
						PAUSE: "paused",
					},
				},
				paused: {
					on: {
						RESUME: "running",
					},
				},
			},
		},
		// Merge queue region (parallel)
		mergeQueue: {
			initial: "empty",
			states: {
				empty: {},
				pending: {},
				processing: {},
				conflict: {},
			},
		},
		// Monitoring region (parallel)
		monitoring: {
			initial: "active",
			states: {
				active: {},
				degraded: {},
			},
		},
	},
	on: {
		SET_MODE: {
			actions: {
				type: "setMode",
				params: ({ event }) => ({ mode: event.mode }),
			},
		},
		SPAWN_AGENT: {
			actions: {
				type: "spawnAgent",
				params: ({ event }) => ({ taskId: event.taskId }),
			},
		},
		STOP_AGENT: {
			actions: {
				type: "stopAgent",
				params: ({ event }) => ({ agentId: event.agentId }),
			},
		},
	},
});
