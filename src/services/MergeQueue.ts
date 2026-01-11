export type MergeItemStatus = "ready" | "waiting_dependency" | "processing";

export interface MergeItem {
	taskId: string;
	branch: string;
	worktree: string;
	priority: 0 | 1 | 2 | 3 | 4;
	enqueuedAt: number;
	status: MergeItemStatus;
	dependencies: string[];
	retryCount: number;
	deferredAt?: number; // Timestamp when deferred, used for sorting
}

export interface QueueStats {
	pending: number;
	waiting: number;
	processing: number;
	completed: number;
	failed: number;
}

export const PRIORITY_BOOST: Record<number, number> = {
	0: 200,
	1: 100,
	2: 50,
	3: 10,
	4: 0,
};

export class MergeQueue {
	private items: MergeItem[] = [];
	private completed: Set<string> = new Set();
	private stats = {
		completed: 0,
		failed: 0,
	};

	enqueue(item: Omit<MergeItem, "enqueuedAt" | "status" | "retryCount">): void {
		const fullItem: MergeItem = {
			...item,
			enqueuedAt: Date.now(),
			status: this.hasUnmergedDependencies(item.dependencies)
				? "waiting_dependency"
				: "ready",
			retryCount: 0,
		};

		this.items.push(fullItem);
		this.sortQueue();
	}

	dequeue(): MergeItem | null {
		// Find first ready item
		const index = this.items.findIndex((item) => item.status === "ready");
		if (index === -1) {
			return null;
		}

		const item = this.items[index];
		item.status = "processing";
		return item;
	}

	deferToEnd(taskId: string): void {
		const index = this.items.findIndex((item) => item.taskId === taskId);
		if (index === -1) return;

		const item = this.items[index];
		item.retryCount++;
		item.status = "ready";
		item.deferredAt = Date.now(); // Mark as deferred so it sorts after non-deferred

		// Remove and re-add to trigger re-sort
		this.items.splice(index, 1);
		this.items.push(item);
		this.sortQueue();
	}

	markCompleted(taskId: string): void {
		const index = this.items.findIndex((item) => item.taskId === taskId);
		if (index !== -1) {
			this.items.splice(index, 1);
		}

		this.completed.add(taskId);
		this.stats.completed++;

		// Update dependencies - check if any waiting items can now be ready
		this.updateDependencyStatus();
	}

	markFailed(taskId: string): { needsEscalation: boolean } {
		const index = this.items.findIndex((item) => item.taskId === taskId);
		let needsEscalation = false;

		if (index !== -1) {
			const item = this.items[index];
			needsEscalation = item.retryCount >= 3;
			this.items.splice(index, 1);
		}

		this.stats.failed++;
		return { needsEscalation };
	}

	getStats(): QueueStats {
		let pending = 0;
		let waiting = 0;
		let processing = 0;

		for (const item of this.items) {
			switch (item.status) {
				case "ready":
					pending++;
					break;
				case "waiting_dependency":
					waiting++;
					break;
				case "processing":
					processing++;
					break;
			}
		}

		return {
			pending,
			waiting,
			processing,
			completed: this.stats.completed,
			failed: this.stats.failed,
		};
	}

	private hasUnmergedDependencies(dependencies: string[]): boolean {
		if (!dependencies || dependencies.length === 0) {
			return false;
		}

		// Check if any dependency is not yet completed
		for (const dep of dependencies) {
			if (!this.completed.has(dep)) {
				return true;
			}
		}
		return false;
	}

	private updateDependencyStatus(): void {
		for (const item of this.items) {
			if (
				item.status === "waiting_dependency" &&
				!this.hasUnmergedDependencies(item.dependencies)
			) {
				item.status = "ready";
			}
		}
		this.sortQueue();
	}

	private sortQueue(): void {
		this.items.sort((a, b) => {
			// Processing items stay where they are (they're being worked on)
			if (a.status === "processing" && b.status !== "processing") return -1;
			if (b.status === "processing" && a.status !== "processing") return 1;

			// Waiting items go after ready items
			if (a.status === "waiting_dependency" && b.status === "ready") return 1;
			if (b.status === "waiting_dependency" && a.status === "ready") return -1;

			// Deferred items go after non-deferred items
			if (a.deferredAt && !b.deferredAt) return 1;
			if (b.deferredAt && !a.deferredAt) return -1;

			// For items with same status, sort by priority boost then FIFO
			const scoreA = this.calculateScore(a);
			const scoreB = this.calculateScore(b);
			return scoreB - scoreA; // Higher score first
		});
	}

	private calculateScore(item: MergeItem): number {
		const priorityBoost = PRIORITY_BOOST[item.priority] ?? 0;
		// Use negative enqueuedAt so older items have higher score
		const ageBonus = -item.enqueuedAt / 1000000; // Normalize to reasonable range
		return priorityBoost * 1000 + ageBonus;
	}
}
