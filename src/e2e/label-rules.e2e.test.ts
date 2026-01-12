import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getReviewMode } from "../services/LabelRulesEngine.js";
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
import type { ReviewConfig } from "../types/review.js";

// Default review config for testing
const defaultConfig: ReviewConfig = {
	defaultMode: "batch",
	autoApprove: {
		enabled: true,
		maxIterations: 3,
		requireQualityPass: true,
	},
	labelRules: [
		{ label: "critical", mode: "per-task" },
		{ label: "docs", mode: "auto-approve" },
	],
};

describe("E2E: Label Rules (R05)", () => {
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

	it("review:skip label returns skip mode", () => {
		// Arrange
		const labels = ["review:skip", "feature"];

		// Act
		const mode = getReviewMode(labels, defaultConfig);

		// Assert
		expect(mode).toBe("skip");
	});

	it("review:per-task label returns per-task mode", () => {
		// Arrange
		const labels = ["review:per-task", "bug"];

		// Act
		const mode = getReviewMode(labels, defaultConfig);

		// Assert
		expect(mode).toBe("per-task");
	});

	it("review:batch label returns batch mode", () => {
		// Arrange
		const labels = ["review:batch"];

		// Act
		const mode = getReviewMode(labels, defaultConfig);

		// Assert
		expect(mode).toBe("batch");
	});

	it("review:auto label returns auto-approve mode", () => {
		// Arrange
		const labels = ["review:auto"];

		// Act
		const mode = getReviewMode(labels, defaultConfig);

		// Assert
		expect(mode).toBe("auto-approve");
	});

	it("config labelRules override default mode", () => {
		// Arrange
		const labels = ["critical"]; // Mapped to per-task in config

		// Act
		const mode = getReviewMode(labels, defaultConfig);

		// Assert
		expect(mode).toBe("per-task");
	});

	it("no matching labels returns default mode", () => {
		// Arrange
		const labels = ["enhancement", "ui"];

		// Act
		const mode = getReviewMode(labels, defaultConfig);

		// Assert
		expect(mode).toBe("batch"); // defaultMode
	});

	it("app displays tasks correctly regardless of labels", async () => {
		// Arrange - create tasks (labels would be in metadata, not shown in panel)
		projectDir = createTestProject([
			createStatusBead("ch-lr1", "Skip Task", "open"),
			createStatusBead("ch-lr2", "Per-Task Task", "reviewing"),
		]);
		ptyResult = renderAppWithPty(["--mode", "semi-auto"], { cwd: projectDir });

		// Act - wait for app to render
		await ptyResult.waitForText("Tasks (2)", 10000);

		// Assert - both tasks visible
		const output = ptyResult.getCleanOutput();
		expect(output).toContain("lr1");
		expect(output).toContain("lr2");
	}, 15000);
});
