import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type {
	HookConfig,
	HookEvent,
	HookHandler,
	HookInput,
	HookOutput,
	HookResult,
} from "../types/hooks.js";
import type { HookRegistry } from "./HookRegistry.js";

const execFileAsync = promisify(execFile);

export class HookTimeoutError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "HookTimeoutError";
	}
}

export class HookExecutionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "HookExecutionError";
	}
}

export class HookOutputError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "HookOutputError";
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const VALID_RESULTS: HookResult[] = ["continue", "block", "complete"];

export class HookRunner {
	constructor(
		private registry: HookRegistry,
		_defaultConfig?: Partial<HookConfig>,
	) {
		// Note: defaultConfig is passed to registry at construction time
	}

	async run(
		event: HookEvent,
		input: Omit<HookInput, "event">,
	): Promise<HookOutput> {
		const handlers = this.registry.getHandlers(event);

		if (handlers.length === 0) {
			return { result: "continue" };
		}

		const hookInput: HookInput = { event, ...input };
		const outputs: HookOutput[] = [];

		for (const handler of handlers) {
			const output = await this.runHandler(handler, hookInput);
			outputs.push(output);
		}

		return this.combineOutputs(outputs);
	}

	async runHandler(
		handler: HookHandler,
		input: HookInput,
	): Promise<HookOutput> {
		const config = this.registry.getHandlerConfig(handler);
		return this.runWithRetry(handler, input, config);
	}

	isBlocked(outputs: HookOutput[]): boolean {
		return outputs.some((o) => o.result === "block");
	}

	isComplete(outputs: HookOutput[]): boolean {
		return outputs.some((o) => o.result === "complete");
	}

	private async runWithRetry(
		handler: HookHandler,
		input: HookInput,
		config: HookConfig,
	): Promise<HookOutput> {
		let lastError: Error | null = null;
		const attempts = config.retryOnError ? config.maxRetries + 1 : 1;

		for (let i = 0; i < attempts; i++) {
			try {
				return await this.executeHandler(handler, input, config.timeout);
			} catch (error) {
				lastError = error as Error;
				if (i < attempts - 1) {
					await sleep(1000); // 1s backoff between retries
				}
			}
		}

		// All attempts failed
		if (config.continueOnFailure) {
			return { result: "continue" };
		}
		throw lastError;
	}

	private async executeHandler(
		handler: HookHandler,
		input: HookInput,
		timeout: number,
	): Promise<HookOutput> {
		try {
			const { stdout } = await execFileAsync(handler.command, [], {
				timeout,
				maxBuffer: 1024 * 1024,
				encoding: "utf8",
				env: {
					...process.env,
					HOOK_INPUT: JSON.stringify(input),
				},
			});
			return this.parseOutput(stdout);
		} catch (error) {
			const err = error as NodeJS.ErrnoException & {
				killed?: boolean;
				signal?: string;
				code?: string;
			};

			if (err.killed && err.signal === "SIGTERM") {
				throw new HookTimeoutError(
					`Hook ${handler.command} timed out after ${timeout}ms`,
				);
			}

			if (err.code !== undefined || err.signal !== undefined) {
				throw new HookExecutionError(
					`Hook ${handler.command} exited with error: ${err.message}`,
				);
			}

			throw err;
		}
	}

	private parseOutput(stdout: string): HookOutput {
		const trimmed = stdout.trim();

		if (!trimmed) {
			// Empty output defaults to continue
			return { result: "continue" };
		}

		try {
			const output = JSON.parse(trimmed) as HookOutput;

			// Validate required fields
			if (!output.result || !VALID_RESULTS.includes(output.result)) {
				console.error("[HookRunner] Invalid result field in hook output");
				console.error(
					`[HookRunner] stdout (first 500 chars): ${trimmed.slice(0, 500)}`,
				);
				throw new HookOutputError("Invalid result field");
			}

			return output;
		} catch (error) {
			if (error instanceof HookOutputError) {
				throw error;
			}
			console.error("[HookRunner] Failed to parse hook output as JSON");
			console.error(
				`[HookRunner] stdout (first 500 chars): ${trimmed.slice(0, 500)}`,
			);
			console.error(`[HookRunner] Parse error: ${(error as Error).message}`);
			throw new HookOutputError(
				`Invalid JSON output: ${(error as Error).message}`,
			);
		}
	}

	private combineOutputs(outputs: HookOutput[]): HookOutput {
		// Priority: block > complete > continue
		if (outputs.some((o) => o.result === "block")) {
			const blocker = outputs.find((o) => o.result === "block");
			return { result: "block", message: blocker?.message };
		}
		if (outputs.some((o) => o.result === "complete")) {
			return { result: "complete" };
		}
		return { result: "continue" };
	}
}
