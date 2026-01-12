/**
 * Mock Orchestrator for TUI Integration Tests
 *
 * Provides mock orchestration state and callbacks for testing
 * the full TUI without actual agent processes.
 */

import type { Agent } from "../../components/AgentGrid.js";
import type { Bead } from "../../types/bead.js";

export interface MockOrchestratorState {
	mode: "semi-auto" | "autopilot";
	paused: boolean;
	agents: Agent[];
	maxAgents: number;
	selectedTaskId: string | null;
	selectedAgentIndex: number;
}

export interface MockOrchestratorCallbacks {
	onSpawnAgent?: (taskId: string) => void;
	onStopAgent?: (agentId: string) => void;
	onStopAll?: () => void;
	onPause?: () => void;
	onResume?: () => void;
	onToggleMode?: () => void;
	onSelectTask?: (taskId: string) => void;
	onSelectNext?: () => void;
	onSelectPrev?: () => void;
}

export function createMockOrchestrator(
	initialState?: Partial<MockOrchestratorState>,
	callbacks?: MockOrchestratorCallbacks,
): {
	state: MockOrchestratorState;
	callbacks: MockOrchestratorCallbacks;
	spawnAgent: (taskId: string) => Agent;
	completeAgent: (agentId: string) => void;
	failAgent: (agentId: string) => void;
} {
	const state: MockOrchestratorState = {
		mode: "semi-auto",
		paused: false,
		agents: [],
		maxAgents: 4,
		selectedTaskId: null,
		selectedAgentIndex: 0,
		...initialState,
	};

	const spawnAgent = (taskId: string): Agent => {
		const agent: Agent = {
			id: `agent-${taskId}-${Date.now()}`,
			type: "claude",
			taskId,
			status: "running",
			iteration: 1,
			maxIterations: 10,
			startTime: Date.now(),
			statusText: "Starting...",
		};
		state.agents.push(agent);
		callbacks?.onSpawnAgent?.(taskId);
		return agent;
	};

	const completeAgent = (agentId: string): void => {
		const index = state.agents.findIndex((a) => a.id === agentId);
		if (index !== -1) {
			state.agents.splice(index, 1);
		}
	};

	const failAgent = (agentId: string): void => {
		const agent = state.agents.find((a) => a.id === agentId);
		if (agent) {
			agent.status = "error";
		}
	};

	return {
		state,
		callbacks: callbacks ?? {},
		spawnAgent,
		completeAgent,
		failAgent,
	};
}

export function createMockTasks(count: number): Bead[] {
	const tasks: Bead[] = [];
	const statuses: Array<"open" | "in_progress" | "closed" | "blocked"> = [
		"open",
		"in_progress",
		"closed",
		"blocked",
	];

	for (let i = 0; i < count; i++) {
		tasks.push({
			id: `ch-test${i + 1}`,
			title: `Test Task ${i + 1}`,
			status: statuses[i % statuses.length],
			priority: (i % 3) as 0 | 1 | 2,
			type: "task",
			created: new Date().toISOString(),
			updated: new Date().toISOString(),
		});
	}

	return tasks;
}

export function createMockAgent(
	taskId: string,
	overrides?: Partial<Agent>,
): Agent {
	return {
		id: `agent-${taskId}`,
		type: "claude",
		taskId,
		status: "running",
		iteration: 1,
		maxIterations: 10,
		startTime: Date.now(),
		...overrides,
	};
}
