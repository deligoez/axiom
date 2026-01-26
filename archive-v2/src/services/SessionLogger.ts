import { existsSync, readFileSync } from "node:fs";
import { appendFile, mkdir } from "node:fs/promises";
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
	private writeQueue: Promise<void> = Promise.resolve();

	constructor(projectDir: string) {
		this.logPath = join(projectDir, ".chorus", "session-log.jsonl");
	}

	/**
	 * Append a session event to the log file.
	 * Uses async I/O to avoid blocking the event loop.
	 * Fire-and-forget: callers don't need to await.
	 * Writes are queued to maintain order.
	 */
	log(event: SessionEvent): void {
		const entry: SessionEventEntry = {
			timestamp: new Date().toISOString(),
			...event,
		};

		// Chain writes to ensure ordering while remaining non-blocking
		this.writeQueue = this.writeQueue
			.then(() => this.writeLog(entry))
			.catch(() => {
				// Silently ignore logging failures - don't block the app
			});
	}

	/**
	 * Internal async write method.
	 */
	private async writeLog(entry: SessionEventEntry): Promise<void> {
		const dir = dirname(this.logPath);
		if (!existsSync(dir)) {
			await mkdir(dir, { recursive: true });
		}
		await appendFile(this.logPath, `${JSON.stringify(entry)}\n`);
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
