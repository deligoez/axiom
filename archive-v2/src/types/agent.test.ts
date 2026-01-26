import { describe, expect, it } from "vitest";
import {
	type Agent,
	type AgentConfig,
	type AgentStatus,
	createAgent,
} from "./agent.js";

describe("Agent types", () => {
	it("Agent has required properties", () => {
		const agent: Agent = {
			id: "agent-1",
			name: "test-agent",
			status: "running",
			output: [],
			createdAt: new Date(),
		};

		expect(agent.id).toBe("agent-1");
		expect(agent.name).toBe("test-agent");
		expect(agent.status).toBe("running");
		expect(agent.output).toEqual([]);
	});

	it("AgentStatus includes all states", () => {
		// Arrange & Act
		const statuses: AgentStatus[] = [
			"idle",
			"running",
			"paused",
			"stopped",
			"error",
		];

		// Assert
		expect(statuses).toContain("idle");
		expect(statuses).toContain("running");
		expect(statuses).toContain("paused");
		expect(statuses).toContain("stopped");
		expect(statuses).toContain("error");
	});

	it("AgentConfig has command and optional args", () => {
		const config: AgentConfig = {
			name: "my-agent",
			command: "echo",
			args: ["hello"],
			cwd: "/tmp",
		};

		expect(config.command).toBe("echo");
		expect(config.args).toEqual(["hello"]);
	});

	it("AgentConfig works without optional fields", () => {
		const config: AgentConfig = {
			name: "simple-agent",
			command: "node",
		};

		expect(config.name).toBe("simple-agent");
		expect(config.args).toBeUndefined();
	});

	it("createAgent creates agent with defaults", () => {
		const agent = createAgent({
			name: "test",
			command: "echo",
		});

		expect(agent.id).toBeDefined();
		expect(agent.name).toBe("test");
		expect(agent.status).toBe("idle");
		expect(agent.output).toEqual([]);
		expect(agent.createdAt).toBeInstanceOf(Date);
	});

	it("createAgent includes config in returned agent", () => {
		const config: AgentConfig = {
			name: "config-test",
			command: "node",
			args: ["--version"],
			cwd: "/home",
		};

		const agent = createAgent(config);

		expect(agent.config).toBeDefined();
		expect(agent.config?.command).toBe("node");
		expect(agent.config?.args).toEqual(["--version"]);
		expect(agent.config?.cwd).toBe("/home");
	});

	it("createAgent generates unique IDs for each call", () => {
		const agent1 = createAgent({ name: "a1", command: "echo" });
		const agent2 = createAgent({ name: "a2", command: "echo" });
		const agent3 = createAgent({ name: "a3", command: "echo" });

		expect(agent1.id).not.toBe(agent2.id);
		expect(agent2.id).not.toBe(agent3.id);
		expect(agent1.id).not.toBe(agent3.id);
	});

	it("Agent optional fields can be set", () => {
		const agent: Agent = {
			id: "agent-1",
			name: "test",
			status: "stopped",
			output: ["line1"],
			createdAt: new Date(),
			pid: 12345,
			exitCode: 0,
			config: {
				name: "test",
				command: "echo",
			},
		};

		expect(agent.pid).toBe(12345);
		expect(agent.exitCode).toBe(0);
		expect(agent.config?.command).toBe("echo");
	});

	it("AgentConfig env field works", () => {
		const config: AgentConfig = {
			name: "env-test",
			command: "printenv",
			env: {
				MY_VAR: "my_value",
				ANOTHER: "test",
			},
		};

		expect(config.env?.MY_VAR).toBe("my_value");
		expect(config.env?.ANOTHER).toBe("test");
	});

	it("createAgent uses provided id when specified (bead ID)", () => {
		const agent = createAgent({
			id: "bd-a1b2",
			name: "bead-task",
			command: "claude-code",
		});

		expect(agent.id).toBe("bd-a1b2");
	});

	it("createAgent auto-generates id when not provided", () => {
		const agent = createAgent({
			name: "demo-agent",
			command: "echo",
		});

		expect(agent.id).toMatch(/^agent-\d+$/);
	});

	it("createAgent with provided id does not affect counter for next agent", () => {
		const beadAgent = createAgent({
			id: "bd-custom",
			name: "bead-task",
			command: "echo",
		});
		const autoAgent = createAgent({
			name: "auto-task",
			command: "echo",
		});

		expect(beadAgent.id).toBe("bd-custom");
		expect(autoAgent.id).toMatch(/^agent-\d+$/);
	});

	// Task linking tests (F09)
	it("Agent interface has task linking fields: taskId, agentType, worktree, branch", () => {
		// Arrange & Act
		const agent: Agent = {
			id: "agent-1",
			name: "test-agent",
			status: "running",
			output: [],
			createdAt: new Date(),
			taskId: "ch-abc",
			agentType: "claude",
			worktree: "/path/to/worktree",
			branch: "feature/ch-abc",
		};

		// Assert
		expect(agent.taskId).toBe("ch-abc");
		expect(agent.agentType).toBe("claude");
		expect(agent.worktree).toBe("/path/to/worktree");
		expect(agent.branch).toBe("feature/ch-abc");
	});

	it("Agent interface has task linking fields: iteration, startedAt", () => {
		// Arrange & Act
		const now = new Date();
		const agent: Agent = {
			id: "agent-1",
			name: "test-agent",
			status: "running",
			output: [],
			createdAt: new Date(),
			iteration: 5,
			startedAt: now,
		};

		// Assert
		expect(agent.iteration).toBe(5);
		expect(agent.startedAt).toBe(now);
	});
});
