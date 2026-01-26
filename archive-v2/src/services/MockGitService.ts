import type { GitMergeResult, GitService } from "./GitService.js";

export class MockGitService implements GitService {
	private mergeResult: GitMergeResult = { success: true, merged: true };
	private conflictFiles: string[] = [];
	private shouldThrow = false;
	private throwError: Error | null = null;

	mergeCalls: string[] = [];
	abortCalls: number = 0;

	setMergeResult(result: GitMergeResult): void {
		this.mergeResult = result;
		this.shouldThrow = false;
	}

	setConflictFiles(files: string[]): void {
		this.conflictFiles = files;
	}

	setThrowError(error: Error): void {
		this.shouldThrow = true;
		this.throwError = error;
	}

	async merge(branch: string): Promise<GitMergeResult> {
		this.mergeCalls.push(branch);

		if (this.shouldThrow && this.throwError) {
			throw this.throwError;
		}

		return this.mergeResult;
	}

	async abortMerge(): Promise<void> {
		this.abortCalls++;
	}

	async getConflictFiles(): Promise<string[]> {
		return this.conflictFiles;
	}

	reset(): void {
		this.mergeResult = { success: true, merged: true };
		this.conflictFiles = [];
		this.shouldThrow = false;
		this.throwError = null;
		this.mergeCalls = [];
		this.abortCalls = 0;
	}
}
