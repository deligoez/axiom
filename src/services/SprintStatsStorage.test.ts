import * as fs from "node:fs/promises";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SprintStats } from "../types/sprint.js";
import { SprintStatsStorage } from "./SprintStatsStorage.js";

describe("SprintStatsStorage", () => {
	let tempDir: string;
	let storage: SprintStatsStorage;

	const createTestStats = (
		id: string,
		startedAt: Date = new Date(),
	): SprintStats => ({
		id,
		startedAt,
		endedAt: new Date(startedAt.getTime() + 3600000), // 1 hour later
		counts: { completed: 5, failed: 1, skipped: 0 },
		taskStats: [],
		settings: {
			target: { type: "noReady" },
			iterationSettings: { maxIterations: 50, timeoutMinutes: 30 },
			pauseOnStuck: true,
			pauseOnErrors: true,
		},
	});

	beforeEach(async () => {
		// Create temp directory
		tempDir = path.join(
			process.cwd(),
			".test-tmp",
			`sprint-stats-test-${Date.now()}`,
		);
		await fs.mkdir(tempDir, { recursive: true });
		storage = new SprintStatsStorage(tempDir);
	});

	afterEach(async () => {
		// Cleanup
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	it("saveSprintStats writes to .chorus/sprints/{id}.json", async () => {
		// Arrange
		const stats = createTestStats("sprint-001");

		// Act
		await storage.saveSprintStats(stats);

		// Assert
		const filePath = path.join(
			tempDir,
			".chorus",
			"sprints",
			"sprint-001.json",
		);
		const content = await fs.readFile(filePath, "utf-8");
		const parsed = JSON.parse(content);
		expect(parsed.id).toBe("sprint-001");
		expect(parsed.counts.completed).toBe(5);
	});

	it("saveSprintStats creates .chorus/sprints/ directory if not exists", async () => {
		// Arrange
		const stats = createTestStats("sprint-002");

		// Act
		await storage.saveSprintStats(stats);

		// Assert
		const dirPath = path.join(tempDir, ".chorus", "sprints");
		const dirExists = await fs
			.access(dirPath)
			.then(() => true)
			.catch(() => false);
		expect(dirExists).toBe(true);
	});

	it("loadSprintStats returns parsed SprintStats for existing file", async () => {
		// Arrange
		const stats = createTestStats("sprint-003");
		await storage.saveSprintStats(stats);

		// Act
		const loaded = await storage.loadSprintStats("sprint-003");

		// Assert
		expect(loaded).not.toBeNull();
		expect(loaded?.id).toBe("sprint-003");
		expect(loaded?.counts.completed).toBe(5);
		expect(loaded?.counts.failed).toBe(1);
	});

	it("loadSprintStats returns null for non-existent file", async () => {
		// Arrange - no file created

		// Act
		const loaded = await storage.loadSprintStats("sprint-nonexistent");

		// Assert
		expect(loaded).toBeNull();
	});

	it("listSprintStats returns all sprints sorted by date (most recent first)", async () => {
		// Arrange - create sprints with different dates
		const oldDate = new Date("2026-01-10T10:00:00Z");
		const recentDate = new Date("2026-01-12T10:00:00Z");
		const middleDate = new Date("2026-01-11T10:00:00Z");

		await storage.saveSprintStats(createTestStats("sprint-old", oldDate));
		await storage.saveSprintStats(createTestStats("sprint-recent", recentDate));
		await storage.saveSprintStats(createTestStats("sprint-middle", middleDate));

		// Act
		const sprints = await storage.listSprintStats();

		// Assert
		expect(sprints).toHaveLength(3);
		expect(sprints[0].id).toBe("sprint-recent");
		expect(sprints[1].id).toBe("sprint-middle");
		expect(sprints[2].id).toBe("sprint-old");
	});

	it("listSprintStats returns empty array when no sprints exist", async () => {
		// Arrange - no sprints saved

		// Act
		const sprints = await storage.listSprintStats();

		// Assert
		expect(sprints).toEqual([]);
	});
});
