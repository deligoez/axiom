export interface GitMergeResult {
	success: boolean;
	merged?: boolean;
	hasConflict?: boolean;
	conflictFiles?: string[];
	error?: string;
}

export interface GitService {
	merge(branch: string): Promise<GitMergeResult>;
	abortMerge(): Promise<void>;
	getConflictFiles(): Promise<string[]>;
}

export class RealGitService implements GitService {
	constructor(private cwd: string) {}

	async merge(branch: string): Promise<GitMergeResult> {
		const { exec } = await import("node:child_process");
		const { promisify } = await import("node:util");
		const execAsync = promisify(exec);

		try {
			await execAsync(`git merge ${branch} --no-edit`, { cwd: this.cwd });
			return { success: true, merged: true };
		} catch (error) {
			const err = error as {
				stderr?: string;
				stdout?: string;
				message?: string;
			};
			// Git outputs conflict info to stdout, not stderr
			const output = (err.stdout || "") + (err.stderr || err.message || "");

			if (
				output.includes("CONFLICT") ||
				output.includes("Automatic merge failed")
			) {
				const conflictFiles = await this.getConflictFiles();
				return { success: false, hasConflict: true, conflictFiles };
			}

			return { success: false, error: output };
		}
	}

	async abortMerge(): Promise<void> {
		const { exec } = await import("node:child_process");
		const { promisify } = await import("node:util");
		const execAsync = promisify(exec);

		await execAsync("git merge --abort", { cwd: this.cwd });
	}

	async getConflictFiles(): Promise<string[]> {
		const { exec } = await import("node:child_process");
		const { promisify } = await import("node:util");
		const execAsync = promisify(exec);

		try {
			const { stdout } = await execAsync(
				"git diff --name-only --diff-filter=U",
				{ cwd: this.cwd },
			);
			return stdout
				.split("\n")
				.map((f) => f.trim())
				.filter(Boolean);
		} catch {
			return [];
		}
	}
}
