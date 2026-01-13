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

describe("E2E: Batch Review Flow (R02)", () => {
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

	it("creates project with multiple reviewing tasks", async () => {
		// Arrange - create 3 tasks all in reviewing status
		projectDir = createTestProject([
			createStatusBead("ch-br1", "First Review Task", "review"),
			createStatusBead("ch-br2", "Second Review Task", "review"),
			createStatusBead("ch-br3", "Third Review Task", "review"),
		]);
		ptyResult = renderAppWithPty(["--mode", "semi-auto"], { cwd: projectDir });

		// Act - wait for app to render
		await ptyResult.waitForText("Tasks (3)", 10000);

		// Assert - all 3 tasks rendered with reviewing status indicator
		const output = ptyResult.getCleanOutput();
		expect(output).toContain("br1");
		expect(output).toContain("br2");
		expect(output).toContain("br3");
		// Reviewing status indicator (⏳)
		expect(output).toContain("⏳");
	}, 15000);

	it("shows reviewing count in footer", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-br1", "Review 1", "review"),
			createStatusBead("ch-br2", "Review 2", "review"),
			createStatusBead("ch-br3", "Review 3", "review"),
		]);
		ptyResult = renderAppWithPty(["--mode", "semi-auto"], { cwd: projectDir });
		await ptyResult.waitForText("Tasks (3)", 10000);

		// Assert - footer shows reviewing count
		const output = ptyResult.getCleanOutput();
		expect(output).toContain("3 reviewing");
	}, 15000);

	it("navigates through tasks with j/k keys", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-br1", "First", "review"),
			createStatusBead("ch-br2", "Second", "review"),
			createStatusBead("ch-br3", "Third", "review"),
		]);
		ptyResult = renderAppWithPty(["--mode", "semi-auto"], { cwd: projectDir });
		await ptyResult.waitForText("Tasks (3)", 10000);

		// Act - navigate down twice with j
		await sendKey(ptyResult, "j", 200);
		await sendKey(ptyResult, "j", 200);

		// Assert - should still be responsive (selection moved)
		const output = ptyResult.getCleanOutput();
		expect(output).toContain("►"); // Selection indicator visible
		expect(output).toContain("br3"); // Third task should be visible
	}, 15000);

	it("pressing R with multiple reviewing tasks does not crash", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-br1", "Review 1", "review"),
			createStatusBead("ch-br2", "Review 2", "review"),
			createStatusBead("ch-br3", "Review 3", "review"),
		]);
		ptyResult = renderAppWithPty(["--mode", "semi-auto"], { cwd: projectDir });
		await ptyResult.waitForText("Tasks (3)", 10000);

		// Act - press R to start batch review
		await sendKey(ptyResult, "r", 500);

		// Assert - app doesn't crash and shows content
		const output = ptyResult.getCleanOutput();
		expect(output.length).toBeGreaterThan(0);
		// Should show some content (tasks or review panel)
		expect(output).toMatch(/br|Tasks|REVIEW/);
	}, 15000);

	it("rapid key sequence does not crash app", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-br1", "Task 1", "review"),
			createStatusBead("ch-br2", "Task 2", "review"),
			createStatusBead("ch-br3", "Task 3", "review"),
		]);
		ptyResult = renderAppWithPty(["--mode", "semi-auto"], { cwd: projectDir });
		await ptyResult.waitForText("Tasks (3)", 10000);

		// Act - rapid key sequence: navigate, try review, navigate, escape
		await sendKey(ptyResult, "j", 150);
		await sendKey(ptyResult, "j", 150);
		await sendKey(ptyResult, "r", 150);
		await sendKey(ptyResult, "\u001B", 300); // Escape

		// Assert - app is still responsive
		const output = ptyResult.getCleanOutput();
		expect(output.length).toBeGreaterThan(0);
		// Tasks should still be visible
		expect(output).toContain("br");
	}, 20000);

	it("Escape returns to normal view after R press", async () => {
		// Arrange
		projectDir = createTestProject([
			createStatusBead("ch-br1", "Task 1", "review"),
			createStatusBead("ch-br2", "Task 2", "review"),
		]);
		ptyResult = renderAppWithPty(["--mode", "semi-auto"], { cwd: projectDir });
		await ptyResult.waitForText("Tasks (2)", 10000);

		// Act - press R then Escape
		await sendKey(ptyResult, "r", 300);
		await sendKey(ptyResult, "\u001B", 500);

		// Assert - back to normal view with tasks
		const output = ptyResult.getCleanOutput();
		expect(output).toContain("Tasks");
		expect(output).toContain("br1");
		expect(output).toContain("br2");
	}, 15000);
});
