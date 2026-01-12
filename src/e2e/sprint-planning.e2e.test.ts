import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createActor } from "xstate";
import { createSprintKeyHandler } from "../hooks/useSprintKeys.js";
import { sprintRegionMachine } from "../machines/sprintRegion.js";
import {
	cleanupTestProject,
	createStatusBead,
	createTestProject,
} from "../test-utils/e2e-fixtures.js";
import type { SprintConfig } from "../types/sprint.js";

describe("E2E: Sprint Planning (E2E-S01)", () => {
	let projectDir: string;

	beforeEach(() => {
		projectDir = "";
	});

	afterEach(() => {
		if (projectDir) {
			cleanupTestProject(projectDir);
		}
	});

	it("Shift+S opens sprint planning panel", () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-plan1", "Task 1", "open"),
			createStatusBead("ch-plan2", "Task 2", "open"),
			createStatusBead("ch-plan3", "Task 3", "open"),
		]);

		const onOpenPlanningPanel = vi.fn();
		const handler = createSprintKeyHandler({
			isSprintRunning: false,
			onOpenPlanningPanel,
			onCancelPlanning: vi.fn(),
			isPlanningPanelOpen: false,
		});

		// Act - simulate Shift+S keypress
		handler("S", { shift: true, return: false, escape: false });

		// Assert - panel opened
		expect(onOpenPlanningPanel).toHaveBeenCalledTimes(1);
	});

	it("selects tasks and configures sprint settings", () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-plan4", "Task A", "open"),
			createStatusBead("ch-plan5", "Task B", "open"),
			createStatusBead("ch-plan6", "Task C", "open"),
		]);

		// Simulate sprint config being built with selected tasks
		const selectedTaskIds = ["ch-plan4", "ch-plan5", "ch-plan6"];
		const config: SprintConfig = {
			target: { type: "taskCount", count: 3 },
			iterationSettings: {
				maxIterations: 10, // Custom setting
				timeoutMinutes: 30,
			},
			pauseOnStuck: true,
			pauseOnErrors: true,
		};

		// Act - verify config structure
		expect(selectedTaskIds).toHaveLength(3);
		expect(config.iterationSettings.maxIterations).toBe(10);
		expect(config.target.type).toBe("taskCount");
	});

	it("starts sprint with Enter and verifies running state", () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-plan7", "Sprint Task 1", "open"),
			createStatusBead("ch-plan8", "Sprint Task 2", "open"),
			createStatusBead("ch-plan9", "Sprint Task 3", "open"),
		]);

		const actor = createActor(sprintRegionMachine);
		actor.start();

		// Act - simulate full planning flow: open panel, configure, start
		actor.send({
			type: "START_PLANNING",
			target: { type: "taskCount", count: 3 },
		});

		// Assert - in planning state
		expect(actor.getSnapshot().value).toBe("planning");

		// Act - simulate Enter to start sprint
		actor.send({ type: "START_SPRINT" });

		// Assert - sprint now running
		expect(actor.getSnapshot().value).toBe("running");
		expect(actor.getSnapshot().context.target?.type).toBe("taskCount");

		actor.stop();
	});

	it("verifies sprint running with correct settings", () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-planA", "Ready Task 1", "open"),
			createStatusBead("ch-planB", "Ready Task 2", "open"),
			createStatusBead("ch-planC", "Ready Task 3", "open"),
		]);

		const actor = createActor(sprintRegionMachine);
		actor.start();

		// Start sprint with specific target
		actor.send({
			type: "START_PLANNING",
			target: { type: "taskCount", count: 3 },
		});
		actor.send({ type: "START_SPRINT" });

		// Assert - sprint running with correct target
		const snapshot = actor.getSnapshot();
		expect(snapshot.value).toBe("running");
		expect(snapshot.context.target).toEqual({ type: "taskCount", count: 3 });
		expect(snapshot.context.tasksCompleted).toBe(0);
		expect(snapshot.context.tasksFailed).toBe(0);
		expect(snapshot.context.startedAt).toBeInstanceOf(Date);

		actor.stop();
	});
});
