import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SprintStatsStorage } from "../services/SprintStatsStorage.js";
import {
	cleanupTestProject,
	createStatusBead,
	createTestProject,
} from "../test-utils/e2e-fixtures.js";
import type { SprintStats, TaskSprintStat } from "../types/sprint.js";

// Helper to create sprint stats simulating a completed sprint
const createSprintStats = (
	id: string,
	taskStats: TaskSprintStat[],
): SprintStats => {
	const completed = taskStats.filter(
		(t) => t.reviewDecision === "approved",
	).length;
	const failed = taskStats.filter(
		(t) => t.reviewDecision === "rejected",
	).length;

	return {
		id,
		startedAt: new Date("2026-01-12T10:00:00Z"),
		endedAt: new Date("2026-01-12T11:00:00Z"),
		counts: { completed, failed, skipped: 0 },
		taskStats,
		settings: {
			target: { type: "taskCount", count: 2 },
			iterationSettings: { maxIterations: 50, timeoutMinutes: 30 },
			pauseOnStuck: true,
			pauseOnErrors: true,
		},
	};
};

describe("E2E: Sprint Stats (E2E-S03)", () => {
	let projectDir: string;

	beforeEach(() => {
		projectDir = "";
	});

	afterEach(() => {
		if (projectDir) {
			cleanupTestProject(projectDir);
		}
	});

	it("saves sprint stats with 2 tasks (1 success, 1 fail) to .chorus/sprints/", async () => {
		// Arrange - create project with tasks
		projectDir = createTestProject([
			createStatusBead("ch-sp1", "Task 1 - Success", "done"),
			createStatusBead("ch-sp2", "Task 2 - Failed", "todo"),
		]);

		const storage = new SprintStatsStorage(projectDir);

		// Create task stats simulating sprint completion
		const taskStats: TaskSprintStat[] = [
			{
				taskId: "ch-sp1",
				startedAt: new Date("2026-01-12T10:00:00Z"),
				completedAt: new Date("2026-01-12T10:30:00Z"),
				iterations: 1,
				qualityPassed: true,
				reviewDecision: "approved",
			},
			{
				taskId: "ch-sp2",
				startedAt: new Date("2026-01-12T10:30:00Z"),
				completedAt: new Date("2026-01-12T11:00:00Z"),
				iterations: 3,
				qualityPassed: false,
				reviewDecision: "rejected",
			},
		];

		const stats = createSprintStats("sprint-e2e-001", taskStats);

		// Act - save sprint stats
		await storage.saveSprintStats(stats);

		// Assert - file exists in .chorus/sprints/
		const sprintsDir = path.join(projectDir, ".chorus", "sprints");
		expect(fs.existsSync(sprintsDir)).toBe(true);

		const statsFile = path.join(sprintsDir, "sprint-e2e-001.json");
		expect(fs.existsSync(statsFile)).toBe(true);
	});

	it("sprint stats contain correct counts (completed: 1, failed: 1)", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-sp3", "Success Task", "done"),
			createStatusBead("ch-sp4", "Failed Task", "stuck"),
		]);

		const storage = new SprintStatsStorage(projectDir);

		const taskStats: TaskSprintStat[] = [
			{
				taskId: "ch-sp3",
				startedAt: new Date("2026-01-12T10:00:00Z"),
				completedAt: new Date("2026-01-12T10:20:00Z"),
				iterations: 1,
				qualityPassed: true,
				reviewDecision: "approved",
			},
			{
				taskId: "ch-sp4",
				startedAt: new Date("2026-01-12T10:20:00Z"),
				completedAt: new Date("2026-01-12T10:50:00Z"),
				iterations: 5,
				qualityPassed: false,
				reviewDecision: "rejected",
			},
		];

		const stats = createSprintStats("sprint-e2e-002", taskStats);
		await storage.saveSprintStats(stats);

		// Act - load stats
		const loaded = await storage.loadSprintStats("sprint-e2e-002");

		// Assert - counts correct
		expect(loaded).not.toBeNull();
		expect(loaded?.counts.completed).toBe(1);
		expect(loaded?.counts.failed).toBe(1);
		expect(loaded?.counts.skipped).toBe(0);
	});

	it("per-task stats contain timing and result information", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-sp5", "Timed Task", "done"),
		]);

		const storage = new SprintStatsStorage(projectDir);

		const taskStats: TaskSprintStat[] = [
			{
				taskId: "ch-sp5",
				startedAt: new Date("2026-01-12T10:00:00Z"),
				completedAt: new Date("2026-01-12T10:45:00Z"),
				iterations: 2,
				qualityPassed: true,
				reviewDecision: "approved",
			},
		];

		const stats = createSprintStats("sprint-e2e-003", taskStats);
		await storage.saveSprintStats(stats);

		// Act - load and check task stats
		const loaded = await storage.loadSprintStats("sprint-e2e-003");

		// Assert - per-task stats present with timing
		expect(loaded?.taskStats).toHaveLength(1);

		const taskStat = loaded?.taskStats[0];
		expect(taskStat?.taskId).toBe("ch-sp5");
		expect(taskStat?.iterations).toBe(2);
		expect(taskStat?.qualityPassed).toBe(true);
		expect(taskStat?.reviewDecision).toBe("approved");
		// Timing info present (as ISO strings after JSON serialization)
		expect(taskStat?.startedAt).toBeDefined();
		expect(taskStat?.completedAt).toBeDefined();
	});

	it("sprint stats can be listed and retrieved by ID", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-sp6", "List Test Task", "done"),
		]);

		const storage = new SprintStatsStorage(projectDir);

		// Save multiple sprints
		const stats1 = createSprintStats("sprint-list-a", []);
		const stats2 = createSprintStats("sprint-list-b", []);
		await storage.saveSprintStats(stats1);
		await storage.saveSprintStats(stats2);

		// Act - list all sprints
		const allSprints = await storage.listSprintStats();

		// Assert - both sprints listed
		expect(allSprints.length).toBeGreaterThanOrEqual(2);

		const ids = allSprints.map((s) => s.id);
		expect(ids).toContain("sprint-list-a");
		expect(ids).toContain("sprint-list-b");
	});
});
