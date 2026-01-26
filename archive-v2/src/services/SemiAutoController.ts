import type { AnyActorRef, SnapshotFrom } from "xstate";
import type { chorusMachine } from "../machines/chorus.machine.js";

export interface SlotError {
	type: "NO_SLOTS_AVAILABLE";
}

export interface Result<T, E> {
	isOk(): boolean;
	isErr(): boolean;
	value?: T;
	error?: E;
}

function ok<T>(value: T): Result<T, never> {
	return {
		isOk: () => true,
		isErr: () => false,
		value,
	};
}

function err<E>(error: E): Result<never, E> {
	return {
		isOk: () => false,
		isErr: () => true,
		error,
	};
}

export interface SemiAutoStatus {
	activeTaskIds: string[];
	activeAgentIds: string[];
	acquiredSlots: number;
}

type ChorusSnapshot = SnapshotFrom<typeof chorusMachine>;

/**
 * Thin wrapper for machine interaction in semi-auto mode.
 * Most logic lives in the XState machine (guards, actions, transitions).
 */
export class SemiAutoController {
	constructor(private actorRef: AnyActorRef) {}

	/**
	 * Start a task by spawning an agent.
	 * Returns error if no slots are available.
	 */
	startTask(taskId: string): Result<void, SlotError> {
		const snapshot = this.actorRef.getSnapshot() as ChorusSnapshot;

		// Check slot availability via context
		if (snapshot.context.acquiredSlots >= snapshot.context.maxAgents) {
			return err({ type: "NO_SLOTS_AVAILABLE" });
		}

		// Send event to machine
		this.actorRef.send({ type: "SPAWN_AGENT", taskId });
		return ok(undefined);
	}

	/**
	 * Cancel a specific task by stopping its agent.
	 */
	cancelTask(taskId: string, agentId: string): void {
		this.actorRef.send({ type: "STOP_AGENT", agentId, taskId });
	}

	/**
	 * Cancel all active tasks.
	 */
	cancelAll(options?: { preserveChanges?: boolean }): void {
		this.actorRef.send({
			type: "STOP_ALL",
			preserveChanges: options?.preserveChanges,
		});
	}

	/**
	 * Get the current semi-auto status.
	 */
	getStatus(): SemiAutoStatus {
		const snapshot = this.actorRef.getSnapshot() as ChorusSnapshot;
		return {
			activeTaskIds: snapshot.context.activeTaskIds,
			activeAgentIds: snapshot.context.activeAgentIds,
			acquiredSlots: snapshot.context.acquiredSlots,
		};
	}

	/**
	 * Check if the orchestration is idle (no active tasks).
	 */
	isIdle(): boolean {
		const snapshot = this.actorRef.getSnapshot() as ChorusSnapshot;
		return (
			snapshot.matches({ orchestration: "idle" }) ||
			snapshot.context.activeTaskIds.length === 0
		);
	}

	/**
	 * Get the count of active tasks.
	 */
	getActiveTaskCount(): number {
		const snapshot = this.actorRef.getSnapshot() as ChorusSnapshot;
		return snapshot.context.activeTaskIds.length;
	}
}
