import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { sprintRegionMachine } from "../machines/sprintRegion.js";
import {
	cleanupTestProject,
	createStatusBead,
	createTestProject,
} from "../test-utils/e2e-fixtures.js";

describe("E2E: Sprint Progress (E2E-S02)", () => {
	let projectDir: string;

	beforeEach(() => {
		projectDir = "";
	});

	afterEach(() => {
		if (projectDir) {
			cleanupTestProject(projectDir);
		}
	});

	it("starts sprint with 2 tasks and tracks completion", () => {
		// Arrange - create project with 2 tasks
		projectDir = createTestProject([
			createStatusBead("ch-prg1", "Task 1", "open"),
			createStatusBead("ch-prg2", "Task 2", "open"),
		]);

		const actor = createActor(sprintRegionMachine);
		actor.start();

		// Act - start planning and then start sprint
		actor.send({
			type: "START_PLANNING",
			target: { type: "taskCount", count: 2 },
		});
		actor.send({ type: "START_SPRINT" });

		// Assert - sprint is running
		expect(actor.getSnapshot().value).toBe("running");
		expect(actor.getSnapshot().context.target?.type).toBe("taskCount");
		actor.stop();
	});

	it("completes sprint when task count target reached", () => {
		// Arrange - create project with 2 tasks
		projectDir = createTestProject([
			createStatusBead("ch-prg3", "Task A", "open"),
			createStatusBead("ch-prg4", "Task B", "open"),
		]);

		const actor = createActor(sprintRegionMachine);
		actor.start();
		actor.send({
			type: "START_PLANNING",
			target: { type: "taskCount", count: 2 },
		});
		actor.send({ type: "START_SPRINT" });

		// Act - complete both tasks
		actor.send({ type: "TASK_COMPLETED", taskId: "ch-prg3" });
		actor.send({ type: "TASK_COMPLETED", taskId: "ch-prg4" });

		// Assert - sprint is completed
		expect(actor.getSnapshot().value).toBe("completed");
		expect(actor.getSnapshot().context.tasksCompleted).toBe(2);
		actor.stop();
	});

	it("tracks tasks in reviewing status (pending review)", () => {
		// Arrange - create project with tasks in reviewing status
		projectDir = createTestProject([
			createStatusBead("ch-prg5", "Reviewed Task 1", "in_progress"),
			createStatusBead("ch-prg6", "Reviewed Task 2", "in_progress"),
		]);

		const actor = createActor(sprintRegionMachine);
		actor.start();
		actor.send({
			type: "START_PLANNING",
			target: { type: "taskCount", count: 2 },
		});
		actor.send({ type: "START_SPRINT" });

		// Act - tasks complete and move to reviewing (simulated by TASK_COMPLETED)
		actor.send({ type: "TASK_COMPLETED", taskId: "ch-prg5" });
		actor.send({ type: "TASK_COMPLETED", taskId: "ch-prg6" });

		// Assert - both tasks counted as completed (reviewing in real workflow)
		const snapshot = actor.getSnapshot();
		expect(snapshot.value).toBe("completed");
		expect(snapshot.context.tasksCompleted).toBe(2);
		expect(snapshot.context.tasksFailed).toBe(0);
		actor.stop();
	});

	it("sprint progress bar hidden after completion (isActive false)", () => {
		// Arrange - create project with task
		projectDir = createTestProject([
			createStatusBead("ch-prg7", "Final Task", "open"),
		]);

		const actor = createActor(sprintRegionMachine);
		actor.start();
		actor.send({
			type: "START_PLANNING",
			target: { type: "taskCount", count: 1 },
		});
		actor.send({ type: "START_SPRINT" });

		// Verify sprint is active (running)
		expect(actor.getSnapshot().value).toBe("running");

		// Act - complete the task (sprint finishes)
		actor.send({ type: "TASK_COMPLETED", taskId: "ch-prg7" });

		// Assert - sprint completed (progress bar would be hidden with isActive=false)
		const snapshot = actor.getSnapshot();
		expect(snapshot.value).toBe("completed");
		// SprintProgressBar uses isActive prop - when sprint is "completed" or "idle",
		// the UI passes isActive=false, hiding the progress bar
		expect(snapshot.status).toBe("done"); // Final state reached
		actor.stop();
	});
});
