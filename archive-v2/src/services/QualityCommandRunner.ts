import { spawn } from "node:child_process";
import type { QualityCommand } from "../types/config.js";

export interface CommandResult {
	name: string;
	success: boolean;
	output: string;
	duration: number;
	exitCode: number;
}

export interface QualityRunResult {
	results: CommandResult[];
	allPassed: boolean;
	firstFailure?: string;
	totalDuration: number;
}

const DEFAULT_TIMEOUT = 300000; // 5 minutes

export class QualityCommandRunner {
	private projectDir: string;

	constructor(projectDir: string) {
		this.projectDir = projectDir;
	}

	getProjectDir(): string {
		return this.projectDir;
	}

	async run(command: string, cwd?: string): Promise<CommandResult> {
		const startTime = Date.now();
		const workDir = cwd ?? this.projectDir;

		return new Promise((resolve) => {
			const child = spawn("sh", ["-c", command], {
				cwd: workDir,
				shell: false,
			});

			let output = "";

			child.stdout.on("data", (data: Buffer) => {
				output += data.toString();
			});

			child.stderr.on("data", (data: Buffer) => {
				output += data.toString();
			});

			child.on("close", (code) => {
				const duration = Date.now() - startTime;
				resolve({
					name: command,
					success: code === 0,
					output,
					duration,
					exitCode: code ?? 1,
				});
			});

			child.on("error", (error) => {
				const duration = Date.now() - startTime;
				resolve({
					name: command,
					success: false,
					output: error.message,
					duration,
					exitCode: 1,
				});
			});
		});
	}

	async runWithTimeout(
		command: string,
		cwd?: string,
		timeout: number = DEFAULT_TIMEOUT,
	): Promise<CommandResult> {
		const startTime = Date.now();
		const workDir = cwd ?? this.projectDir;

		return new Promise((resolve) => {
			const child = spawn("sh", ["-c", command], {
				cwd: workDir,
				shell: false,
			});

			let output = "";
			let timedOut = false;

			const timeoutId = setTimeout(() => {
				timedOut = true;
				child.kill("SIGKILL");
			}, timeout);

			child.stdout.on("data", (data: Buffer) => {
				output += data.toString();
			});

			child.stderr.on("data", (data: Buffer) => {
				output += data.toString();
			});

			child.on("close", (code) => {
				clearTimeout(timeoutId);
				const duration = Date.now() - startTime;
				resolve({
					name: command,
					success: !timedOut && code === 0,
					output,
					duration,
					exitCode: timedOut ? 124 : (code ?? 1),
				});
			});

			child.on("error", (error) => {
				clearTimeout(timeoutId);
				const duration = Date.now() - startTime;
				resolve({
					name: command,
					success: false,
					output: error.message,
					duration,
					exitCode: 1,
				});
			});
		});
	}

	async runQualityCommands(
		commands: QualityCommand[],
	): Promise<QualityRunResult> {
		const sortedCommands = [...commands].sort((a, b) => a.order - b.order);
		const results: CommandResult[] = [];
		let allPassed = true;
		let firstFailure: string | undefined;
		const startTime = Date.now();

		for (const cmd of sortedCommands) {
			const result = await this.run(cmd.command);
			results.push({
				...result,
				name: cmd.name,
			});

			if (!result.success) {
				allPassed = false;
				if (!firstFailure) {
					firstFailure = cmd.name;
				}

				if (cmd.required) {
					break;
				}
			}
		}

		return {
			results,
			allPassed,
			firstFailure,
			totalDuration: Date.now() - startTime,
		};
	}

	async runRequiredOnly(commands: QualityCommand[]): Promise<QualityRunResult> {
		const requiredCommands = commands.filter((cmd) => cmd.required);
		return this.runQualityCommands(requiredCommands);
	}
}
