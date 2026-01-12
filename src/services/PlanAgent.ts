import { spawnSync } from "node:child_process";
import type { ChorusConfig } from "../types/config.js";
import type { ConversationManager } from "./ConversationManager.js";
import type { PlanAgentPromptBuilder } from "./PlanAgentPromptBuilder.js";
import type { SessionLogger } from "./SessionLogger.js";

// Event types emitted to XState machine
export type PlanAgentEvent =
	| { type: "PLAN_AGENT_STARTED"; agentId: string }
	| { type: "PLAN_AGENT_RESPONSE"; agentId: string; content: string }
	| { type: "PLAN_AGENT_ERROR"; agentId: string; error: string }
	| { type: "PLAN_AGENT_STOPPED"; agentId: string }
	| { type: "TASKS_EXTRACTED"; tasks: ExtractedTask[]; count: number };

export type PlanAgentState = "idle" | "running" | "stopped" | "error";

export interface ExtractedTask {
	title: string;
	description?: string;
	acceptanceCriteria?: string[];
}

export interface PlanAgentOptions {
	promptBuilder: PlanAgentPromptBuilder;
	conversationManager: ConversationManager;
	sessionLogger: SessionLogger;
	config: ChorusConfig;
	onEvent: (event: PlanAgentEvent) => void;
}

/**
 * PlanAgent orchestrates Plan Agent behavior (spawn, communicate, parse tasks)
 * with XState event emission.
 */
export class PlanAgent {
	private readonly id: string;
	private readonly promptBuilder: PlanAgentPromptBuilder;
	private readonly conversationManager: ConversationManager;
	private readonly sessionLogger: SessionLogger;
	private readonly config: ChorusConfig;
	private readonly onEvent: (event: PlanAgentEvent) => void;

	private state: PlanAgentState = "idle";
	private lastResponse = "";
	private mockResponse: string | null = null;
	private mockError: Error | null = null;

	constructor(options: PlanAgentOptions) {
		this.id = `plan-agent-${Date.now()}`;
		this.promptBuilder = options.promptBuilder;
		this.conversationManager = options.conversationManager;
		this.sessionLogger = options.sessionLogger;
		this.config = options.config;
		this.onEvent = options.onEvent;
	}

	/**
	 * Start the Plan Agent with system prompt
	 */
	async start(): Promise<void> {
		if (this.state === "running") {
			return; // Idempotent
		}

		// Build system prompt
		const systemPrompt = this.promptBuilder.build(this.config);
		this.conversationManager.addSystemMessage(systemPrompt);

		// Log start event
		this.sessionLogger.log({
			mode: "planning",
			eventType: "agent_started",
			details: { agentId: this.id },
		});

		this.state = "running";

		// Emit event to machine
		this.onEvent({
			type: "PLAN_AGENT_STARTED",
			agentId: this.id,
		});
	}

	/**
	 * Stop the Plan Agent
	 */
	async stop(): Promise<void> {
		if (this.state !== "running") {
			return;
		}

		// Log stop event
		this.sessionLogger.log({
			mode: "planning",
			eventType: "agent_stopped",
			details: { agentId: this.id },
		});

		this.state = "stopped";

		// Emit event to machine
		this.onEvent({
			type: "PLAN_AGENT_STOPPED",
			agentId: this.id,
		});
	}

	/**
	 * Send a user message to the agent
	 */
	async send(message: string): Promise<string> {
		// Add user message to conversation
		this.conversationManager.addUserMessage(message);

		// Log user message
		this.sessionLogger.log({
			mode: "planning",
			eventType: "user_message",
			details: { agentId: this.id, message },
		});

		// Check for mock error (for testing)
		if (this.mockError) {
			const error = this.mockError;
			this.state = "error";

			this.onEvent({
				type: "PLAN_AGENT_ERROR",
				agentId: this.id,
				error: error.message,
			});

			throw error;
		}

		// Get response (mock or real)
		const response = this.mockResponse ?? this.executeClaudeCall(message);

		// Add agent response to conversation
		this.conversationManager.addAgentMessage(response);
		this.lastResponse = response;

		// Log agent response
		this.sessionLogger.log({
			mode: "planning",
			eventType: "agent_response",
			details: { agentId: this.id, responseLength: response.length },
		});

		// Emit response event
		this.onEvent({
			type: "PLAN_AGENT_RESPONSE",
			agentId: this.id,
			content: response,
		});

		return response;
	}

	/**
	 * Extract tasks from the last response
	 */
	extractTasks(): ExtractedTask[] {
		const tasks = this.parseTasksFromResponse(this.lastResponse);

		// Emit extraction event
		this.onEvent({
			type: "TASKS_EXTRACTED",
			tasks,
			count: tasks.length,
		});

		// Log extraction
		this.sessionLogger.log({
			mode: "planning",
			eventType: "tasks_extracted",
			details: { agentId: this.id, taskCount: tasks.length },
		});

		return tasks;
	}

	/**
	 * Get current lifecycle state
	 */
	getState(): PlanAgentState {
		return this.state;
	}

	/**
	 * Get agent ID
	 */
	getId(): string {
		return this.id;
	}

	/**
	 * Set mock response for testing
	 */
	setMockResponse(response: string): void {
		this.mockResponse = response;
	}

	/**
	 * Set mock error for testing
	 */
	setMockError(error: Error): void {
		this.mockError = error;
	}

	/**
	 * Parse tasks from response text
	 */
	private parseTasksFromResponse(response: string): ExtractedTask[] {
		const tasks: ExtractedTask[] = [];

		// Parse tasks from markdown format:
		// ## Task N: Title
		// - Description: ...
		// - Acceptance: ...
		const taskRegex = /##\s*Task\s*\d+:\s*(.+?)(?=\n##|\n*$)/gs;
		const matches = response.matchAll(taskRegex);

		for (const match of matches) {
			const taskBlock = match[0];
			const titleMatch = taskBlock.match(/##\s*Task\s*\d+:\s*(.+)/);
			const descMatch = taskBlock.match(/-\s*Description:\s*(.+)/);
			const acceptMatch = taskBlock.match(/-\s*Acceptance:\s*(.+)/);

			if (titleMatch) {
				const task: ExtractedTask = {
					title: titleMatch[1].trim(),
				};

				if (descMatch) {
					task.description = descMatch[1].trim();
				}

				if (acceptMatch) {
					task.acceptanceCriteria = acceptMatch[1]
						.split(",")
						.map((c) => c.trim());
				}

				tasks.push(task);
			}
		}

		return tasks;
	}

	/**
	 * Execute Claude CLI call using spawnSync
	 *
	 * @param message - User message to send to Claude
	 * @returns Claude's response text
	 */
	private executeClaudeCall(message: string): string {
		// Get agent config
		const agentConfig = this.config.agents?.available?.claude;
		const command = agentConfig?.command ?? "claude";
		const baseArgs = agentConfig?.args ?? ["--print"];

		// Build the full prompt with conversation context
		const history = this.conversationManager.getHistory();
		const contextLines: string[] = [];

		for (const msg of history) {
			if (msg.role === "system") {
				contextLines.push(`[System]\n${msg.content}`);
			} else if (msg.role === "user") {
				contextLines.push(`[User]\n${msg.content}`);
			} else if (msg.role === "assistant") {
				contextLines.push(`[Assistant]\n${msg.content}`);
			}
		}

		// Add current message
		contextLines.push(`[User]\n${message}`);
		const fullPrompt = contextLines.join("\n\n");

		// Spawn Claude CLI with the prompt
		const result = spawnSync(command, [...baseArgs, "-p", fullPrompt], {
			encoding: "utf-8",
			timeout: (this.config.agents?.timeoutMinutes ?? 30) * 60 * 1000,
			maxBuffer: 10 * 1024 * 1024, // 10MB
		});

		// Check for errors
		if (result.error) {
			throw new Error(`Failed to spawn Claude CLI: ${result.error.message}`);
		}

		if (result.status !== 0) {
			const stderr = result.stderr?.trim() ?? "";
			throw new Error(
				`Claude CLI exited with code ${result.status}: ${stderr}`,
			);
		}

		// Return stdout (the response)
		return result.stdout?.trim() ?? "";
	}
}
