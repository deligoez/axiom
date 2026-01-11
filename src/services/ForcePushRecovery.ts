import type { RebaseRetry } from "./RebaseRetry.js";

export interface ForcePushGitService {
	getRef(ref: string): Promise<string>;
	fetch(remote: string, branch: string): Promise<void>;
}

export interface ForcePushRecoveryDeps {
	git: ForcePushGitService;
	rebaseRetry: RebaseRetry;
}

export interface RecoveryResult {
	success: boolean;
	recovered: boolean;
	recoveryCount: number;
	needsPause?: boolean;
	error?: string;
}

const MAX_RECOVERIES = 2;

export class ForcePushRecovery {
	private recoveryCount: Map<string, number> = new Map();

	constructor(private deps: ForcePushRecoveryDeps) {}

	async detectForcePush(beforeRef: string): Promise<boolean> {
		try {
			await this.deps.git.fetch("origin", "main");
			const afterRef = await this.deps.git.getRef("refs/heads/main");
			return beforeRef !== afterRef;
		} catch {
			// Conservative: assume no force-push on error
			return false;
		}
	}

	async recover(taskId: string, _branch: string): Promise<RecoveryResult> {
		await this.deps.git.fetch("origin", "main");

		const rebaseResult = await this.deps.rebaseRetry.rebase("main");

		// Increment recovery count
		const currentCount = this.recoveryCount.get(taskId) || 0;
		const newCount = currentCount + 1;
		this.recoveryCount.set(taskId, newCount);

		if (!rebaseResult.success) {
			return {
				success: false,
				recovered: false,
				recoveryCount: newCount,
				error: rebaseResult.error,
			};
		}

		const needsPause = newCount >= MAX_RECOVERIES;

		return {
			success: true,
			recovered: true,
			recoveryCount: newCount,
			needsPause,
		};
	}

	getRecoveryCount(taskId: string): number {
		return this.recoveryCount.get(taskId) || 0;
	}

	resetRecoveryCount(taskId: string): void {
		this.recoveryCount.delete(taskId);
	}
}
