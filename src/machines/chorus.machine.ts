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
	// Orchestration context
	activeTaskIds: string[];
	activeAgentIds: string[];
	acquiredSlots: number;
	// TUI context
	selectedTaskId: string | null;
	selectedAgentId: string | null;
	taskIndex: number;
	agentIndex: number;
}

export interface ChorusMachineInput {
	config: ChorusConfig;
	maxAgents?: number;
}

export type ChorusMachineEvent =
	// App-level transitions
	| { type: "CONFIG_COMPLETE"; config: ChorusConfig }
	| { type: "FORCE_INIT" }
	| { type: "INIT_REQUIRED" }
	| { type: "FORCE_PLANNING" }
	| { type: "RESTORE_STATE"; state: { status: string; chosenMode?: string } }
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
	| { type: "STOP_AGENT"; agentId: string; taskId: string }
	| {
			type: "AGENT_COMPLETED";
			agentId: string;
			taskId: string;
	  }
	| {
			type: "AGENT_FAILED";
			agentId: string;
			taskId: string;
	  }
	| { type: "STOP_ALL"; preserveChanges?: boolean }
	// TUI Focus
	| { type: "FOCUS_TASK_PANEL" }
	| { type: "FOCUS_AGENT_GRID" }
	| { type: "TOGGLE_FOCUS" }
	// TUI Modals
	| { type: "OPEN_HELP" }
	| { type: "OPEN_INTERVENTION" }
	| { type: "OPEN_LOGS"; agentId: string }
	| { type: "OPEN_LEARNINGS" }
	| { type: "OPEN_CONFIRM"; action: string }
	| { type: "OPEN_SETTINGS" }
	| { type: "CLOSE_MODAL" }
	// TUI Selection
	| { type: "SELECT_TASK"; taskId: string }
	| { type: "SELECT_AGENT"; agentId: string }
	| { type: "SELECT_NEXT" }
	| { type: "SELECT_PREV" }
	| { type: "CLEAR_SELECTION" };

// ============================================================================
// Machine
// ============================================================================

export const chorusMachine = setup({
	types: {
		context: {} as ChorusMachineContext,
		input: {} as ChorusMachineInput,
		events: {} as ChorusMachineEvent,
	},
	guards: {
		hasAvailableSlot: ({ context }) =>
			context.acquiredSlots < context.maxAgents,
		noActiveTasks: ({ context }) => context.activeTaskIds.length === 0,
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
		// Slot management actions
		claimSlot: assign({
			acquiredSlots: ({ context }) => context.acquiredSlots + 1,
		}),
		releaseSlot: assign({
			acquiredSlots: ({ context }) => Math.max(0, context.acquiredSlots - 1),
		}),
		releaseAllSlots: assign({
			acquiredSlots: () => 0,
		}),
		// Task tracking actions
		trackActiveTask: assign({
			activeTaskIds: (
				{ context },
				params: { taskId: string; agentId: string },
			) => [...context.activeTaskIds, params.taskId],
			activeAgentIds: (
				{ context },
				params: { taskId: string; agentId: string },
			) => [...context.activeAgentIds, params.agentId],
		}),
		removeActiveTask: assign({
			activeTaskIds: (
				{ context },
				params: { taskId: string; agentId: string },
			) => context.activeTaskIds.filter((id) => id !== params.taskId),
			activeAgentIds: (
				{ context },
				params: { taskId: string; agentId: string },
			) => context.activeAgentIds.filter((id) => id !== params.agentId),
		}),
		clearActiveTasks: assign({
			activeTaskIds: () => [],
			activeAgentIds: () => [],
		}),
		selectTask: assign({
			selectedTaskId: (_, params: { taskId: string }) => params.taskId,
		}),
		selectAgent: assign({
			selectedAgentId: (_, params: { agentId: string }) => params.agentId,
		}),
		selectNext: assign({
			taskIndex: ({ context }) => context.taskIndex + 1,
		}),
		selectPrev: assign({
			taskIndex: ({ context }) => Math.max(0, context.taskIndex - 1),
		}),
		clearSelection: assign({
			selectedTaskId: () => null,
			selectedAgentId: () => null,
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
		// Orchestration context
		activeTaskIds: [],
		activeAgentIds: [],
		acquiredSlots: 0,
		// TUI context
		selectedTaskId: null,
		selectedAgentId: null,
		taskIndex: 0,
		agentIndex: 0,
	}),
	states: {
		// App-level state (sequential)
		app: {
			initial: "init",
			on: {
				// Global app transitions (can happen from any app state)
				FORCE_INIT: ".init",
				INIT_REQUIRED: ".init",
				FORCE_PLANNING: ".planning",
				// SET_MODE transitions to implementation (used by --mode CLI flag)
				SET_MODE: ".implementation",
				RESTORE_STATE: [
					{
						target: ".implementation",
						guard: ({ event }) =>
							event.state.status === "ready" ||
							event.state.status === "implementation",
					},
					{
						target: ".review",
						guard: ({ event }) => event.state.status === "reviewing",
					},
					{
						target: ".planning",
					},
				],
			},
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
						SPAWN_AGENT: {
							target: "running",
							guard: "hasAvailableSlot",
							actions: [
								{ type: "claimSlot" },
								{
									type: "spawnAgent",
									params: ({ event }) => ({ taskId: event.taskId }),
								},
								{
									type: "trackActiveTask",
									params: ({ event }) => ({
										taskId: event.taskId,
										agentId: `agent-${event.taskId}`,
									}),
								},
							],
						},
						RESUME: "running",
					},
				},
				running: {
					on: {
						SPAWN_AGENT: {
							guard: "hasAvailableSlot",
							actions: [
								{ type: "claimSlot" },
								{
									type: "spawnAgent",
									params: ({ event }) => ({ taskId: event.taskId }),
								},
								{
									type: "trackActiveTask",
									params: ({ event }) => ({
										taskId: event.taskId,
										agentId: `agent-${event.taskId}`,
									}),
								},
							],
						},
						AGENT_COMPLETED: {
							target: "checkIfIdle",
							actions: [
								{ type: "releaseSlot" },
								{
									type: "removeActiveTask",
									params: ({ event }) => ({
										taskId: event.taskId,
										agentId: event.agentId,
									}),
								},
							],
						},
						AGENT_FAILED: {
							target: "checkIfIdle",
							actions: [
								{ type: "releaseSlot" },
								{
									type: "removeActiveTask",
									params: ({ event }) => ({
										taskId: event.taskId,
										agentId: event.agentId,
									}),
								},
							],
						},
						STOP_AGENT: {
							target: "checkIfIdle",
							actions: [
								{
									type: "stopAgent",
									params: ({ event }) => ({ agentId: event.agentId }),
								},
								{ type: "releaseSlot" },
								{
									type: "removeActiveTask",
									params: ({ event }) => ({
										taskId: event.taskId,
										agentId: event.agentId,
									}),
								},
							],
						},
						STOP_ALL: {
							target: "idle",
							actions: [
								{ type: "releaseAllSlots" },
								{ type: "clearActiveTasks" },
							],
						},
						PAUSE: "paused",
					},
				},
				paused: {
					on: {
						RESUME: "running",
					},
				},
				checkIfIdle: {
					always: [
						{ target: "idle", guard: "noActiveTasks" },
						{ target: "running" },
					],
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
		// TUI region (parallel)
		tui: {
			type: "parallel",
			states: {
				focus: {
					initial: "agentGrid",
					states: {
						agentGrid: {
							on: {
								TOGGLE_FOCUS: "taskPanel",
								FOCUS_TASK_PANEL: "taskPanel",
							},
						},
						taskPanel: {
							on: {
								TOGGLE_FOCUS: "agentGrid",
								FOCUS_AGENT_GRID: "agentGrid",
							},
						},
					},
				},
				modal: {
					initial: "closed",
					states: {
						closed: {
							on: {
								OPEN_HELP: "help",
								OPEN_INTERVENTION: "intervention",
								OPEN_LEARNINGS: "learnings",
								OPEN_SETTINGS: "settings",
								OPEN_CONFIRM: "confirm",
								OPEN_LOGS: "logs",
								SELECT_NEXT: {
									actions: "selectNext",
								},
								SELECT_PREV: {
									actions: "selectPrev",
								},
							},
						},
						help: {
							on: {
								CLOSE_MODAL: "closed",
								OPEN_INTERVENTION: "intervention",
								OPEN_LEARNINGS: "learnings",
								OPEN_SETTINGS: "settings",
							},
						},
						intervention: {
							on: {
								CLOSE_MODAL: "closed",
								OPEN_HELP: "help",
								OPEN_LEARNINGS: "learnings",
								OPEN_SETTINGS: "settings",
							},
						},
						learnings: {
							on: {
								CLOSE_MODAL: "closed",
								OPEN_HELP: "help",
								OPEN_INTERVENTION: "intervention",
								OPEN_SETTINGS: "settings",
							},
						},
						settings: {
							on: {
								CLOSE_MODAL: "closed",
								OPEN_HELP: "help",
								OPEN_INTERVENTION: "intervention",
								OPEN_LEARNINGS: "learnings",
							},
						},
						confirm: {
							on: {
								CLOSE_MODAL: "closed",
							},
						},
						logs: {
							on: {
								CLOSE_MODAL: "closed",
								OPEN_HELP: "help",
								OPEN_INTERVENTION: "intervention",
							},
						},
					},
				},
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
		// Note: SPAWN_AGENT and STOP_AGENT are handled in orchestration region
		SELECT_TASK: {
			actions: {
				type: "selectTask",
				params: ({ event }) => ({ taskId: event.taskId }),
			},
		},
		SELECT_AGENT: {
			actions: {
				type: "selectAgent",
				params: ({ event }) => ({ agentId: event.agentId }),
			},
		},
		CLEAR_SELECTION: {
			actions: "clearSelection",
		},
	},
});
