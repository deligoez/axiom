/**
 * Agent Log Service
 *
 * Writes per-agent execution logs in JSONL format.
 * Each agent's logs are stored in .chorus/agents/{persona}/logs/{taskId}.jsonl
 */

import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type { PersonaName } from "../types/persona.js";

/**
 * Base log entry with timestamp.
 */
interface LogEntryBase {
	timestamp: string;
	event: string;
}

/**
 * Start event when agent begins a task.
 */
interface StartEvent extends LogEntryBase {
	event: "start";
	taskId: string;
}

/**
 * Iteration event when agent completes an iteration.
 */
interface IterationEvent extends LogEntryBase {
	event: "iteration";
	number: number;
	input: string;
	output: string;
}

/**
 * Signal event when agent emits a signal.
 */
interface SignalEvent extends LogEntryBase {
	event: "signal";
	type: string;
	payload?: string;
}

/**
 * Complete event when agent finishes a task.
 */
interface CompleteEvent extends LogEntryBase {
	event: "complete";
	durationMs: number;
	iterations: number;
}

/**
 * Error event when agent encounters an error.
 */
interface ErrorEvent extends LogEntryBase {
	event: "error";
	error: string;
}

type LogEvent =
	| StartEvent
	| IterationEvent
	| SignalEvent
	| CompleteEvent
	| ErrorEvent;

/**
 * Service to write per-agent execution logs in JSONL format.
 */
export class AgentLogService {
	private projectDir: string;

	constructor(projectDir: string) {
		this.projectDir = projectDir;
	}

	/**
	 * Get the log file path for a persona and task.
	 */
	private getLogPath(persona: PersonaName | string, taskId: string): string {
		return join(
			this.projectDir,
			".chorus",
			"agents",
			persona,
			"logs",
			`${taskId}.jsonl`,
		);
	}

	/**
	 * Write a log entry to the log file.
	 */
	private writeEntry(
		persona: PersonaName | string,
		taskId: string,
		entry: LogEvent,
	): void {
		const logPath = this.getLogPath(persona, taskId);
		const logDir = dirname(logPath);

		if (!existsSync(logDir)) {
			mkdirSync(logDir, { recursive: true });
		}

		appendFileSync(logPath, `${JSON.stringify(entry)}\n`);
	}

	/**
	 * Log when an agent starts a task.
	 */
	logStart(persona: PersonaName | string, taskId: string): void {
		const entry: StartEvent = {
			timestamp: new Date().toISOString(),
			event: "start",
			taskId,
		};
		this.writeEntry(persona, taskId, entry);
	}

	/**
	 * Log an iteration with input and output.
	 */
	logIteration(
		persona: PersonaName | string,
		taskId: string,
		iteration: number,
		input: string,
		output: string,
	): void {
		const entry: IterationEvent = {
			timestamp: new Date().toISOString(),
			event: "iteration",
			number: iteration,
			input,
			output,
		};
		this.writeEntry(persona, taskId, entry);
	}

	/**
	 * Log a signal emitted by the agent.
	 */
	logSignal(
		persona: PersonaName | string,
		taskId: string,
		type: string,
		payload?: string,
	): void {
		const entry: SignalEvent = {
			timestamp: new Date().toISOString(),
			event: "signal",
			type,
			payload,
		};
		this.writeEntry(persona, taskId, entry);
	}

	/**
	 * Log when an agent completes a task.
	 */
	logComplete(
		persona: PersonaName | string,
		taskId: string,
		durationMs: number,
		iterations: number,
	): void {
		const entry: CompleteEvent = {
			timestamp: new Date().toISOString(),
			event: "complete",
			durationMs,
			iterations,
		};
		this.writeEntry(persona, taskId, entry);
	}

	/**
	 * Log an error encountered by the agent.
	 */
	logError(persona: PersonaName | string, taskId: string, error: Error): void {
		const entry: ErrorEvent = {
			timestamp: new Date().toISOString(),
			event: "error",
			error: error.message,
		};
		this.writeEntry(persona, taskId, entry);
	}
}
