import type { AnyActorRef, SnapshotFrom } from "xstate";
import type { chorusMachine } from "../machines/chorus.machine.js";

type ChorusMachineContext = SnapshotFrom<typeof chorusMachine>["context"];
type Listener = (state: ChorusMachineContext) => void;

export interface XStateAdapter {
	getState: () => ChorusMachineContext;
	subscribe: (listener: Listener) => () => void;
}

/**
 * Creates a Zustand-like adapter for XState machines.
 * This is a temporary bridge for gradual migration.
 */
export function createXStateAdapter(actor: AnyActorRef): XStateAdapter {
	const getState = (): ChorusMachineContext => {
		return actor.getSnapshot().context;
	};

	const subscribe = (listener: Listener): (() => void) => {
		const subscription = actor.subscribe((snapshot) => {
			listener(snapshot.context);
		});
		return () => subscription.unsubscribe();
	};

	return {
		getState,
		subscribe,
	};
}
