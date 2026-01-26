import { EventEmitter } from "node:events";

export interface EscalationRequest {
	taskId: string;
	worktreePath: string;
	conflictFiles: string[];
	retryCount: number;
	lastAttempt: "auto" | "rebase" | "agent";
	error?: string;
}

export interface EscalationResult {
	action: "merged" | "skipped" | "cancelled";
}

const ESCALATION_THRESHOLD = 3;

export class HumanEscalation extends EventEmitter {
	private pending: EscalationRequest | null = null;
	private resolve: ((result: EscalationResult) => void) | null = null;

	shouldEscalate(request: EscalationRequest): boolean {
		return request.retryCount >= ESCALATION_THRESHOLD;
	}

	escalate(request: EscalationRequest): Promise<EscalationResult> {
		this.pending = request;

		return new Promise<EscalationResult>((resolve) => {
			this.resolve = resolve;
			this.emit("escalated", request);
		});
	}

	markResolved(): void {
		this.clearPending({ action: "merged" });
		this.emit("resolved");
	}

	markSkipped(): void {
		this.clearPending({ action: "skipped" });
		this.emit("skipped");
	}

	markCancelled(): void {
		this.clearPending({ action: "cancelled" });
		this.emit("cancelled");
	}

	hasPending(): boolean {
		return this.pending !== null;
	}

	getPending(): EscalationRequest | null {
		return this.pending;
	}

	private clearPending(result: EscalationResult): void {
		this.pending = null;
		if (this.resolve) {
			this.resolve(result);
			this.resolve = null;
		}
	}
}
