import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FeedbackStorage } from "../services/FeedbackStorage.js";
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
import type { FeedbackEntry, TaskFeedback } from "../types/review.js";

describe("E2E: Redo with Feedback (R03)", () => {
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

	it("FeedbackStorage saves feedback to .chorus/feedback/{taskId}.json", async () => {
		// Arrange - create project with reviewing task
		projectDir = createTestProject([
			createStatusBead("ch-fb1", "Task with Feedback", "reviewing"),
		]);

		const feedbackStorage = new FeedbackStorage(projectDir);
		const entry: FeedbackEntry = {
			type: "redo",
			message: "Please fix the test failures",
			timestamp: new Date().toISOString(),
			reviewer: "test-user",
		};

		// Act - save feedback
		await feedbackStorage.saveFeedback("ch-fb1", entry);

		// Assert - file exists with correct content
		const feedbackPath = path.join(
			projectDir,
			".chorus",
			"feedback",
			"ch-fb1.json",
		);
		expect(fs.existsSync(feedbackPath)).toBe(true);

		const content = JSON.parse(
			fs.readFileSync(feedbackPath, "utf-8"),
		) as TaskFeedback;
		expect(content.taskId).toBe("ch-fb1");
		expect(content.history).toHaveLength(1);
		expect(content.history[0].type).toBe("redo");
		expect(content.history[0].message).toBe("Please fix the test failures");
	});

	it("FeedbackStorage appends to existing feedback history", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-fb2", "Task with History", "reviewing"),
		]);

		const feedbackStorage = new FeedbackStorage(projectDir);
		const firstEntry: FeedbackEntry = {
			type: "redo",
			message: "First attempt feedback",
			timestamp: new Date().toISOString(),
		};
		const secondEntry: FeedbackEntry = {
			type: "redo",
			message: "Second attempt feedback",
			timestamp: new Date().toISOString(),
		};

		// Act - save two entries
		await feedbackStorage.saveFeedback("ch-fb2", firstEntry);
		await feedbackStorage.saveFeedback("ch-fb2", secondEntry);

		// Assert - both entries in history
		const feedback = await feedbackStorage.loadFeedback("ch-fb2");
		expect(feedback).not.toBeNull();
		expect(feedback?.history).toHaveLength(2);
		expect(feedback?.history[0].message).toBe("First attempt feedback");
		expect(feedback?.history[1].message).toBe("Second attempt feedback");
	});

	it("FeedbackStorage returns null for non-existent task", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-fb3", "Some Task", "open"),
		]);

		const feedbackStorage = new FeedbackStorage(projectDir);

		// Act
		const feedback = await feedbackStorage.loadFeedback("ch-nonexistent");

		// Assert
		expect(feedback).toBeNull();
	});

	it("app shows reviewing task and feedback can be saved externally", async () => {
		// Arrange - create project with reviewing task
		projectDir = createTestProject([
			createStatusBead("ch-fb4", "Reviewing Task", "reviewing"),
		]);

		// Start app to verify task shows
		ptyResult = renderAppWithPty(["--mode", "semi-auto"], { cwd: projectDir });
		await ptyResult.waitForText("Tasks (1)", 10000);

		// Save feedback while app is running (simulates external feedback save)
		const feedbackStorage = new FeedbackStorage(projectDir);
		const entry: FeedbackEntry = {
			type: "redo",
			message: "Concurrent feedback save",
			timestamp: new Date().toISOString(),
		};
		await feedbackStorage.saveFeedback("ch-fb4", entry);

		// Assert - feedback file exists
		const feedbackPath = path.join(
			projectDir,
			".chorus",
			"feedback",
			"ch-fb4.json",
		);
		expect(fs.existsSync(feedbackPath)).toBe(true);

		// App should still be responsive
		const output = ptyResult.getCleanOutput();
		expect(output).toContain("fb4");
	}, 15000);
});
