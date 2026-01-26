import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";
import {
	getDefaultHookConfig,
	type HookConfig,
	type HookEvent,
	type HookHandler,
} from "../types/hooks.js";

const VALID_EVENTS: HookEvent[] = [
	"pre-agent-start",
	"post-agent-start",
	"pre-task-claim",
	"post-task-claim",
	"pre-iteration",
	"post-iteration",
	"pre-task-complete",
	"post-task-complete",
	"pre-merge",
	"post-merge",
	"on-agent-error",
	"on-agent-timeout",
	"on-conflict",
];

export interface HookLoadWarning {
	file: string;
	reason: string;
}

export interface HooksConfigEntry {
	command?: string;
	timeout?: number;
	continueOnFailure?: boolean;
}

export interface HooksConfig {
	[event: string]: string | string[] | HooksConfigEntry | HooksConfigEntry[];
}

export interface ChorusConfigWithHooks {
	hooks?: HooksConfig;
}

export class HookRegistry {
	private handlers: Map<HookEvent, HookHandler[]> = new Map();
	private handlerConfigs: Map<string, HookConfig> = new Map();
	private defaultConfig: HookConfig;
	private warnings: HookLoadWarning[] = [];

	constructor(config?: Partial<HookConfig>) {
		this.defaultConfig = { ...getDefaultHookConfig(), ...config };
	}

	register(handler: HookHandler): boolean {
		// Validate file exists
		if (!existsSync(handler.command)) {
			return false;
		}

		// Validate file is executable (check if readable, best effort)
		try {
			statSync(handler.command);
		} catch {
			return false;
		}

		const existing = this.handlers.get(handler.event) ?? [];
		existing.push(handler);
		this.handlers.set(handler.event, existing);

		// Store per-handler config if specified
		if (
			handler.timeout !== undefined ||
			handler.continueOnFailure !== undefined
		) {
			const handlerConfig: HookConfig = {
				...this.defaultConfig,
				...(handler.timeout !== undefined && { timeout: handler.timeout }),
				...(handler.continueOnFailure !== undefined && {
					continueOnFailure: handler.continueOnFailure,
				}),
			};
			this.handlerConfigs.set(handler.command, handlerConfig);
		}

		return true;
	}

	unregister(event: HookEvent, command: string): void {
		const existing = this.handlers.get(event);
		if (!existing) return;

		const filtered = existing.filter((h) => h.command !== command);
		if (filtered.length > 0) {
			this.handlers.set(event, filtered);
		} else {
			this.handlers.delete(event);
		}

		this.handlerConfigs.delete(command);
	}

	getHandlers(event: HookEvent): HookHandler[] {
		return this.handlers.get(event) ?? [];
	}

	hasHandlers(event: HookEvent): boolean {
		const handlers = this.handlers.get(event);
		return handlers !== undefined && handlers.length > 0;
	}

	clear(): void {
		this.handlers.clear();
		this.handlerConfigs.clear();
		this.warnings = [];
	}

	validateEvent(eventName: string): eventName is HookEvent {
		return VALID_EVENTS.includes(eventName as HookEvent);
	}

	async loadFromDirectory(hooksDir: string): Promise<void> {
		if (!existsSync(hooksDir)) {
			return;
		}

		const entries = readdirSync(hooksDir);

		for (const entry of entries) {
			const fullPath = join(hooksDir, entry);
			const stats = statSync(fullPath);

			// Skip subdirectories
			if (stats.isDirectory()) {
				continue;
			}

			// Skip non-executable files (check mode for Unix)
			const isExecutable =
				(stats.mode & 0o111) !== 0 || extname(entry) === ".sh";
			if (!isExecutable) {
				continue;
			}

			// Extract event name from filename (before first dot)
			const eventName = basename(entry).split(".")[0];

			// Validate event name
			if (!this.validateEvent(eventName)) {
				this.warnings.push({
					file: entry,
					reason: `Invalid event name: ${eventName}`,
				});
				continue;
			}

			this.register({
				event: eventName,
				command: fullPath,
			});
		}
	}

	async loadFromConfig(config: ChorusConfigWithHooks): Promise<void> {
		if (!config.hooks) return;

		for (const [eventName, value] of Object.entries(config.hooks)) {
			if (!this.validateEvent(eventName)) {
				this.warnings.push({
					file: "config",
					reason: `Invalid event name in config: ${eventName}`,
				});
				continue;
			}

			const event = eventName as HookEvent;

			// Clear existing handlers for this event (config overrides auto-discovery)
			this.handlers.delete(event);

			if (typeof value === "string") {
				// Single command string
				this.register({ event, command: value });
			} else if (Array.isArray(value)) {
				// Array of commands or configs
				for (const item of value) {
					if (typeof item === "string") {
						this.register({ event, command: item });
					} else {
						// HooksConfigEntry object
						if (item.command) {
							this.register({
								event,
								command: item.command,
								timeout: item.timeout,
								continueOnFailure: item.continueOnFailure,
							});
						}
					}
				}
			} else if (typeof value === "object" && value.command) {
				// Single HooksConfigEntry object
				this.register({
					event,
					command: value.command,
					timeout: value.timeout,
					continueOnFailure: value.continueOnFailure,
				});
			}
		}
	}

	getHandlerConfig(handler: HookHandler): HookConfig {
		return this.handlerConfigs.get(handler.command) ?? this.defaultConfig;
	}

	getWarnings(): HookLoadWarning[] {
		return [...this.warnings];
	}
}
