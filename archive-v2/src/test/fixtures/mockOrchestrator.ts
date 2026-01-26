/**
 * Mock Orchestrator for TUI Integration Tests
 *
 * Provides mock agent helpers for testing
 * the full TUI without actual agent processes.
 */

import type { Agent } from "../../components/AgentGrid.js";

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
