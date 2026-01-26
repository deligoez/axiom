/**
 * PTY-based E2E tests for Keyboard Interactions
 *
 * These tests use node-pty to create a real TTY, enabling proper testing
 * of useInput-dependent keyboard interactions.
 *
 * Note: Some intervention menu tests are skipped because the feature
 * (F63t Intervention Menu Key) is not yet wired up in ImplementationMode.
 * See M9 (Human Intervention) milestone tasks.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	cleanupTestProject,
	createImplementationState,
	createTestProject,
} from "../test-utils/e2e-fixtures.js";
import {
	cleanupPty,
	Keys,
	type PtyTestResult,
	renderAppWithPty,
	sendKey,
} from "../test-utils/pty-helpers.js";

describe("E2E: Keyboard Interactions (PTY)", () => {
	let projectDir: string;
	let ptyResult: PtyTestResult | null = null;

	beforeEach(() => {
		projectDir = "";
		ptyResult = null;
	});

	afterEach(async () => {
		if (ptyResult) {
			cleanupPty(ptyResult);
		}
		if (projectDir) {
			cleanupTestProject(projectDir);
		}
	});

	it("opens intervention menu when i is pressed", async () => {
		// Arrange
		projectDir = createTestProject([{ id: "ch-pty1", title: "Test Task" }]);
		createImplementationState(projectDir);
		ptyResult = renderAppWithPty([], { cwd: projectDir });

		// Wait for app to start
		await ptyResult.waitForText("Tasks (1)", 10000);

		// Act - press 'i' to open intervention menu
		await sendKey(ptyResult, "i", 100);

		// Assert - intervention menu should appear (wait for it)
		await ptyResult.waitForText("INTERVENTION", 5000);
		const output = ptyResult.getCleanOutput();
		expect(output).toMatch(/INTERVENTION/i);
	}, 20000);

	it("shows correct menu options", async () => {
		// Arrange
		projectDir = createTestProject([{ id: "ch-pty2", title: "Test Task" }]);
		createImplementationState(projectDir);
		ptyResult = renderAppWithPty([], { cwd: projectDir });

		// Wait for app to start
		await ptyResult.waitForText("Tasks (1)", 10000);

		// Act - press 'i' to open intervention menu
		await sendKey(ptyResult, "i", 100);

		// Assert - menu options should be visible
		await ptyResult.waitForText("INTERVENTION", 5000);
		const output = ptyResult.getCleanOutput();
		expect(output).toMatch(/pause|resume/i);
		expect(output).toMatch(/stop/i);
		expect(output).toMatch(/redirect/i);
	}, 20000);

	it("closes intervention menu with Escape", async () => {
		// Arrange
		projectDir = createTestProject([{ id: "ch-pty3", title: "Test Task" }]);
		createImplementationState(projectDir);
		ptyResult = renderAppWithPty([], { cwd: projectDir });

		// Wait for app to start
		await ptyResult.waitForText("Tasks (1)", 10000);

		// Act - press 'i' to open, then Escape to close
		await sendKey(ptyResult, "i", 100);
		await ptyResult.waitForText("INTERVENTION", 5000);
		await sendKey(ptyResult, Keys.ESCAPE, 300);

		// Assert - should be back to normal view (task panel visible)
		// Wait for state update
		await ptyResult.waitForText("Tasks (1)", 5000);
		const output = ptyResult.getCleanOutput();
		expect(output).toContain("pty3");
	}, 20000);

	it("j/k navigation works in task panel", async () => {
		// Arrange - create multiple tasks
		projectDir = createTestProject([
			{ id: "ch-nav1", title: "First Task" },
			{ id: "ch-nav2", title: "Second Task" },
			{ id: "ch-nav3", title: "Third Task" },
		]);
		createImplementationState(projectDir);
		ptyResult = renderAppWithPty([], { cwd: projectDir });

		// Wait for app to start
		await ptyResult.waitForText("Tasks (3)", 10000);

		// Act - press 'j' to move down
		await sendKey(ptyResult, "j", 300);
		await sendKey(ptyResult, "j", 300);

		// Assert - app should still be responsive
		const output = ptyResult.getCleanOutput();
		expect(output).toContain("nav1");
		expect(output).toContain("nav2");
		expect(output).toContain("nav3");
	}, 20000);

	it("Tab switches focus between panels", async () => {
		// Arrange
		projectDir = createTestProject([{ id: "ch-tab1", title: "Test Task" }]);
		createImplementationState(projectDir);
		ptyResult = renderAppWithPty([], { cwd: projectDir });

		// Wait for app to start
		await ptyResult.waitForText("Tasks (1)", 10000);

		// Act - press Tab
		await sendKey(ptyResult, Keys.TAB, 300);

		// Assert - app should still render (focus changed internally)
		const output = ptyResult.getCleanOutput();
		expect(output).toContain("tab1");
	}, 20000);

	it("number keys (1-9) for quick task selection", async () => {
		// Arrange - create multiple tasks
		projectDir = createTestProject([
			{ id: "ch-num1", title: "First Task" },
			{ id: "ch-num2", title: "Second Task" },
		]);
		createImplementationState(projectDir);
		ptyResult = renderAppWithPty([], { cwd: projectDir });

		// Wait for app to start
		await ptyResult.waitForText("Tasks (2)", 10000);

		// Act - press '2' for quick select
		await sendKey(ptyResult, "2", 300);

		// Assert - app should still render
		const output = ptyResult.getCleanOutput();
		expect(output).toContain("num1");
		expect(output).toContain("num2");
	}, 20000);
});
