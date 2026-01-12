import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TaskStore } from "../services/TaskStore.js";

describe("E2E: TaskStore Selection", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = join(
			tmpdir(),
			`chorus-taskstore-selection-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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

	it("selection prefers unblocking tasks", () => {
		// Arrange - create tasks where one unblocks others
		const store = new TaskStore(tempDir);
		const regularTask = store.create({ title: "Regular Task" });
		const blockerTask = store.create({ title: "Blocker Task" });

		// Create dependent tasks that will be stuck until blocker is done
		store.create({
			title: "Dependent 1",
			dependencies: [blockerTask.id],
		});
		store.create({
			title: "Dependent 2",
			dependencies: [blockerTask.id],
		});

		// Act
		const selected = store.selectNext();

		// Assert - should prefer blocker because it unblocks 2 tasks
		expect(selected?.id).toBe(blockerTask.id);
	});

	it("selection continues series (same tag)", () => {
		// Arrange - create tasks with different tags
		const store = new TaskStore(tempDir);
		const featureTask1 = store.create({
			title: "Feature Task 1",
			tags: ["feature-a"],
		});
		const featureTask2 = store.create({
			title: "Feature Task 2",
			tags: ["feature-a"],
		});
		const bugTask = store.create({
			title: "Bug Task",
			tags: ["bug"],
		});

		// Complete the first feature task
		store.claim(featureTask1.id);
		store.complete(featureTask1.id);

		// Act - select next with context of last completed
		const selected = store.selectNext({ lastCompletedTaskId: featureTask1.id });

		// Assert - should continue with same-tagged task
		expect(selected?.id).toBe(featureTask2.id);
	});

	it("selection respects next tag override", () => {
		// Arrange - create multiple tasks, one with 'next' tag
		const store = new TaskStore(tempDir);
		const regularTask1 = store.create({ title: "Regular Task 1" });
		const regularTask2 = store.create({ title: "Regular Task 2" });
		const priorityTask = store.create({
			title: "Priority Task",
			tags: ["next"],
		});

		// Act
		const selected = store.selectNext();

		// Assert - should select 'next' tagged task regardless of order
		expect(selected?.id).toBe(priorityTask.id);
	});

	it("selection focuses on milestone completion", () => {
		// Arrange - create tasks with different milestones
		const store = new TaskStore(tempDir);

		// Create and complete tasks in milestone-a
		const milestoneATask1 = store.create({
			title: "Milestone A Task 1",
			tags: ["m1-milestone-a"],
		});
		store.claim(milestoneATask1.id);
		store.complete(milestoneATask1.id);

		const milestoneATask2 = store.create({
			title: "Milestone A Task 2",
			tags: ["m1-milestone-a"],
		});
		store.claim(milestoneATask2.id);
		store.complete(milestoneATask2.id);

		// Create remaining tasks
		const milestoneATask3 = store.create({
			title: "Milestone A Task 3 (remaining)",
			tags: ["m1-milestone-a"],
		});
		const milestoneBTask = store.create({
			title: "Milestone B Task",
			tags: ["m2-milestone-b"],
		});

		// Act
		const selected = store.selectNext();

		// Assert - should prefer milestone-a (2 tasks already done there)
		expect(selected?.id).toBe(milestoneATask3.id);
	});
});
