/**
 * Agent Logger Service
 *
 * Logs agent events with timestamps and supports filtering and persistence.
 */

import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { PersonaName } from "../types/persona.js";

/**
 * Log levels for agent events.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Input for logging an entry (without timestamp).
 */
export interface LogInput {
	/** Persona name */
	persona: PersonaName | string;
	/** Instance ID (e.g., 'chip-001' or 'sage') */
	instanceId: string;
	/** Log level */
	level: LogLevel;
	/** Log message */
	message: string;
}

/**
 * A complete log entry with timestamp.
 */
export interface LogEntry extends LogInput {
	/** ISO timestamp */
	timestamp: string;
}

/**
 * Auto-flush threshold (number of entries).
 */
const FLUSH_THRESHOLD = 100;

/**
 * Service to log agent events with persistence support.
 */
export class AgentLogger {
	private projectDir: string;
	private entries: LogEntry[] = [];
	private unflushedCount = 0;

	constructor(projectDir: string) {
		this.projectDir = projectDir;
	}

	/**
	 * Add a log entry with automatic timestamp.
	 */
	log(input: LogInput): void {
		const entry: LogEntry = {
			...input,
			timestamp: new Date().toISOString(),
		};

		this.entries.push(entry);
		this.unflushedCount++;

		// Auto-flush on threshold
		if (this.unflushedCount >= FLUSH_THRESHOLD) {
			this.flush();
		}
	}

	/**
	 * Get the most recent n entries.
	 */
	getRecent(n: number): LogEntry[] {
		return this.entries.slice(-n);
	}

	/**
	 * Filter entries by persona name.
	 */
	filterByPersona(persona: PersonaName | string): LogEntry[] {
		return this.entries.filter((e) => e.persona === persona);
	}

	/**
	 * Persist all entries to .chorus/logs/agents.jsonl
	 */
	flush(): void {
		if (this.entries.length === 0) {
			return;
		}

		const logsDir = join(this.projectDir, ".chorus", "logs");
		if (!existsSync(logsDir)) {
			mkdirSync(logsDir, { recursive: true });
		}

		const logPath = join(logsDir, "agents.jsonl");
		const lines = `${this.entries.map((e) => JSON.stringify(e)).join("\n")}\n`;
		appendFileSync(logPath, lines);

		// Reset unflushed count but keep entries in memory
		this.unflushedCount = 0;
	}
}
