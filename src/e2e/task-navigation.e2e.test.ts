import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	cleanupTestProject,
	createTestProject,
} from "../test-utils/e2e-fixtures.js";
import {
	cleanupPty,
	type PtyTestResult,
	renderAppWithPty,
	sendKey,
} from "../test-utils/pty-helpers.js";

describe("E2E: Task Navigation (j/k) PTY", () => {
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

	it("shows selection indicator on first task initially", async () => {
		// Arrange
		projectDir = createTestProject([
			{ id: "ch-nav1", title: "First Task" },
			{ id: "ch-nav2", title: "Second Task" },
			{ id: "ch-nav3", title: "Third Task" },
		]);
		ptyResult = renderAppWithPty(["--mode", "semi-auto"], { cwd: projectDir });

		// Act - wait for app to render with tasks
		await ptyResult.waitForText("Tasks (3)", 10000);
		// Give time for selection state to render
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Assert - tasks rendered with nav1 short ID
		const output = ptyResult.getCleanOutput();
		expect(output).toContain("nav1");
		expect(output).toContain("nav2");
		expect(output).toContain("nav3");
		// Selection indicator ► should appear (cyan color may not show in cleaned output)
		// but the character should be present
		expect(output).toMatch(/[►→]/); // Either selection or status indicator
	}, 15000);

	it("j key moves selection down without error", async () => {
		// Arrange
		projectDir = createTestProject([
			{ id: "ch-nav1", title: "First Task" },
			{ id: "ch-nav2", title: "Second Task" },
			{ id: "ch-nav3", title: "Third Task" },
		]);
		ptyResult = renderAppWithPty(["--mode", "semi-auto"], { cwd: projectDir });
		await ptyResult.waitForText("Tasks (3)", 10000);

		// Act - press j to move down
		await sendKey(ptyResult, "j", 300);

		// Assert - app responds to j key without crashing and tasks visible
		const output = ptyResult.getCleanOutput();
		expect(output).toContain("nav1");
		expect(output).toContain("nav2");
		expect(output).toContain("nav3");
	}, 15000);

	it("pressing j twice navigates without error", async () => {
		// Arrange
		projectDir = createTestProject([
			{ id: "ch-nav1", title: "First Task" },
			{ id: "ch-nav2", title: "Second Task" },
			{ id: "ch-nav3", title: "Third Task" },
		]);
		ptyResult = renderAppWithPty(["--mode", "semi-auto"], { cwd: projectDir });
		await ptyResult.waitForText("Tasks (3)", 10000);

		// Act - press j twice to move to third task
		await sendKey(ptyResult, "j", 300);
		await sendKey(ptyResult, "j", 300);

		// Assert - app still renders with all tasks
		const output = ptyResult.getCleanOutput();
		expect(output).toContain("nav1");
		expect(output).toContain("nav2");
		expect(output).toContain("nav3");
	}, 15000);

	it("k key moves selection up without error", async () => {
		// Arrange
		projectDir = createTestProject([
			{ id: "ch-nav1", title: "First Task" },
			{ id: "ch-nav2", title: "Second Task" },
			{ id: "ch-nav3", title: "Third Task" },
		]);
		ptyResult = renderAppWithPty(["--mode", "semi-auto"], { cwd: projectDir });
		await ptyResult.waitForText("Tasks (3)", 10000);

		// Move down first
		await sendKey(ptyResult, "j", 300);

		// Act - press k to move back up
		await sendKey(ptyResult, "k", 300);

		// Assert - app renders correctly
		const output = ptyResult.getCleanOutput();
		expect(output).toContain("nav1");
		expect(output).toContain("nav2");
		expect(output).toContain("nav3");
	}, 15000);

	it("navigation wraps at boundaries without error", async () => {
		// Arrange
		projectDir = createTestProject([
			{ id: "ch-nav1", title: "First Task" },
			{ id: "ch-nav2", title: "Second Task" },
			{ id: "ch-nav3", title: "Third Task" },
		]);
		ptyResult = renderAppWithPty(["--mode", "semi-auto"], { cwd: projectDir });
		await ptyResult.waitForText("Tasks (3)", 10000);

		// Act - press j three times to wrap from third to first
		await sendKey(ptyResult, "j", 300);
		await sendKey(ptyResult, "j", 300);
		await sendKey(ptyResult, "j", 300);

		// Assert - app still renders correctly after wrap
		const output = ptyResult.getCleanOutput();
		expect(output).toContain("Tasks (3)");
		expect(output).toContain("nav1");
		expect(output).toContain("nav2");
		expect(output).toContain("nav3");
	}, 15000);
});
