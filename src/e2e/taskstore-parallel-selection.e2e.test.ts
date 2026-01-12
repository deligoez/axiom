import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TaskStore } from "../services/TaskStore.js";

describe("E2E: TaskStore Parallel Selection", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = join(
			tmpdir(),
			`chorus-taskstore-parallel-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		);
		mkdirSync(tempDir, { recursive: true });
	});

	afterEach(() => {
		try {
			rmSync(tempDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	it("two agents claim different tasks concurrently", async () => {
		// Arrange
		const store = new TaskStore(tempDir);
		store.create({ title: "Task 1" });
		store.create({ title: "Task 2" });

		// Act - agent1 selects and claims
		const agent1Task = store.selectNext();
		expect(agent1Task).toBeDefined();
		store.claim(agent1Task!.id);

		// Agent2 selects with exclusion
		const agent2Task = store.selectNext({ excludeIds: [agent1Task!.id] });

		// Assert - should get different task
		expect(agent2Task).toBeDefined();
		expect(agent2Task!.id).not.toBe(agent1Task!.id);

		// Both agents can claim their tasks
		store.claim(agent2Task!.id);
		expect(store.get(agent1Task!.id)?.status).toBe("doing");
		expect(store.get(agent2Task!.id)?.status).toBe("doing");
	});

	it("excludeIds prevents double-claiming", () => {
		// Arrange
		const store = new TaskStore(tempDir);
		const task1 = store.create({ title: "Task 1" });
		const task2 = store.create({ title: "Task 2" });

		// Agent1 claims task1
		store.claim(task1.id);

		// Act - agent2 selects with task1 excluded
		const selected = store.selectNext({ excludeIds: [task1.id] });

		// Assert - should NOT select task1 (doing status already excludes it)
		// but exclusion ensures we don't even consider it
		expect(selected?.id).toBe(task2.id);
	});

	it("race condition throws on double-claim attempt", () => {
		// Arrange - single task, two agents trying to claim
		const store = new TaskStore(tempDir);
		const task = store.create({ title: "Contested Task" });

		// Agent1 claims successfully
		store.claim(task.id);

		// Act & Assert - Agent2 trying to claim same task throws
		expect(() => store.claim(task.id)).toThrow(
			"status is 'doing', expected 'todo'",
		);
	});
});
