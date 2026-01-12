import { render } from "ink-testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlanningDialog } from "./PlanningDialog.js";

describe("PlanningDialog", () => {
	const mockOnPlanNext = vi.fn();
	const mockOnPlanAll = vi.fn();
	const mockOnCancel = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Rendering", () => {
		it("returns null when not open", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<PlanningDialog
					isOpen={false}
					readyTasks={5}
					threshold={10}
					nextSection="Feature A"
					onPlanNext={mockOnPlanNext}
					onPlanAll={mockOnPlanAll}
					onCancel={mockOnCancel}
				/>,
			);

			// Assert
			expect(lastFrame()).toBe("");
		});

		it("renders dialog when open", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<PlanningDialog
					isOpen={true}
					readyTasks={5}
					threshold={10}
					nextSection="Feature A"
					onPlanNext={mockOnPlanNext}
					onPlanAll={mockOnPlanAll}
					onCancel={mockOnCancel}
				/>,
			);

			// Assert
			expect(lastFrame()).toContain("Plan Tasks");
		});

		it("displays ready tasks and threshold", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<PlanningDialog
					isOpen={true}
					readyTasks={3}
					threshold={5}
					nextSection="Security Module"
					onPlanNext={mockOnPlanNext}
					onPlanAll={mockOnPlanAll}
					onCancel={mockOnCancel}
				/>,
			);

			// Assert
			expect(lastFrame()).toContain("Ready: 3");
			expect(lastFrame()).toContain("Threshold: 5");
		});

		it("displays next section", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<PlanningDialog
					isOpen={true}
					readyTasks={2}
					threshold={4}
					nextSection="API Endpoints"
					onPlanNext={mockOnPlanNext}
					onPlanAll={mockOnPlanAll}
					onCancel={mockOnCancel}
				/>,
			);

			// Assert
			expect(lastFrame()).toContain("Next section: API Endpoints");
		});

		it("shows [P] Plan Next, [A] Plan All, [C] Cancel buttons", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<PlanningDialog
					isOpen={true}
					readyTasks={1}
					threshold={3}
					nextSection="Tests"
					onPlanNext={mockOnPlanNext}
					onPlanAll={mockOnPlanAll}
					onCancel={mockOnCancel}
				/>,
			);

			// Assert
			expect(lastFrame()).toContain("[P]");
			expect(lastFrame()).toContain("Plan Next");
			expect(lastFrame()).toContain("[A]");
			expect(lastFrame()).toContain("Plan All");
			expect(lastFrame()).toContain("[C]");
			expect(lastFrame()).toContain("Cancel");
		});
	});
});
