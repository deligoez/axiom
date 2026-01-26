import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { canAutoApprove } from "../services/AutoApproveEngine.js";
import {
	cleanupTestProject,
	createImplementationState,
	createStatusBead,
	createTestProject,
} from "../test-utils/e2e-fixtures.js";
import {
	cleanupPty,
	type PtyTestResult,
	renderAppWithPty,
} from "../test-utils/pty-helpers.js";
import type {
	AutoApproveSettings,
	TaskCompletionResult,
} from "../types/review.js";

// Helper to create a passing completion result
function createCompletionResult(
	taskId: string,
	qualityPassed: boolean,
	iterations = 1,
): TaskCompletionResult {
	return {
		taskId,
		agentId: "agent-1",
		iterations,
		duration: 1000,
		signal: { type: "COMPLETE", payload: "Done", raw: "COMPLETE: Done" },
		quality: [{ name: "tests", passed: qualityPassed, duration: 500 }],
		changes: [],
	};
}

// Default auto-approve config
const defaultConfig: AutoApproveSettings = {
	enabled: true,
	maxIterations: 3,
	requireQualityPass: true,
};

describe("E2E: Auto-Approve (R04)", () => {
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

	it("task with review:skip label is auto-approved regardless of quality", () => {
		// Arrange
		const result = createCompletionResult("ch-aa1", false); // Quality failed
		const labels = ["review:skip"];

		// Act
		const approved = canAutoApprove(result, defaultConfig, labels);

		// Assert
		expect(approved).toBe(true);
	});

	it("task with review:per-task label requires manual review", () => {
		// Arrange
		const result = createCompletionResult("ch-aa2", true); // Quality passed
		const labels = ["review:per-task"];

		// Act
		const approved = canAutoApprove(result, defaultConfig, labels);

		// Assert
		expect(approved).toBe(false);
	});

	it("task with quality passed and within iterations is auto-approved", () => {
		// Arrange
		const result = createCompletionResult("ch-aa3", true, 2);
		const labels: string[] = [];

		// Act
		const approved = canAutoApprove(result, defaultConfig, labels);

		// Assert
		expect(approved).toBe(true);
	});

	it("task with quality failed requires manual review", () => {
		// Arrange
		const result = createCompletionResult("ch-aa4", false, 1);
		const labels: string[] = [];

		// Act
		const approved = canAutoApprove(result, defaultConfig, labels);

		// Assert
		expect(approved).toBe(false);
	});

	it("task exceeding maxIterations requires manual review", () => {
		// Arrange
		const result = createCompletionResult("ch-aa5", true, 5); // Over limit
		const labels: string[] = [];

		// Act
		const approved = canAutoApprove(result, defaultConfig, labels);

		// Assert - iterations exceeded maxIterations (3)
		expect(approved).toBe(false);
	});

	it("auto-approve disabled means all tasks require review", () => {
		// Arrange
		const result = createCompletionResult("ch-aa6", true);
		const disabledConfig: AutoApproveSettings = {
			...defaultConfig,
			enabled: false,
		};

		// Act
		const approved = canAutoApprove(result, disabledConfig, []);

		// Assert
		expect(approved).toBe(false);
	});

	it("app displays reviewing tasks that would need manual review", async () => {
		// Arrange - create reviewing task (simulates failed auto-approve)
		projectDir = createTestProject([
			createStatusBead("ch-aa7", "Failed Auto Task", "review"),
			createStatusBead("ch-aa8", "Open Task", "todo"),
		]);
		createImplementationState(projectDir);
		ptyResult = renderAppWithPty([], { cwd: projectDir });

		// Act - wait for app to render
		await ptyResult.waitForText("Tasks (2)", 10000);
		// Wait for full render after header appears
		await new Promise((r) => setTimeout(r, 200));

		// Assert - reviewing task is shown
		const output = ptyResult.getCleanOutput();
		expect(output).toContain("aa7");
		expect(output).toContain("1 reviewing");
	}, 15000);
});
