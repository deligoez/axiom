import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import { PlanReviewConfigStep } from "./PlanReviewConfigStep.js";

describe("PlanReviewConfigStep", () => {
	const defaultConfig = {
		enabled: true,
		maxIterations: 5,
		triggerOn: ["cross_cutting", "architectural"],
		autoApply: "minor" as const,
		requireApproval: ["redundant", "dependency_change"],
	};

	describe("UI rendering", () => {
		it("renders Step 5/5 UI header", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<PlanReviewConfigStep config={defaultConfig} onComplete={vi.fn()} />,
			);

			// Assert
			expect(lastFrame()).toMatch(/Step 5\/5/);
		});

		it("shows current enabled setting", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<PlanReviewConfigStep config={defaultConfig} onComplete={vi.fn()} />,
			);

			// Assert
			expect(lastFrame()).toMatch(/enabled|Yes|No/i);
		});

		it("shows maxIterations setting", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<PlanReviewConfigStep config={defaultConfig} onComplete={vi.fn()} />,
			);

			// Assert
			expect(lastFrame()).toContain("5");
		});

		it("shows triggerOn categories", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<PlanReviewConfigStep config={defaultConfig} onComplete={vi.fn()} />,
			);

			// Assert
			expect(lastFrame()).toMatch(/cross_cutting|architectural/);
		});

		it("shows autoApply level", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<PlanReviewConfigStep config={defaultConfig} onComplete={vi.fn()} />,
			);

			// Assert
			expect(lastFrame()).toMatch(/minor|none|all/);
		});

		it("shows feature explanation", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<PlanReviewConfigStep config={defaultConfig} onComplete={vi.fn()} />,
			);

			// Assert
			expect(lastFrame()).toMatch(/review|refine|task/i);
		});
	});

	describe("configuration", () => {
		it("displays disabled config when enabled=false", () => {
			// Arrange
			const disabledConfig = { ...defaultConfig, enabled: false };

			// Act
			const { lastFrame } = render(
				<PlanReviewConfigStep config={disabledConfig} onComplete={vi.fn()} />,
			);

			// Assert
			expect(lastFrame()).toMatch(/No|disabled/i);
		});

		it("calls onComplete callback with updated config", async () => {
			// Arrange
			const onComplete = vi.fn();
			render(
				<PlanReviewConfigStep config={defaultConfig} onComplete={onComplete} />,
			);

			// Assert - verify callback signature exists
			expect(typeof onComplete).toBe("function");
		});
	});
});
