import { exec } from "node:child_process";
import * as fs from "node:fs/promises";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface ExecResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

export interface RebaseRetryDeps {
	exec: (cmd: string) => Promise<ExecResult>;
	fileExists: (path: string) => Promise<boolean>;
}

export interface RebaseResult {
	success: boolean;
	rebased?: boolean;
	hadConflicts?: boolean;
	error?: string;
}

export interface RebaseAndRetryResult {
	ready: boolean;
	aborted?: boolean;
	error?: string;
}

export interface AbortResult {
	success: boolean;
	error?: string;
}

const defaultDeps: RebaseRetryDeps = {
	exec: async (cmd: string): Promise<ExecResult> => {
		try {
			const { stdout, stderr } = await execAsync(cmd);
			return { exitCode: 0, stdout, stderr };
		} catch (error) {
			const err = error as {
				code?: number;
				stdout?: string;
				stderr?: string;
			};
			return {
				exitCode: err.code || 1,
				stdout: err.stdout || "",
				stderr: err.stderr || "",
			};
		}
	},
	fileExists: async (path: string): Promise<boolean> => {
		try {
			await fs.access(path);
			return true;
		} catch {
			return false;
		}
	},
};

export class RebaseRetry {
	private deps: RebaseRetryDeps;

	constructor(deps: RebaseRetryDeps = defaultDeps) {
		this.deps = deps;
	}

	async rebase(targetBranch: string): Promise<RebaseResult> {
		const result = await this.deps.exec(`git rebase ${targetBranch}`);

		if (result.exitCode === 0) {
			return { success: true, rebased: true };
		}

		// Check if rebase is in progress (conflict state)
		const rebaseMergeExists = await this.deps.fileExists(".git/rebase-merge");
		const rebaseApplyExists = await this.deps.fileExists(".git/rebase-apply");

		if (rebaseMergeExists || rebaseApplyExists) {
			return { success: false, hadConflicts: true };
		}

		// Other git error
		return {
			success: false,
			hadConflicts: false,
			error: result.stderr || result.stdout,
		};
	}

	async rebaseAndRetry(targetBranch: string): Promise<RebaseAndRetryResult> {
		const rebaseResult = await this.rebase(targetBranch);

		if (rebaseResult.success) {
			return { ready: true };
		}

		if (rebaseResult.hadConflicts) {
			await this.abortRebase();
			return { ready: false, aborted: true };
		}

		return { ready: false, error: rebaseResult.error };
	}

	async abortRebase(): Promise<AbortResult> {
		const result = await this.deps.exec("git rebase --abort");

		if (result.exitCode === 0) {
			return { success: true };
		}

		return { success: false, error: result.stderr };
	}
}
