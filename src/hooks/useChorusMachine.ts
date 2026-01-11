import { useActorRef, useSelector } from "@xstate/react";
import type { AnyActorRef, SnapshotFrom } from "xstate";
import {
	type ChorusConfig,
	type ChorusMachineContext,
	chorusMachine,
} from "../machines/chorus.machine.js";

export interface UseChorusMachineOptions {
	config: ChorusConfig;
	maxAgents?: number;
}

export interface UseChorusMachineReturn {
	snapshot: SnapshotFrom<typeof chorusMachine>;
	send: (event: Parameters<AnyActorRef["send"]>[0]) => void;
	actorRef: AnyActorRef;
	// Selectors
	agents: AnyActorRef[];
	mode: "semi-auto" | "autopilot";
	mergeQueue: ChorusMachineContext["mergeQueue"];
	isRunning: boolean;
	isPaused: boolean;
	// Actions
	spawnAgent: (taskId: string) => void;
	stopAgent: (agentId: string) => void;
	pause: () => void;
	resume: () => void;
	setMode: (mode: "semi-auto" | "autopilot") => void;
}

export function useChorusMachine(
	options: UseChorusMachineOptions,
): UseChorusMachineReturn {
	const actorRef = useActorRef(chorusMachine, {
		input: {
			config: options.config,
			maxAgents: options.maxAgents,
		},
	});

	const snapshot = useSelector(actorRef, (s) => s);
	const agents = useSelector(actorRef, (s) => s.context.agents);
	const mode = useSelector(actorRef, (s) => s.context.mode);
	const mergeQueue = useSelector(actorRef, (s) => s.context.mergeQueue);
	const isRunning = useSelector(actorRef, (s) =>
		s.matches({ orchestration: "running" }),
	);
	const isPaused = useSelector(actorRef, (s) =>
		s.matches({ orchestration: "paused" }),
	);

	const send = actorRef.send.bind(actorRef);

	const spawnAgent = (taskId: string) => {
		send({ type: "SPAWN_AGENT", taskId });
	};

	const stopAgent = (agentId: string) => {
		send({ type: "STOP_AGENT", agentId });
	};

	const pause = () => {
		send({ type: "PAUSE" });
	};

	const resume = () => {
		send({ type: "RESUME" });
	};

	const setMode = (newMode: "semi-auto" | "autopilot") => {
		send({ type: "SET_MODE", mode: newMode });
	};

	return {
		snapshot,
		send,
		actorRef,
		agents,
		mode,
		mergeQueue,
		isRunning,
		isPaused,
		spawnAgent,
		stopAgent,
		pause,
		resume,
		setMode,
	};
}
