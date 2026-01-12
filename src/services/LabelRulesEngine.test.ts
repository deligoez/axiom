import { describe, expect, it } from "vitest";
import type { ReviewConfig } from "../types/review.js";
import { getReviewMode } from "./LabelRulesEngine.js";

describe("LabelRulesEngine", () => {
	const createConfig = (
		overrides: Partial<ReviewConfig> = {},
	): ReviewConfig => ({
		defaultMode: "batch",
		autoApprove: {
			enabled: true,
			maxIterations: 3,
			requireQualityPass: true,
		},
		labelRules: [],
		...overrides,
	});

	it("returns per-task when review:per-task label present", () => {
		// Arrange
		const labels = ["feature", "review:per-task"];
		const config = createConfig();

		// Act
		const mode = getReviewMode(labels, config);

		// Assert
		expect(mode).toBe("per-task");
	});

	it("returns batch when review:batch label present", () => {
		// Arrange
		const labels = ["bug", "review:batch"];
		const config = createConfig({ defaultMode: "per-task" });

		// Act
		const mode = getReviewMode(labels, config);

		// Assert
		expect(mode).toBe("batch");
	});

	it("returns auto-approve when review:auto label present", () => {
		// Arrange
		const labels = ["chore", "review:auto"];
		const config = createConfig();

		// Act
		const mode = getReviewMode(labels, config);

		// Assert
		expect(mode).toBe("auto-approve");
	});

	it("returns skip when review:skip label present", () => {
		// Arrange
		const labels = ["docs", "review:skip"];
		const config = createConfig();

		// Act
		const mode = getReviewMode(labels, config);

		// Assert
		expect(mode).toBe("skip");
	});

	it("returns config.defaultMode when no review label", () => {
		// Arrange
		const labels = ["feature", "bug"];
		const config = createConfig({ defaultMode: "per-task" });

		// Act
		const mode = getReviewMode(labels, config);

		// Assert
		expect(mode).toBe("per-task");
	});

	it("applies config.labelRules overrides", () => {
		// Arrange - security label triggers per-task review
		const labels = ["feature", "security"];
		const config = createConfig({
			defaultMode: "batch",
			labelRules: [
				{ label: "security", mode: "per-task" },
				{ label: "trivial", mode: "auto-approve" },
			],
		});

		// Act
		const mode = getReviewMode(labels, config);

		// Assert
		expect(mode).toBe("per-task");
	});
});
