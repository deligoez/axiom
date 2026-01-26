import { beforeEach, describe, expect, it } from "vitest";
import { type MergeItem, MergeQueue } from "./MergeQueue.js";

describe("MergeQueue", () => {
	let queue: MergeQueue;

	const createItem = (
		taskId: string,
		priority: MergeItem["priority"] = 3,
		dependencies: string[] = [],
	): Omit<MergeItem, "enqueuedAt" | "status" | "retryCount"> => ({
		taskId,
		branch: `agent/claude/${taskId}`,
		worktree: `/worktrees/${taskId}`,
		priority,
		dependencies,
	});

	beforeEach(() => {
		queue = new MergeQueue();
	});

	// F24: enqueue() - 4 tests
	describe("enqueue()", () => {
		it("adds item to queue", () => {
			// Arrange
			const item = createItem("ch-001");

			// Act
			queue.enqueue(item);

			// Assert
			const stats = queue.getStats();
			expect(stats.pending + stats.waiting).toBe(1);
		});

		it("items sorted by priority boost (P0:+200 > P1:+100 > P2:+50 > P3:+10 > P4:+0)", () => {
			// Arrange
			queue.enqueue(createItem("ch-p4", 4));
			queue.enqueue(createItem("ch-p0", 0));
			queue.enqueue(createItem("ch-p2", 2));
			queue.enqueue(createItem("ch-p1", 1));
			queue.enqueue(createItem("ch-p3", 3));

			// Act - dequeue should return in priority order
			const first = queue.dequeue();
			const second = queue.dequeue();
			const third = queue.dequeue();

			// Assert
			expect(first?.taskId).toBe("ch-p0");
			expect(second?.taskId).toBe("ch-p1");
			expect(third?.taskId).toBe("ch-p2");
		});

		it("same priority items sorted by enqueuedAt (FIFO)", async () => {
			// Arrange - add items with same priority
			queue.enqueue(createItem("ch-first", 2));
			// Slight delay to ensure different timestamp
			await new Promise((r) => setTimeout(r, 5));
			queue.enqueue(createItem("ch-second", 2));

			// Act
			const first = queue.dequeue();
			const second = queue.dequeue();

			// Assert
			expect(first?.taskId).toBe("ch-first");
			expect(second?.taskId).toBe("ch-second");
		});

		it("sets status to 'waiting_dependency' if item has unmerged dependencies", () => {
			// Arrange
			queue.enqueue(createItem("ch-dep", 1)); // Dependency first, not merged yet

			// Act
			queue.enqueue(createItem("ch-dependent", 1, ["ch-dep"]));

			// Assert
			const stats = queue.getStats();
			expect(stats.waiting).toBe(1); // ch-dependent is waiting
			expect(stats.pending).toBe(1); // ch-dep is pending (ready)
		});
	});

	// F24: dequeue() - 5 tests
	describe("dequeue()", () => {
		it("returns highest priority item with status: 'ready'", () => {
			// Arrange
			queue.enqueue(createItem("ch-low", 4));
			queue.enqueue(createItem("ch-high", 1));

			// Act
			const result = queue.dequeue();

			// Assert
			expect(result?.taskId).toBe("ch-high");
			expect(result?.status).toBe("processing");
		});

		it("skips items with status: 'waiting_dependency'", () => {
			// Arrange
			queue.enqueue(createItem("ch-dep", 2));
			queue.enqueue(createItem("ch-dependent", 1, ["ch-dep"])); // Higher priority but waiting

			// Act
			const result = queue.dequeue();

			// Assert - should get ch-dep despite lower priority because ch-dependent is waiting
			expect(result?.taskId).toBe("ch-dep");
		});

		it("returns null when queue empty", () => {
			// Arrange - empty queue

			// Act
			const result = queue.dequeue();

			// Assert
			expect(result).toBeNull();
		});

		it("sets returned item as status: 'processing'", () => {
			// Arrange
			queue.enqueue(createItem("ch-001"));

			// Act
			const item = queue.dequeue();

			// Assert
			expect(item?.status).toBe("processing");
		});

		it("updates 'waiting_dependency' to 'ready' when deps merge", () => {
			// Arrange
			queue.enqueue(createItem("ch-dep", 2));
			queue.enqueue(createItem("ch-dependent", 1, ["ch-dep"]));

			// Act - mark dependency as completed
			const dep = queue.dequeue(); // ch-dep
			queue.markCompleted(dep!.taskId);

			// Now ch-dependent should be ready
			const dependent = queue.dequeue();

			// Assert
			expect(dependent?.taskId).toBe("ch-dependent");
			expect(dependent?.status).toBe("processing");
		});
	});

	// F24: deferToEnd() - 2 tests
	describe("deferToEnd()", () => {
		it("moves conflicted item to end of queue", () => {
			// Arrange
			queue.enqueue(createItem("ch-conflict", 1));
			queue.enqueue(createItem("ch-normal", 2));

			const conflicted = queue.dequeue(); // ch-conflict (P1)

			// Act
			queue.deferToEnd(conflicted!.taskId);

			// Assert - ch-normal should be next despite lower priority
			const next = queue.dequeue();
			expect(next?.taskId).toBe("ch-normal");
		});

		it("increments retry count on item", () => {
			// Arrange
			queue.enqueue(createItem("ch-001"));
			const item = queue.dequeue();

			// Act
			queue.deferToEnd(item!.taskId);
			const deferred = queue.dequeue();

			// Assert
			expect(deferred?.retryCount).toBe(1);
		});
	});

	// F24: markCompleted() - 2 tests
	describe("markCompleted()", () => {
		it("clears 'processing', increments stats.completed", () => {
			// Arrange
			queue.enqueue(createItem("ch-001"));
			queue.dequeue(); // status: 'processing'

			// Act
			queue.markCompleted("ch-001");

			// Assert
			const stats = queue.getStats();
			expect(stats.completed).toBe(1);
			expect(stats.processing).toBe(0);
		});

		it("triggers dependency check for waiting items (notify dependents)", () => {
			// Arrange
			queue.enqueue(createItem("ch-dep", 2));
			queue.enqueue(createItem("ch-dependent", 1, ["ch-dep"]));

			// Get stats before
			const statsBefore = queue.getStats();
			expect(statsBefore.waiting).toBe(1);

			// Mark dependency as processing then completed
			queue.dequeue(); // ch-dep
			queue.markCompleted("ch-dep");

			// Act
			const statsAfter = queue.getStats();

			// Assert - dependent should now be ready (pending), not waiting
			expect(statsAfter.waiting).toBe(0);
			expect(statsAfter.pending).toBe(1);
		});
	});

	// F24: markFailed() - 2 tests
	describe("markFailed()", () => {
		it("clears 'processing', increments stats.failed", () => {
			// Arrange
			queue.enqueue(createItem("ch-001"));
			queue.dequeue();

			// Act
			const result = queue.markFailed("ch-001");

			// Assert
			const stats = queue.getStats();
			expect(stats.failed).toBe(1);
			expect(stats.processing).toBe(0);
			expect(result.needsEscalation).toBe(false);
		});

		it("returns { needsEscalation: true } after 3 retries", () => {
			// Arrange
			queue.enqueue(createItem("ch-001"));

			// Retry 3 times
			for (let i = 0; i < 3; i++) {
				queue.dequeue();
				queue.deferToEnd("ch-001");
			}

			// 4th attempt
			queue.dequeue();

			// Act
			const result = queue.markFailed("ch-001");

			// Assert
			expect(result.needsEscalation).toBe(true);
		});
	});

	// F24: getStats() - 1 test
	describe("getStats()", () => {
		it("returns accurate pending/processing/completed/failed/waiting counts", () => {
			// Arrange - use different priorities to ensure deterministic order
			queue.enqueue(createItem("ch-dep", 0)); // P0 - highest priority, will be processed first
			queue.enqueue(createItem("ch-ready1", 3));
			queue.enqueue(createItem("ch-ready2", 4)); // lowest priority
			queue.enqueue(createItem("ch-waiting", 2, ["ch-dep"])); // P2 but waiting on ch-dep

			// Process ch-dep (P0, highest priority)
			const dep = queue.dequeue();
			expect(dep?.taskId).toBe("ch-dep");
			queue.markCompleted("ch-dep"); // ch-waiting now becomes ready

			// Now ch-waiting (P2) is highest priority among ready items
			const waiting = queue.dequeue();
			expect(waiting?.taskId).toBe("ch-waiting");
			queue.markFailed("ch-waiting");

			// Process ch-ready1 (P3)
			queue.dequeue();

			// Act
			const stats = queue.getStats();

			// Assert
			expect(stats.pending).toBe(1); // ch-ready2 left
			expect(stats.processing).toBe(1); // ch-ready1 processing
			expect(stats.completed).toBe(1); // ch-dep completed
			expect(stats.failed).toBe(1); // ch-waiting failed
			expect(stats.waiting).toBe(0);
		});
	});
});
