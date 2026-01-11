import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface ProcessResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

export interface ProcessRunner {
	exec(command: string, cwd?: string): Promise<ProcessResult>;
}

export class RealProcessRunner implements ProcessRunner {
	async exec(command: string, cwd?: string): Promise<ProcessResult> {
		try {
			const { stdout, stderr } = await execAsync(command, { cwd });
			return { stdout, stderr, exitCode: 0 };
		} catch (error) {
			const err = error as { stdout?: string; stderr?: string; code?: number };
			return {
				stdout: err.stdout || "",
				stderr: err.stderr || "",
				exitCode: err.code || 1,
			};
		}
	}
}
