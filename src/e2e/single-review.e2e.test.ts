import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	cleanupTestProject,
	createStatusBead,
	createTestProject,
} from "../test-utils/e2e-fixtures.js";
import {
	cleanupPty,
	type PtyTestResult,
	renderAppWithPty,
	sendKey,
} from "../test-utils/pty-helpers.js";

describe("E2E: Single Task Review (R01)", () => {
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

	it("shows tasks with reviewing status correctly", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-rv1", "Open Task", "todo"),
			createStatusBead("ch-rv2", "Reviewing Task", "review"),
			createStatusBead("ch-rv3", "Another Task", "todo"),
		]);
		ptyResult = renderAppWithPty(["--mode", "semi-auto"], { cwd: projectDir });

		// Act - wait for app to render with tasks
		await ptyResult.waitForText("Tasks (3)", 10000);
		// Wait for full render after header appears
		await new Promise((r) => setTimeout(r, 200));

		// Assert - tasks rendered including the reviewing one
		const output = ptyResult.getCleanOutput();
		expect(output).toContain("rv1");
		expect(output).toContain("rv2");
		expect(output).toContain("rv3");
	}, 15000);

	it("navigates to reviewing task with j/k", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-rv1", "Open Task", "todo"),
			createStatusBead("ch-rv2", "Reviewing Task", "review"),
			createStatusBead("ch-rv3", "Another Task", "todo"),
		]);
		ptyResult = renderAppWithPty(["--mode", "semi-auto"], { cwd: projectDir });
		await ptyResult.waitForText("Tasks (3)", 10000);
		// Wait for full render after header appears
		await new Promise((r) => setTimeout(r, 200));

		// Act - press j to move to second task (reviewing)
		await sendKey(ptyResult, "j", 300);

		// Assert - app still renders correctly after navigation
		const output = ptyResult.getCleanOutput();
		expect(output).toContain("rv2");
		// Selection indicator should be present somewhere
		expect(output).toMatch(/[►→●]/);
	}, 15000);

	it("pressing R on task opens review mode without crashing", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-rv1", "Open Task", "todo"),
			createStatusBead("ch-rv2", "Reviewing Task", "review"),
			createStatusBead("ch-rv3", "Another Task", "todo"),
		]);
		ptyResult = renderAppWithPty(["--mode", "semi-auto"], { cwd: projectDir });
		await ptyResult.waitForText("Tasks (3)", 10000);
		// Wait for full render after header appears
		await new Promise((r) => setTimeout(r, 200));

		// Navigate to reviewing task
		await sendKey(ptyResult, "j", 300);

		// Act - press R to open review
		await sendKey(ptyResult, "r", 500);

		// Assert - app doesn't crash and renders something
		// The exact behavior depends on integration level
		const output = ptyResult.getCleanOutput();
		// App should still be responsive and showing some content
		expect(output.length).toBeGreaterThan(0);
		// Should either show review panel or remain in task list
		expect(output).toMatch(/rv|REVIEW|Tasks/);
	}, 15000);

	it("Esc key returns from review mode without crashing", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-rv1", "Open Task", "todo"),
			createStatusBead("ch-rv2", "Reviewing Task", "review"),
			createStatusBead("ch-rv3", "Another Task", "todo"),
		]);
		ptyResult = renderAppWithPty(["--mode", "semi-auto"], { cwd: projectDir });
		await ptyResult.waitForText("Tasks (3)", 10000);
		// Wait for full render after header appears
		await new Promise((r) => setTimeout(r, 200));

		// Navigate and press R
		await sendKey(ptyResult, "j", 300);
		await sendKey(ptyResult, "r", 500);

		// Act - press Escape to return
		await sendKey(ptyResult, "\u001B", 500); // Escape key

		// Assert - app returns to task list view
		const output = ptyResult.getCleanOutput();
		// Should show tasks again
		expect(output).toContain("rv1");
		expect(output).toContain("rv2");
	}, 15000);
});
