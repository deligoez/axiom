import * as fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentState } from "../types/state.js";
import {
	AgentNotFoundError,
	DuplicateAgentError,
	StateService,
} from "./StateService.js";

// Mock fs
vi.mock("node:fs", () => ({
	existsSync: vi.fn(),
	readFileSync: vi.fn(),
}));

const mockExistsSync = vi.mocked(fs.existsSync);
const mockReadFileSync = vi.mocked(fs.readFileSync);

// UUID regex pattern
const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("StateService", () => {
	let service: StateService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new StateService("/test/project");
	});

	// F02b: init() tests (5)
	it("init() generates sessionId in UUID format", () => {
		// Arrange - service already created

		// Act
		const state = service.init();

		// Assert
		expect(state.sessionId).toMatch(UUID_REGEX);
	});

	it("init() sets startedAt to timestamp close to Date.now()", () => {
		// Arrange
		const before = Date.now();

		// Act
		const state = service.init();

		// Assert
		const after = Date.now();
		expect(state.startedAt).toBeGreaterThanOrEqual(before);
		expect(state.startedAt).toBeLessThanOrEqual(after);
	});

	it("init() creates empty agents object", () => {
		// Arrange - service already created

		// Act
		const state = service.init();

		// Assert
		expect(state.agents).toEqual({});
	});

	it("init() creates empty mergeQueue array", () => {
		// Arrange - service already created

		// Act
		const state = service.init();

		// Assert
		expect(state.mergeQueue).toEqual([]);
	});

	it("init() sets mode to semi-auto as default", () => {
		// Arrange - service already created

		// Act
		const state = service.init();

		// Assert
		expect(state.mode).toBe("semi-auto");
	});

	// F02b: load() tests (3)
	it("load() returns null when state file does not exist", () => {
		// Arrange
		mockExistsSync.mockReturnValue(false);

		// Act
		const result = service.load();

		// Assert
		expect(result).toBeNull();
		expect(mockExistsSync).toHaveBeenCalledWith(
			"/test/project/.chorus/state.json",
		);
	});

	it("load() returns parsed ChorusState when file exists and valid", () => {
		// Arrange
		const validState = {
			version: "1.0",
			sessionId: "test-session-id",
			startedAt: 1234567890,
			mode: "semi-auto",
			paused: false,
			agents: {},
			mergeQueue: [],
			checkpoint: null,
			stats: {
				tasksCompleted: 0,
				tasksFailed: 0,
				mergesAuto: 0,
				mergesManual: 0,
				totalIterations: 0,
				totalRuntime: 0,
			},
		};
		mockExistsSync.mockReturnValue(true);
		mockReadFileSync.mockReturnValue(JSON.stringify(validState));

		// Act
		const result = service.load();

		// Assert
		expect(result).toEqual(validState);
	});

	it("load() throws Error on malformed state structure", () => {
		// Arrange
		mockExistsSync.mockReturnValue(true);
		mockReadFileSync.mockReturnValue(JSON.stringify({ invalid: "data" }));

		// Act & Assert
		expect(() => service.load()).toThrow("Invalid state structure");
	});

	// F02b: get() test (1)
	it("get() throws Error when called before init/load", () => {
		// Arrange - service created but not initialized

		// Act & Assert
		expect(() => service.get()).toThrow("State not initialized");
	});

	// F02c: Agent CRUD tests (5)
	describe("Agent Operations", () => {
		const createTestAgent = (id = "agent-1"): AgentState => ({
			id,
			type: "claude",
			pid: 1234,
			taskId: "task-1",
			worktree: "/test/worktree",
			branch: "agent/claude/task-1",
			iteration: 0,
			startedAt: Date.now(),
			status: "idle",
		});

		it("addAgent() adds AgentState to state.agents", () => {
			// Arrange
			service.init();
			const agent = createTestAgent();

			// Act
			service.addAgent(agent);

			// Assert
			expect(service.getAgent("agent-1")).toEqual(agent);
		});

		it("addAgent() throws DuplicateAgentError if agent with same ID exists", () => {
			// Arrange
			service.init();
			service.addAgent(createTestAgent());

			// Act & Assert
			expect(() => service.addAgent(createTestAgent())).toThrow(
				DuplicateAgentError,
			);
		});

		it("updateAgent() modifies existing agent", () => {
			// Arrange
			service.init();
			service.addAgent(createTestAgent());

			// Act
			service.updateAgent("agent-1", { iteration: 5, status: "running" });

			// Assert
			const agent = service.getAgent("agent-1");
			expect(agent?.iteration).toBe(5);
			expect(agent?.status).toBe("running");
		});

		it("removeAgent() deletes agent from state", () => {
			// Arrange
			service.init();
			service.addAgent(createTestAgent());

			// Act
			service.removeAgent("agent-1");

			// Assert
			expect(service.getAgent("agent-1")).toBeUndefined();
		});

		it("getAgent() returns agent or undefined", () => {
			// Arrange
			service.init();
			service.addAgent(createTestAgent());

			// Act & Assert
			expect(service.getAgent("agent-1")).toBeDefined();
			expect(service.getAgent("nonexistent")).toBeUndefined();
		});
	});

	// F02c: Iteration tests (5)
	describe("Iteration Management", () => {
		const createTestAgent = (id = "agent-1"): AgentState => ({
			id,
			type: "claude",
			pid: 1234,
			taskId: "task-1",
			worktree: "/test/worktree",
			branch: "agent/claude/task-1",
			iteration: 0,
			startedAt: Date.now(),
			status: "idle",
		});

		it("startIteration() increments iteration number and returns new count", () => {
			// Arrange
			service.init();
			service.addAgent(createTestAgent());

			// Act
			const count1 = service.startIteration("agent-1", "abc123");
			const count2 = service.startIteration("agent-1", "def456");

			// Assert
			expect(count1).toBe(1);
			expect(count2).toBe(2);
		});

		it("startIteration() records HEAD commit as startCommit", () => {
			// Arrange
			service.init();
			service.addAgent(createTestAgent());

			// Act
			service.startIteration("agent-1", "commit-sha-123");

			// Assert
			const iterations = service.getIterations("agent-1");
			expect(iterations[0].startCommit).toBe("commit-sha-123");
		});

		it("startIteration() appends to iterations array", () => {
			// Arrange
			service.init();
			service.addAgent(createTestAgent());

			// Act
			service.startIteration("agent-1", "commit1");
			service.startIteration("agent-1", "commit2");
			service.startIteration("agent-1", "commit3");

			// Assert
			const iterations = service.getIterations("agent-1");
			expect(iterations).toHaveLength(3);
			expect(iterations[0]).toEqual({ number: 1, startCommit: "commit1" });
			expect(iterations[1]).toEqual({ number: 2, startCommit: "commit2" });
			expect(iterations[2]).toEqual({ number: 3, startCommit: "commit3" });
		});

		it("getIterations() returns agent iterations array", () => {
			// Arrange
			service.init();
			service.addAgent(createTestAgent());
			service.startIteration("agent-1", "commit-abc");

			// Act
			const iterations = service.getIterations("agent-1");

			// Assert
			expect(Array.isArray(iterations)).toBe(true);
			expect(iterations).toHaveLength(1);
		});

		it("startIteration() throws AgentNotFoundError if agent does not exist", () => {
			// Arrange
			service.init();

			// Act & Assert
			expect(() => service.startIteration("nonexistent", "commit")).toThrow(
				AgentNotFoundError,
			);
		});
	});

	// F02c: Status tests (2)
	describe("Status Updates", () => {
		const createTestAgent = (
			id = "agent-1",
			status: AgentState["status"] = "idle",
		): AgentState => ({
			id,
			type: "claude",
			pid: 1234,
			taskId: "task-1",
			worktree: "/test/worktree",
			branch: "agent/claude/task-1",
			iteration: 0,
			startedAt: Date.now(),
			status,
		});

		it("setStatus() updates agent status", () => {
			// Arrange
			service.init();
			service.addAgent(createTestAgent());

			// Act
			service.setStatus("agent-1", "running");

			// Assert
			expect(service.getAgent("agent-1")?.status).toBe("running");
		});

		it("getRunningAgents() returns agents with status=running", () => {
			// Arrange
			service.init();
			service.addAgent(createTestAgent("agent-1", "idle"));
			service.addAgent(createTestAgent("agent-2", "running"));
			service.addAgent(createTestAgent("agent-3", "running"));
			service.addAgent(createTestAgent("agent-4", "paused"));

			// Act
			const running = service.getRunningAgents();

			// Assert
			expect(running).toHaveLength(2);
			expect(running.map((a) => a.id)).toEqual(["agent-2", "agent-3"]);
		});
	});
});
