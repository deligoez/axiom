import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PendingReview } from "../machines/reviewRegion.js";
import type { ReviewState } from "../services/ReviewPersistence.js";
import { ReviewPersistence } from "../services/ReviewPersistence.js";
import {
	cleanupTestProject,
	createStatusBead,
	createTestProject,
} from "../test-utils/e2e-fixtures.js";
import {
	cleanupPty,
	type PtyTestResult,
	renderAppWithPty,
} from "../test-utils/pty-helpers.js";

// Helper to create a PendingReview
const createPendingReview = (taskId: string): PendingReview => ({
	taskId,
	result: {
		taskId,
		agentId: "agent-1",
		iterations: 1,
		duration: 1000,
		signal: null,
		quality: [{ name: "test", passed: true, duration: 100 }],
		changes: [],
	},
	addedAt: Date.now(),
});

describe("E2E: Review Persistence (R06)", () => {
	let projectDir: string;
	let ptyResult: PtyTestResult | null = null;

	beforeEach(() => {
		projectDir = "";
	});

	afterEach(() => {
		if (ptyResult) {
			cleanupPty(ptyResult);
			ptyResult = null;
		}
		if (projectDir) {
			cleanupTestProject(projectDir);
		}
	});

	it("ReviewPersistence saves state to .chorus/state.json", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-rp1", "Task 1", "review"),
			createStatusBead("ch-rp2", "Task 2", "review"),
		]);

		const persistence = new ReviewPersistence(projectDir);
		const reviews = [
			createPendingReview("ch-rp1"),
			createPendingReview("ch-rp2"),
		];

		// Act
		await persistence.save(reviews, 1); // At second task (index 1)

		// Assert
		const statePath = path.join(projectDir, ".chorus", "state.json");
		expect(fs.existsSync(statePath)).toBe(true);

		const content = JSON.parse(fs.readFileSync(statePath, "utf-8")) as {
			review: ReviewState;
		};
		expect(content.review.pendingReviews).toHaveLength(2);
		expect(content.review.currentIndex).toBe(1);
	});

	it("ReviewPersistence restores state from .chorus/state.json", async () => {
		// Arrange - save state first
		projectDir = createTestProject([
			createStatusBead("ch-rp1", "Task 1", "review"),
			createStatusBead("ch-rp2", "Task 2", "review"),
		]);

		const persistence = new ReviewPersistence(projectDir);
		const reviews = [
			createPendingReview("ch-rp1"),
			createPendingReview("ch-rp2"),
		];
		await persistence.save(reviews, 1);

		// Act - create new persistence instance (simulates restart)
		const newPersistence = new ReviewPersistence(projectDir);
		const restored = await newPersistence.load();

		// Assert
		expect(restored).not.toBeNull();
		expect(restored?.pendingReviews).toHaveLength(2);
		expect(restored?.currentIndex).toBe(1);
		expect(restored?.pendingReviews[0].taskId).toBe("ch-rp1");
		expect(restored?.pendingReviews[1].taskId).toBe("ch-rp2");
	});

	it("ReviewPersistence clears state when reviews completed", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-rp1", "Task 1", "review"),
		]);

		const persistence = new ReviewPersistence(projectDir);
		await persistence.save([createPendingReview("ch-rp1")], 0);

		// Act
		await persistence.clear();

		// Assert
		const state = await persistence.load();
		expect(state).toBeNull();
	});

	it("ReviewPersistence preserves other state sections", async () => {
		// Arrange - create state file with other data
		projectDir = createTestProject([
			createStatusBead("ch-rp1", "Task 1", "review"),
		]);

		const stateDir = path.join(projectDir, ".chorus");
		const statePath = path.join(stateDir, "state.json");
		fs.mkdirSync(stateDir, { recursive: true });
		fs.writeFileSync(
			statePath,
			JSON.stringify({ otherSection: { data: "preserved" } }),
			"utf-8",
		);

		// Act - save review state
		const persistence = new ReviewPersistence(projectDir);
		await persistence.save([createPendingReview("ch-rp1")], 0);

		// Assert - other sections preserved
		const content = JSON.parse(fs.readFileSync(statePath, "utf-8"));
		expect(content.otherSection.data).toBe("preserved");
		expect(content.review).toBeDefined();
	});

	it("app renders correctly with reviewing tasks", async () => {
		// Arrange - create project with reviewing tasks
		projectDir = createTestProject([
			createStatusBead("ch-rp1", "Task 1", "review"),
			createStatusBead("ch-rp2", "Task 2", "review"),
		]);

		// Act - start app
		ptyResult = renderAppWithPty(["--mode", "semi-auto"], { cwd: projectDir });
		await ptyResult.waitForText("Tasks (2)", 10000);

		// Assert - reviewing tasks visible
		const output = ptyResult.getCleanOutput();
		expect(output).toContain("rp1");
		expect(output).toContain("rp2");
		expect(output).toContain("2 reviewing");
	}, 15000);
});
