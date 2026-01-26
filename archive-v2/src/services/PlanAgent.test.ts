import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChorusConfig } from "../types/config.js";
import type { AgentLogger, LogInput } from "./AgentLogger.js";
import { ConversationManager } from "./ConversationManager.js";
import { PlanAgent, type PlanAgentEvent } from "./PlanAgent.js";
import type { PlanAgentPromptBuilder } from "./PlanAgentPromptBuilder.js";
import type { SessionLogger } from "./SessionLogger.js";

// Mock dependencies
vi.mock("./PlanAgentPromptBuilder.js");
vi.mock("./SessionLogger.js");
vi.mock("node:child_process", () => ({
	spawn: vi.fn(),
	spawnSync: vi.fn().mockReturnValue({
		stdout: "Mock Claude response",
		stderr: "",
		status: 0,
		error: null,
	}),
}));

describe("PlanAgent", () => {
	let mockPromptBuilder: PlanAgentPromptBuilder;
	let mockConversationManager: ConversationManager;
	let mockSessionLogger: SessionLogger;
	let mockOnEvent: ReturnType<typeof vi.fn<(event: PlanAgentEvent) => void>>;
	let mockConfig: ChorusConfig;
	let options: {
		promptBuilder: PlanAgentPromptBuilder;
		conversationManager: ConversationManager;
		sessionLogger: SessionLogger;
		config: ChorusConfig;
		onEvent: (event: PlanAgentEvent) => void;
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockPromptBuilder = {
			build: vi.fn().mockReturnValue("System prompt content"),
		} as unknown as PlanAgentPromptBuilder;

		mockConversationManager = new ConversationManager();
		vi.spyOn(mockConversationManager, "addUserMessage");
		vi.spyOn(mockConversationManager, "addAgentMessage");
		vi.spyOn(mockConversationManager, "addSystemMessage");
		vi.spyOn(mockConversationManager, "getHistory");

		mockSessionLogger = {
			log: vi.fn(),
		} as unknown as SessionLogger;

		mockOnEvent = vi.fn();

		mockConfig = {
			version: "3.1",
			mode: "semi-auto",
			project: { taskIdPrefix: "ch-" },
			agents: {
				default: "claude",
				maxParallel: 3,
				timeoutMinutes: 30,
				available: {
					claude: { command: "claude", args: ["--print"] },
				},
			},
			qualityCommands: [],
			completion: {
				signal: "<chorus>COMPLETE</chorus>",
				requireTests: true,
				maxIterations: 50,
				taskTimeout: 30,
			},
			merge: {
				autoResolve: true,
				agentResolve: true,
				requireApproval: false,
			},
			tui: { agentGrid: "auto" },
			checkpoints: {
				beforeAutopilot: true,
				beforeMerge: true,
				periodic: 5,
			},
			planReview: {
				enabled: true,
				maxIterations: 5,
				triggerOn: ["cross_cutting"],
				autoApply: "minor",
				requireApproval: ["redundant"],
			},
			review: {
				defaultMode: "batch",
				autoApprove: {
					enabled: true,
					maxIterations: 3,
					requireQualityPass: true,
				},
				labelRules: [],
			},
			fileWatcher: { usePolling: false, interval: 100 },
			taskStore: { maxTasks: 50000, warnThreshold: 0.8 },
		};

		options = {
			promptBuilder: mockPromptBuilder,
			conversationManager: mockConversationManager,
			sessionLogger: mockSessionLogger,
			config: mockConfig,
			onEvent: mockOnEvent,
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Lifecycle - 4 tests", () => {
		it("start() spawns Claude with plan agent system prompt", async () => {
			// Arrange
			const agent = new PlanAgent(options);

			// Act
			await agent.start();

			// Assert
			expect(mockPromptBuilder.build).toHaveBeenCalledWith(mockConfig);
			expect(mockConversationManager.addSystemMessage).toHaveBeenCalledWith(
				"System prompt content",
			);
		});

		it("start() emits PLAN_AGENT_STARTED event", async () => {
			// Arrange
			const agent = new PlanAgent(options);

			// Act
			await agent.start();

			// Assert
			expect(mockOnEvent).toHaveBeenCalledWith({
				type: "PLAN_AGENT_STARTED",
				agentId: expect.any(String),
			});
		});

		it("stop() terminates agent process", async () => {
			// Arrange
			const agent = new PlanAgent(options);
			await agent.start();

			// Act
			await agent.stop();

			// Assert
			expect(agent.getState()).toBe("stopped");
		});

		it("stop() emits PLAN_AGENT_STOPPED event", async () => {
			// Arrange
			const agent = new PlanAgent(options);
			await agent.start();
			mockOnEvent.mockClear();

			// Act
			await agent.stop();

			// Assert
			expect(mockOnEvent).toHaveBeenCalledWith({
				type: "PLAN_AGENT_STOPPED",
				agentId: expect.any(String),
			});
		});
	});

	describe("Communication - 3 tests", () => {
		it("send(message) sends user message to agent", async () => {
			// Arrange
			const agent = new PlanAgent(options);
			await agent.start();

			// Act
			await agent.send("Create a login feature");

			// Assert
			expect(mockConversationManager.addUserMessage).toHaveBeenCalledWith(
				"Create a login feature",
			);
		});

		it("send() emits PLAN_AGENT_RESPONSE event with content", async () => {
			// Arrange
			const agent = new PlanAgent(options);
			// Mock the agent to return a response
			agent.setMockResponse("Here are the tasks for login feature...");
			await agent.start();
			mockOnEvent.mockClear();

			// Act
			await agent.send("Create a login feature");

			// Assert
			expect(mockOnEvent).toHaveBeenCalledWith({
				type: "PLAN_AGENT_RESPONSE",
				agentId: expect.any(String),
				content: "Here are the tasks for login feature...",
			});
		});

		it("error in send() emits PLAN_AGENT_ERROR event", async () => {
			// Arrange
			const agent = new PlanAgent(options);
			// Mock the agent to throw an error
			agent.setMockError(new Error("API error"));
			await agent.start();
			mockOnEvent.mockClear();

			// Act & Assert
			await expect(agent.send("test")).rejects.toThrow("API error");
			expect(mockOnEvent).toHaveBeenCalledWith({
				type: "PLAN_AGENT_ERROR",
				agentId: expect.any(String),
				error: "API error",
			});
		});
	});

	describe("Task Extraction - 3 tests", () => {
		it("extractTasks() parses task list from last response", async () => {
			// Arrange
			const agent = new PlanAgent(options);
			const taskResponse = `
Here are the tasks:

## Task 1: Create login form
- Description: Build login form component
- Acceptance: Form renders, validates input

## Task 2: Add authentication API
- Description: Create auth endpoint
- Acceptance: API returns token
`;
			agent.setMockResponse(taskResponse);
			await agent.start();
			await agent.send("Create login feature");

			// Act
			const tasks = agent.extractTasks();

			// Assert
			expect(tasks.length).toBeGreaterThan(0);
			expect(tasks[0]).toHaveProperty("title");
			expect(tasks[0]).toHaveProperty("description");
		});

		it("extractTasks() emits TASKS_EXTRACTED event", async () => {
			// Arrange
			const agent = new PlanAgent(options);
			agent.setMockResponse("## Task 1: Test\n- Description: Test task");
			await agent.start();
			await agent.send("Create a feature");
			mockOnEvent.mockClear();

			// Act
			const tasks = agent.extractTasks();

			// Assert
			expect(mockOnEvent).toHaveBeenCalledWith({
				type: "TASKS_EXTRACTED",
				tasks: expect.any(Array),
				count: tasks.length,
			});
		});

		it("extractTasks() validates against basic schema", async () => {
			// Arrange
			const agent = new PlanAgent(options);
			agent.setMockResponse("## Task 1: Valid Task\n- Description: Has desc");
			await agent.start();
			await agent.send("Create feature");

			// Act
			const tasks = agent.extractTasks();

			// Assert
			for (const task of tasks) {
				expect(task).toHaveProperty("title");
				expect(typeof task.title).toBe("string");
				expect(task.title.length).toBeGreaterThan(0);
			}
		});
	});

	describe("State & Logging - 2 tests", () => {
		it("getState() returns lifecycle state (idle, running, stopped, error)", async () => {
			// Arrange
			const agent = new PlanAgent(options);

			// Assert initial state
			expect(agent.getState()).toBe("idle");

			// Act & Assert - running
			await agent.start();
			expect(agent.getState()).toBe("running");

			// Act & Assert - stopped
			await agent.stop();
			expect(agent.getState()).toBe("stopped");
		});

		it("all interactions logged via SessionLogger", async () => {
			// Arrange
			const agent = new PlanAgent(options);
			agent.setMockResponse("Here is the response");
			await agent.start();

			// Act
			await agent.send("User message");

			// Assert
			expect(mockSessionLogger.log).toHaveBeenCalledWith(
				expect.objectContaining({
					mode: "planning",
					eventType: expect.any(String),
				}),
			);
		});
	});

	// Archie persona logging tests (AP13)
	describe("Archie persona logging", () => {
		const createMockAgentLogger = (): {
			logger: AgentLogger;
			logs: LogInput[];
		} => {
			const logs: LogInput[] = [];
			const logger = {
				log: vi.fn((input: LogInput) => logs.push(input)),
			} as unknown as AgentLogger;
			return { logger, logs };
		};

		it("logs with persona: 'archie' and instanceId: 'archie'", async () => {
			// Arrange
			const { logger, logs } = createMockAgentLogger();
			const agent = new PlanAgent({ ...options, agentLogger: logger });

			// Act
			await agent.start();

			// Assert - all logs have archie persona and instance
			expect(logs.length).toBeGreaterThan(0);
			for (const log of logs) {
				expect(log.persona).toBe("archie");
				expect(log.instanceId).toBe("archie");
			}
		});

		it("logs '[archie] Analyzing feature request...' on start", async () => {
			// Arrange
			const { logger, logs } = createMockAgentLogger();
			const agent = new PlanAgent({ ...options, agentLogger: logger });

			// Act
			await agent.start();

			// Assert - analysis log present
			const analysisLog = logs.find((l) =>
				l.message.includes("Analyzing feature request"),
			);
			expect(analysisLog).toBeDefined();
			expect(analysisLog?.message).toContain(
				"[archie] Analyzing feature request",
			);
		});

		it("logs '[archie] Created N tasks with dependencies' on extractTasks", async () => {
			// Arrange
			const { logger, logs } = createMockAgentLogger();
			const agent = new PlanAgent({ ...options, agentLogger: logger });
			agent.setMockResponse(
				"## Task 1: Test\n- Description: Test task\n\n## Task 2: Another\n- Description: Another task",
			);
			await agent.start();
			await agent.send("Create feature");
			logs.length = 0; // Clear logs from start/send

			// Act
			agent.extractTasks();

			// Assert - completion log present
			const completionLog = logs.find((l) => l.message.includes("Created"));
			expect(completionLog).toBeDefined();
			expect(completionLog?.message).toContain("[archie] Created 2 tasks");
		});

		it("does not log when no agentLogger provided", async () => {
			// Arrange
			const agent = new PlanAgent(options); // No agentLogger

			// Act & Assert - should not throw
			expect(() => agent.start()).not.toThrow();
		});
	});
});
