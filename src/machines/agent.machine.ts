import type { AnyActorRef } from "xstate";
import { assign, setup } from "xstate";
import {
	type AgentIdentity,
	createAgentIdentity,
	type PersonaName,
} from "../types/persona.js";

export interface AgentMachineInput {
	taskId: string;
	parentRef: AnyActorRef;
	maxIterations?: number;
	/** Persona for this agent */
	persona?: PersonaName;
	/** Worker number for multi-instance personas (e.g., chip-001) */
	workerNumber?: number;
}

export interface AgentMachineContext {
	taskId: string;
	parentRef: AnyActorRef;
	iteration: number;
	maxIterations: number;
	identity: AgentIdentity;
	worktree: string;
	branch: string;
	error?: Error;
}

export type AgentMachineEvent =
	| { type: "START" }
	| { type: "READY" }
	| { type: "ITERATION_DONE" }
	| { type: "ALL_PASS" }
	| { type: "RETRY" }
	| { type: "BLOCKED"; reason: string }
	| { type: "FAIL"; error: Error }
	| { type: "STOP" };

export const agentMachine = setup({
	types: {
		context: {} as AgentMachineContext,
		input: {} as AgentMachineInput,
		events: {} as AgentMachineEvent,
	},
	actions: {
		incrementIteration: assign({
			iteration: ({ context }) => context.iteration + 1,
		}),
		setError: assign({
			error: (_, params: { error: Error }) => params.error,
		}),
	},
}).createMachine({
	id: "agent",
	initial: "idle",
	context: ({ input }) => ({
		taskId: input.taskId,
		parentRef: input.parentRef,
		iteration: 0,
		maxIterations: input.maxIterations ?? 5,
		identity: createAgentIdentity(input.persona ?? "chip", input.workerNumber),
		worktree: `/worktrees/${input.taskId}`,
		branch: `feat/${input.taskId}`,
	}),
	states: {
		idle: {
			on: {
				START: "preparing",
			},
		},
		preparing: {
			on: {
				READY: "executing",
			},
		},
		executing: {
			initial: "iteration",
			states: {
				iteration: {
					on: {
						ITERATION_DONE: "checkQuality",
					},
				},
				checkQuality: {
					on: {
						ALL_PASS: "#agent.completed",
						RETRY: {
							target: "iteration",
							actions: "incrementIteration",
						},
					},
				},
			},
			on: {
				BLOCKED: "blocked",
				FAIL: {
					target: "failed",
					actions: {
						type: "setError",
						params: ({ event }) => ({ error: event.error }),
					},
				},
			},
		},
		blocked: {
			on: {
				READY: "executing",
			},
		},
		completed: {
			type: "final",
		},
		failed: {
			type: "final",
		},
	},
});
