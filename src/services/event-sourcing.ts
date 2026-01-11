import * as fs from "node:fs";
import * as path from "node:path";
import type { AnyStateMachine } from "xstate";
import { createActor } from "xstate";

export interface PersistedEvent {
	timestamp: number;
	type: string;
	[key: string]: unknown;
}

/**
 * Get the event log path for a project
 */
export function getEventLogPath(projectRoot: string): string {
	return path.join(projectRoot, ".chorus", "events.jsonl");
}

/**
 * Persist an event to the JSONL log file
 */
export function persistEvent(
	event: Record<string, unknown>,
	logPath: string,
): void {
	const persistedEvent: PersistedEvent = {
		timestamp: Date.now(),
		...event,
		type: event.type as string,
	};

	const line = `${JSON.stringify(persistedEvent)}\n`;

	// Ensure directory exists
	const dir = path.dirname(logPath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}

	fs.appendFileSync(logPath, line, "utf-8");
}

/**
 * Read all events from the log file
 */
export function readEvents(logPath: string): PersistedEvent[] {
	if (!fs.existsSync(logPath)) {
		return [];
	}

	const content = fs.readFileSync(logPath, "utf-8");
	const lines = content.trim().split("\n").filter(Boolean);

	return lines.map((line) => JSON.parse(line) as PersistedEvent);
}

/**
 * Replay events to restore machine state
 */
export function replayEvents<TMachine extends AnyStateMachine>(
	machine: TMachine,
	logPath: string,
	input: Parameters<TMachine["provide"]>[0] extends { input: infer I }
		? I
		: unknown,
): ReturnType<typeof createActor<TMachine>> {
	const events = readEvents(logPath);

	// Create actor with input
	const actor = createActor(machine, { input } as never);
	actor.start();

	// Replay all events
	for (const event of events) {
		const { timestamp, ...eventData } = event;
		actor.send(eventData as never);
	}

	return actor as ReturnType<typeof createActor<TMachine>>;
}

/**
 * Truncate the event log (after successful snapshot)
 */
export function truncateEventLog(logPath: string): void {
	if (fs.existsSync(logPath)) {
		fs.writeFileSync(logPath, "", "utf-8");
	}
}

/**
 * Clear the event log completely
 */
export function clearEventLog(logPath: string): void {
	if (fs.existsSync(logPath)) {
		fs.unlinkSync(logPath);
	}
}

/**
 * Get size of event log in bytes
 */
export function getEventLogSize(logPath: string): number {
	if (!fs.existsSync(logPath)) {
		return 0;
	}
	return fs.statSync(logPath).size;
}

/**
 * Rotate event log if it exceeds max size
 * @internal Used by persistence layer
 */
export function rotateEventLog(
	logPath: string,
	maxSizeBytes: number = 10 * 1024 * 1024,
): void {
	const size = getEventLogSize(logPath);

	if (size > maxSizeBytes) {
		const archivePath = `${logPath}.${Date.now()}.archive`;
		fs.renameSync(logPath, archivePath);
	}
}
