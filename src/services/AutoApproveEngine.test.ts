import { describe, expect, it } from "vitest";
import type {
	AutoApproveSettings,
	TaskCompletionResult,
} from "../types/review.js";
import { canAutoApprove } from "./AutoApproveEngine.js";

describe("AutoApproveEngine", () => {
	const createConfig = (
		overrides: Partial<AutoApproveSettings> = {},
	): AutoApproveSettings => ({
		enabled: true,
		maxIterations: 3,
		requireQualityPass: true,
		...overrides,
	});

	const createResult = (
		overrides: Partial<TaskCompletionResult> = {},
	): TaskCompletionResult => ({
		taskId: "ch-test1",
		agentId: "agent-1",
		iterations: 1,
		duration: 5000,
		signal: {
			type: "COMPLETE",
			payload: "Task finished",
			raw: "<chorus>COMPLETE:Task finished</chorus>",
		},
		quality: [{ name: "test", passed: true, duration: 1000 }],
		changes: [],
		...overrides,
	});

	it("returns true when quality passed, iterations ≤ max, signal COMPLETE", () => {
		// Arrange
		const result = createResult({
			iterations: 2,
			signal: { type: "COMPLETE", payload: null, raw: "" },
			quality: [
				{ name: "test", passed: true, duration: 1000 },
				{ name: "lint", passed: true, duration: 500 },
			],
		});
		const config = createConfig({ maxIterations: 3 });

		// Act
		const approved = canAutoApprove(result, config);

		// Assert
		expect(approved).toBe(true);
	});

	it("returns false when quality failed", () => {
		// Arrange
		const result = createResult({
			quality: [
				{ name: "test", passed: true, duration: 1000 },
				{ name: "lint", passed: false, duration: 500, error: "Lint errors" },
			],
		});
		const config = createConfig();

		// Act
		const approved = canAutoApprove(result, config);

		// Assert
		expect(approved).toBe(false);
	});

	it("returns false when iterations > config.maxIterations", () => {
		// Arrange
		const result = createResult({ iterations: 5 });
		const config = createConfig({ maxIterations: 3 });

		// Act
		const approved = canAutoApprove(result, config);

		// Assert
		expect(approved).toBe(false);
	});

	it("returns false when signal not COMPLETE", () => {
		// Arrange
		const result = createResult({
			signal: { type: "BLOCKED", payload: "Waiting for deps", raw: "" },
		});
		const config = createConfig();

		// Act
		const approved = canAutoApprove(result, config);

		// Assert
		expect(approved).toBe(false);
	});

	it("returns false when task has review:per-task label", () => {
		// Arrange
		const result = createResult();
		const config = createConfig();
		const labels = ["feature", "review:per-task"];

		// Act
		const approved = canAutoApprove(result, config, labels);

		// Assert
		expect(approved).toBe(false);
	});

	it("returns true when task has review:skip label (regardless of quality)", () => {
		// Arrange - quality failed but has skip label
		const result = createResult({
			quality: [
				{ name: "test", passed: false, duration: 1000, error: "Failed" },
			],
		});
		const config = createConfig();
		const labels = ["feature", "review:skip"];

		// Act
		const approved = canAutoApprove(result, config, labels);

		// Assert
		expect(approved).toBe(true);
	});

	it("returns false when config.enabled = false", () => {
		// Arrange
		const result = createResult();
		const config = createConfig({ enabled: false });

		// Act
		const approved = canAutoApprove(result, config);

		// Assert
		expect(approved).toBe(false);
	});

	it("returns true when signal is null but all other conditions met", () => {
		// Arrange - signal is null (task completed without explicit signal)
		const result = createResult({
			signal: null,
			quality: [{ name: "test", passed: true, duration: 1000 }],
		});
		const config = createConfig();

		// Act
		const approved = canAutoApprove(result, config);

		// Assert - null signal should not auto-approve (requires explicit COMPLETE)
		expect(approved).toBe(false);
	});
});
