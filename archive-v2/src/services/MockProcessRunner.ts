import type { ProcessResult, ProcessRunner } from "./ProcessRunner.js";

export class MockProcessRunner implements ProcessRunner {
	private results: Map<string, ProcessResult> = new Map();
	private defaultResult: ProcessResult = {
		stdout: "",
		stderr: "",
		exitCode: 0,
	};
	private shouldThrow = false;
	private throwError: Error | null = null;

	execCalls: Array<{ command: string; cwd?: string }> = [];

	setResult(command: string, result: ProcessResult): void {
		this.results.set(command, result);
	}

	setDefaultResult(result: ProcessResult): void {
		this.defaultResult = result;
	}

	setThrowError(error: Error): void {
		this.shouldThrow = true;
		this.throwError = error;
	}

	async exec(command: string, cwd?: string): Promise<ProcessResult> {
		this.execCalls.push({ command, cwd });

		if (this.shouldThrow && this.throwError) {
			throw this.throwError;
		}

		return this.results.get(command) || this.defaultResult;
	}

	reset(): void {
		this.results.clear();
		this.execCalls = [];
		this.shouldThrow = false;
		this.throwError = null;
		this.defaultResult = { stdout: "", stderr: "", exitCode: 0 };
	}
}
