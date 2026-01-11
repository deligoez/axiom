import { useCallback, useEffect, useRef } from "react";
import { AgentManager } from "../services/AgentManager.js";
import { useAgentStore } from "../stores/agentStore.js";
import type { Agent, AgentConfig } from "../types/agent.js";

export interface UseAgentManagerReturn {
	spawn: (config: AgentConfig) => Promise<Agent>;
	kill: (id: string) => Promise<void>;
	killAll: () => Promise<void>;
}

export function useAgentManager(): UseAgentManagerReturn {
	const managerRef = useRef<AgentManager | null>(null);
	const addAgent = useAgentStore((state) => state.addAgent);
	const updateAgent = useAgentStore((state) => state.updateAgent);
	const appendOutput = useAgentStore((state) => state.appendOutput);

	// Initialize manager once
	if (!managerRef.current) {
		managerRef.current = new AgentManager();
	}

	const manager = managerRef.current;

	// Setup event listeners
	useEffect(() => {
		const handleOutput = (id: string, line: string) => {
			appendOutput(id, line);
		};

		const handleExit = (id: string, code: number | null) => {
			updateAgent(id, {
				status: "stopped",
				exitCode: code ?? undefined,
			});
		};

		const handleError = (id: string, _error: Error) => {
			updateAgent(id, { status: "error" });
		};

		manager.on("output", handleOutput);
		manager.on("exit", handleExit);
		manager.on("error", handleError);

		return () => {
			manager.off("output", handleOutput);
			manager.off("exit", handleExit);
			manager.off("error", handleError);
			// Kill all agents on cleanup
			manager.killAll();
		};
	}, [manager, appendOutput, updateAgent]);

	const spawn = useCallback(
		async (config: AgentConfig): Promise<Agent> => {
			const agent = await manager.spawn(config);
			addAgent(agent);
			return agent;
		},
		[manager, addAgent],
	);

	const kill = useCallback(
		async (id: string): Promise<void> => {
			await manager.kill(id);
		},
		[manager],
	);

	const killAll = useCallback(async (): Promise<void> => {
		await manager.killAll();
	}, [manager]);

	return { spawn, kill, killAll };
}
