import { describe, expect, it } from "vitest";
import type {
	SprintConfig,
	SprintStats,
	SprintTarget,
	TaskSprintStat,
} from "./sprint.js";

describe("Sprint Types", () => {
	it("SprintTarget discriminated union has all target types", () => {
		// Arrange & Act
		const taskCountTarget: SprintTarget = {
			type: "taskCount",
			count: 5,
		};

		const durationTarget: SprintTarget = {
			type: "duration",
			minutes: 30,
		};

		const untilTimeTarget: SprintTarget = {
			type: "untilTime",
			endTime: new Date("2026-01-12T18:00:00"),
		};

		const noReadyTarget: SprintTarget = {
			type: "noReady",
		};

		// Assert
		expect(taskCountTarget.type).toBe("taskCount");
		expect(taskCountTarget.count).toBe(5);
		expect(durationTarget.type).toBe("duration");
		expect(durationTarget.minutes).toBe(30);
		expect(untilTimeTarget.type).toBe("untilTime");
		expect(untilTimeTarget.endTime).toEqual(new Date("2026-01-12T18:00:00"));
		expect(noReadyTarget.type).toBe("noReady");
	});

	it("SprintConfig has required fields", () => {
		// Arrange & Act
		const config: SprintConfig = {
			target: { type: "taskCount", count: 10 },
			iterationSettings: {
				maxIterations: 5,
				timeoutMinutes: 30,
			},
			pauseOnStuck: true,
			pauseOnErrors: false,
		};

		// Assert
		expect(config.target.type).toBe("taskCount");
		expect(config.iterationSettings.maxIterations).toBe(5);
		expect(config.iterationSettings.timeoutMinutes).toBe(30);
		expect(config.pauseOnStuck).toBe(true);
		expect(config.pauseOnErrors).toBe(false);
	});

	it("TaskSprintStat has required fields", () => {
		// Arrange & Act
		const taskStat: TaskSprintStat = {
			taskId: "ch-abc1",
			startedAt: new Date("2026-01-12T10:00:00"),
			completedAt: new Date("2026-01-12T10:15:00"),
			iterations: 2,
			qualityPassed: true,
			reviewDecision: "approved",
		};

		// Assert
		expect(taskStat.taskId).toBe("ch-abc1");
		expect(taskStat.startedAt).toEqual(new Date("2026-01-12T10:00:00"));
		expect(taskStat.completedAt).toEqual(new Date("2026-01-12T10:15:00"));
		expect(taskStat.iterations).toBe(2);
		expect(taskStat.qualityPassed).toBe(true);
		expect(taskStat.reviewDecision).toBe("approved");
	});

	it("SprintStats has required fields", () => {
		// Arrange & Act
		const stats: SprintStats = {
			id: "sprint-123",
			startedAt: new Date("2026-01-12T09:00:00"),
			endedAt: new Date("2026-01-12T12:00:00"),
			counts: {
				completed: 8,
				failed: 1,
				skipped: 2,
			},
			taskStats: [
				{
					taskId: "ch-abc1",
					startedAt: new Date("2026-01-12T09:00:00"),
					completedAt: new Date("2026-01-12T09:30:00"),
					iterations: 1,
					qualityPassed: true,
					reviewDecision: "approved",
				},
			],
			settings: {
				target: { type: "duration", minutes: 180 },
				iterationSettings: {
					maxIterations: 5,
					timeoutMinutes: 30,
				},
				pauseOnStuck: true,
				pauseOnErrors: true,
			},
		};

		// Assert
		expect(stats.id).toBe("sprint-123");
		expect(stats.startedAt).toEqual(new Date("2026-01-12T09:00:00"));
		expect(stats.endedAt).toEqual(new Date("2026-01-12T12:00:00"));
		expect(stats.counts.completed).toBe(8);
		expect(stats.counts.failed).toBe(1);
		expect(stats.counts.skipped).toBe(2);
		expect(stats.taskStats).toHaveLength(1);
		expect(stats.taskStats[0].taskId).toBe("ch-abc1");
		expect(stats.settings.target.type).toBe("duration");
	});
});
