import { Readable } from "node:stream";
import type {
	AgentProcess,
	AgentSpawner,
	SpawnOptions,
} from "./AgentSpawner.js";

export class MockAgentSpawner implements AgentSpawner {
	spawnCalls: SpawnOptions[] = [];
	killCalls: number[] = [];

	private nextPid = 1000;
	private exitCode = 0;
	private outputLines: string[] = [];
	private shouldThrow = false;
	private throwError: Error | null = null;

	setExitCode(code: number): void {
		this.exitCode = code;
	}

	setOutput(lines: string[]): void {
		this.outputLines = lines;
	}

	setThrowError(error: Error): void {
		this.shouldThrow = true;
		this.throwError = error;
	}

	async spawn(options: SpawnOptions): Promise<AgentProcess> {
		this.spawnCalls.push(options);

		if (this.shouldThrow && this.throwError) {
			throw this.throwError;
		}

		const pid = this.nextPid++;
		const exitCode = this.exitCode;
		const outputLines = this.outputLines;

		// Create a readable stream with output
		const stdout = new Readable({
			read() {
				for (const line of outputLines) {
					this.push(`${line}\n`);
				}
				this.push(null);
			},
		});

		return {
			pid,
			stdout,
			exitCode: Promise.resolve(exitCode),
		};
	}

	kill(pid: number): void {
		this.killCalls.push(pid);
	}

	reset(): void {
		this.spawnCalls = [];
		this.killCalls = [];
		this.nextPid = 1000;
		this.exitCode = 0;
		this.outputLines = [];
		this.shouldThrow = false;
		this.throwError = null;
	}
}
