import { type ChildProcess, spawn } from "node:child_process";
import type { Readable } from "node:stream";

export interface SpawnOptions {
	prompt: string;
	cwd: string;
}

export interface AgentProcess {
	pid: number;
	stdout: Readable;
	exitCode: Promise<number>;
}

export interface AgentSpawner {
	spawn(options: SpawnOptions): Promise<AgentProcess>;
	kill(pid: number): void;
}

export class CLIAgentSpawner implements AgentSpawner {
	private processes: Map<number, ChildProcess> = new Map();

	async spawn(options: SpawnOptions): Promise<AgentProcess> {
		const child = spawn("claude", ["--prompt", options.prompt], {
			cwd: options.cwd,
			stdio: ["inherit", "pipe", "pipe"],
		});

		if (!child.pid || !child.stdout) {
			throw new Error("Failed to spawn agent process");
		}

		const pid = child.pid;
		const stdout = child.stdout;

		this.processes.set(pid, child);

		const exitCode = new Promise<number>((resolve) => {
			child.on("exit", (code) => {
				this.processes.delete(pid);
				resolve(code || 0);
			});
		});

		return {
			pid,
			stdout,
			exitCode,
		};
	}

	kill(pid: number): void {
		const process = this.processes.get(pid);
		if (process) {
			process.kill("SIGTERM");
			this.processes.delete(pid);
		}
	}
}
