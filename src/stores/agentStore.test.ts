import { beforeEach, describe, expect, it } from "vitest";
import { useAgentStore } from "./agentStore.js";

describe("agentStore", () => {
	beforeEach(() => {
		// Reset store between tests
		useAgentStore.setState({
			agents: [],
			selectedAgentId: null,
		});
	});

	it("starts with empty agents", () => {
		const { agents } = useAgentStore.getState();
		expect(agents).toEqual([]);
	});

	it("adds an agent", () => {
		const { addAgent } = useAgentStore.getState();

		addAgent({
			id: "agent-1",
			name: "test-agent",
			status: "idle",
			output: [],
			createdAt: new Date(),
		});

		const { agents } = useAgentStore.getState();
		expect(agents).toHaveLength(1);
		expect(agents[0].name).toBe("test-agent");
	});

	it("updates agent status", () => {
		const { addAgent, updateAgent } = useAgentStore.getState();

		addAgent({
			id: "agent-1",
			name: "test",
			status: "idle",
			output: [],
			createdAt: new Date(),
		});

		updateAgent("agent-1", { status: "running" });

		const { agents } = useAgentStore.getState();
		expect(agents[0].status).toBe("running");
	});

	it("appends output to agent", () => {
		const { addAgent, appendOutput } = useAgentStore.getState();

		addAgent({
			id: "agent-1",
			name: "test",
			status: "running",
			output: [],
			createdAt: new Date(),
		});

		appendOutput("agent-1", "line 1");
		appendOutput("agent-1", "line 2");

		const { agents } = useAgentStore.getState();
		expect(agents[0].output).toEqual(["line 1", "line 2"]);
	});

	it("removes an agent", () => {
		const { addAgent, removeAgent } = useAgentStore.getState();

		addAgent({
			id: "agent-1",
			name: "test",
			status: "idle",
			output: [],
			createdAt: new Date(),
		});

		removeAgent("agent-1");

		const { agents } = useAgentStore.getState();
		expect(agents).toHaveLength(0);
	});

	it("selects an agent", () => {
		const { addAgent, selectAgent } = useAgentStore.getState();

		addAgent({
			id: "agent-1",
			name: "test",
			status: "idle",
			output: [],
			createdAt: new Date(),
		});

		selectAgent("agent-1");

		const { selectedAgentId } = useAgentStore.getState();
		expect(selectedAgentId).toBe("agent-1");
	});

	it("gets selected agent", () => {
		const { addAgent, selectAgent, getSelectedAgent } =
			useAgentStore.getState();

		addAgent({
			id: "agent-1",
			name: "selected-agent",
			status: "idle",
			output: [],
			createdAt: new Date(),
		});

		selectAgent("agent-1");

		const selected = getSelectedAgent();
		expect(selected?.name).toBe("selected-agent");
	});

	// Edge case tests

	it("updateAgent with non-existent id is a no-op", () => {
		const { addAgent, updateAgent } = useAgentStore.getState();

		addAgent({
			id: "agent-1",
			name: "test",
			status: "idle",
			output: [],
			createdAt: new Date(),
		});

		// Should not throw, should not change anything
		updateAgent("non-existent", { status: "running" });

		const { agents } = useAgentStore.getState();
		expect(agents).toHaveLength(1);
		expect(agents[0].status).toBe("idle");
	});

	it("appendOutput with non-existent id is a no-op", () => {
		const { addAgent, appendOutput } = useAgentStore.getState();

		addAgent({
			id: "agent-1",
			name: "test",
			status: "idle",
			output: ["existing"],
			createdAt: new Date(),
		});

		// Should not throw
		appendOutput("non-existent", "new line");

		const { agents } = useAgentStore.getState();
		expect(agents[0].output).toEqual(["existing"]);
	});

	it("removeAgent clears selection when selected agent is removed", () => {
		const { addAgent, selectAgent, removeAgent } = useAgentStore.getState();

		addAgent({
			id: "agent-1",
			name: "test",
			status: "idle",
			output: [],
			createdAt: new Date(),
		});

		selectAgent("agent-1");
		expect(useAgentStore.getState().selectedAgentId).toBe("agent-1");

		removeAgent("agent-1");

		expect(useAgentStore.getState().selectedAgentId).toBeNull();
	});

	it("removeAgent preserves selection when different agent is removed", () => {
		const { addAgent, selectAgent, removeAgent } = useAgentStore.getState();

		addAgent({
			id: "agent-1",
			name: "keep",
			status: "idle",
			output: [],
			createdAt: new Date(),
		});

		addAgent({
			id: "agent-2",
			name: "remove",
			status: "idle",
			output: [],
			createdAt: new Date(),
		});

		selectAgent("agent-1");
		removeAgent("agent-2");

		expect(useAgentStore.getState().selectedAgentId).toBe("agent-1");
	});

	it("selectAgent with null deselects", () => {
		const { addAgent, selectAgent } = useAgentStore.getState();

		addAgent({
			id: "agent-1",
			name: "test",
			status: "idle",
			output: [],
			createdAt: new Date(),
		});

		selectAgent("agent-1");
		expect(useAgentStore.getState().selectedAgentId).toBe("agent-1");

		selectAgent(null);
		expect(useAgentStore.getState().selectedAgentId).toBeNull();
	});

	it("getSelectedAgent returns undefined when nothing selected", () => {
		const { getSelectedAgent } = useAgentStore.getState();

		const selected = getSelectedAgent();
		expect(selected).toBeUndefined();
	});

	it("getSelectedAgent returns undefined when selected id does not exist", () => {
		const { getSelectedAgent } = useAgentStore.getState();

		// Force an invalid selection (edge case)
		useAgentStore.setState({ selectedAgentId: "non-existent" });

		const selected = getSelectedAgent();
		expect(selected).toBeUndefined();
	});

	// Task linking tests (F09)
	it("getAgentByTaskId returns Agent when agent with taskId exists", () => {
		// Arrange
		const { addAgent, getAgentByTaskId } = useAgentStore.getState();
		addAgent({
			id: "agent-1",
			name: "test",
			status: "running",
			output: [],
			createdAt: new Date(),
			taskId: "ch-abc",
			agentType: "claude",
		});

		// Act
		const agent = getAgentByTaskId("ch-abc");

		// Assert
		expect(agent).not.toBeNull();
		expect(agent?.taskId).toBe("ch-abc");
	});

	it("getAgentByTaskId returns null when no agent has that taskId", () => {
		// Arrange
		const { addAgent, getAgentByTaskId } = useAgentStore.getState();
		addAgent({
			id: "agent-1",
			name: "test",
			status: "running",
			output: [],
			createdAt: new Date(),
			taskId: "ch-abc",
		});

		// Act
		const agent = getAgentByTaskId("ch-xyz");

		// Assert
		expect(agent).toBeNull();
	});

	it("getAgentsByType returns array of agents with matching agentType", () => {
		// Arrange
		const { addAgent, getAgentsByType } = useAgentStore.getState();
		addAgent({
			id: "agent-1",
			name: "claude-1",
			status: "running",
			output: [],
			createdAt: new Date(),
			agentType: "claude",
		});
		addAgent({
			id: "agent-2",
			name: "claude-2",
			status: "running",
			output: [],
			createdAt: new Date(),
			agentType: "claude",
		});
		addAgent({
			id: "agent-3",
			name: "aider-1",
			status: "running",
			output: [],
			createdAt: new Date(),
			agentType: "aider",
		});

		// Act
		const claudeAgents = getAgentsByType("claude");

		// Assert
		expect(claudeAgents).toHaveLength(2);
		expect(claudeAgents[0].agentType).toBe("claude");
		expect(claudeAgents[1].agentType).toBe("claude");
	});

	it("getAgentsByType returns empty array when no agents of that type exist", () => {
		// Arrange
		const { addAgent, getAgentsByType } = useAgentStore.getState();
		addAgent({
			id: "agent-1",
			name: "claude-1",
			status: "running",
			output: [],
			createdAt: new Date(),
			agentType: "claude",
		});

		// Act
		const aiderAgents = getAgentsByType("aider");

		// Assert
		expect(aiderAgents).toEqual([]);
	});

	it("incrementIteration increments agent iteration by 1", () => {
		// Arrange
		const { addAgent, incrementIteration } = useAgentStore.getState();
		addAgent({
			id: "agent-1",
			name: "test",
			status: "running",
			output: [],
			createdAt: new Date(),
			taskId: "ch-abc",
			iteration: 1,
		});

		// Act
		incrementIteration("ch-abc");

		// Assert
		const { agents } = useAgentStore.getState();
		expect(agents[0].iteration).toBe(2);
	});
});
