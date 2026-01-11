import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

export interface SessionEvent {
	mode: string;
	eventType: string;
	details: Record<string, unknown>;
}

export interface SessionEventEntry extends SessionEvent {
	timestamp: string;
}

export class SessionLogger {
	private readonly logPath: string;

	constructor(projectDir: string) {
		this.logPath = join(projectDir, ".chorus", "session-log.jsonl");
	}

	/**
	 * Append a session event to the log file
	 */
	log(event: SessionEvent): void {
		const entry: SessionEventEntry = {
			timestamp: new Date().toISOString(),
			...event,
		};

		// Ensure directory exists
		const dir = dirname(this.logPath);
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}

		appendFileSync(this.logPath, `${JSON.stringify(entry)}\n`);
	}

	/**
	 * Get last N events from the log file
	 */
	getRecentEvents(n: number): SessionEventEntry[] {
		const events = this.readAllEvents();
		return events.slice(-n);
	}

	/**
	 * Get events filtered by mode
	 */
	getEventsByMode(mode: string): SessionEventEntry[] {
		const events = this.readAllEvents();
		return events.filter((e) => e.mode === mode);
	}

	/**
	 * Get events filtered by event type
	 */
	getEventsByType(type: string): SessionEventEntry[] {
		const events = this.readAllEvents();
		return events.filter((e) => e.eventType === type);
	}

	/**
	 * Read all events from file, gracefully skipping invalid lines
	 */
	private readAllEvents(): SessionEventEntry[] {
		if (!existsSync(this.logPath)) {
			return [];
		}

		const content = readFileSync(this.logPath, "utf-8");
		const lines = content.split("\n");
		const events: SessionEventEntry[] = [];

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed) continue;

			try {
				const entry = JSON.parse(trimmed) as SessionEventEntry;
				events.push(entry);
			} catch {
				// Skip invalid JSON lines
			}
		}

		return events;
	}
}
