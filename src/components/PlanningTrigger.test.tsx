import { render } from "ink-testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlanningDialog } from "./PlanningDialog.js";
import { PlanningTrigger } from "./PlanningTrigger.js";

describe("PlanningTrigger", () => {
	const defaultProps = {
		plannedSections: 3,
		totalSections: 5,
		hasDraftSections: true,
		onTrigger: vi.fn(),
		onForceTrigger: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("rendering", () => {
		it("should render spec progress in status bar", () => {
			// Arrange & Act
			const { lastFrame } = render(<PlanningTrigger {...defaultProps} />);

			// Assert
			expect(lastFrame()).toContain("Spec: 3/5");
		});

		it("should show all planned indicator when no draft sections", () => {
			// Arrange
			const props = { ...defaultProps, hasDraftSections: false };

			// Act
			const { lastFrame } = render(<PlanningTrigger {...props} />);

			// Assert
			expect(lastFrame()).toContain("All planned");
		});

		it("should show P shortcut when draft sections exist", () => {
			// Arrange & Act
			const { lastFrame } = render(<PlanningTrigger {...defaultProps} />);

			// Assert
			expect(lastFrame()).toContain("P");
		});
	});

	describe("keyboard shortcuts", () => {
		it("should call onTrigger when P is pressed and draft sections exist", () => {
			// Arrange
			const onTrigger = vi.fn();
			const { stdin } = render(
				<PlanningTrigger {...defaultProps} onTrigger={onTrigger} />,
			);

			// Act
			stdin.write("P");

			// Assert
			expect(onTrigger).toHaveBeenCalledTimes(1);
		});

		it("should not call onTrigger when P is pressed and no draft sections", () => {
			// Arrange
			const onTrigger = vi.fn();
			const props = { ...defaultProps, hasDraftSections: false };
			const { stdin } = render(
				<PlanningTrigger {...props} onTrigger={onTrigger} />,
			);

			// Act
			stdin.write("P");

			// Assert
			expect(onTrigger).not.toHaveBeenCalled();
		});

		it("should call onForceTrigger when Shift+P is pressed", () => {
			// Arrange
			const onForceTrigger = vi.fn();
			const { stdin } = render(
				<PlanningTrigger {...defaultProps} onForceTrigger={onForceTrigger} />,
			);

			// Act
			// Shift+P is represented by uppercase P in useInput
			stdin.write("p"); // lowercase is force trigger

			// Assert
			expect(onForceTrigger).toHaveBeenCalledTimes(1);
		});

		it("should call onForceTrigger even when no draft sections", () => {
			// Arrange
			const onForceTrigger = vi.fn();
			const props = { ...defaultProps, hasDraftSections: false };
			const { stdin } = render(
				<PlanningTrigger {...props} onForceTrigger={onForceTrigger} />,
			);

			// Act
			stdin.write("p");

			// Assert
			expect(onForceTrigger).toHaveBeenCalledTimes(1);
		});
	});

	describe("disabled state", () => {
		it("should show disabled indicator when isDisabled is true", () => {
			// Arrange
			const props = { ...defaultProps, isDisabled: true };

			// Act
			const { lastFrame } = render(<PlanningTrigger {...props} />);

			// Assert
			expect(lastFrame()).toMatch(/P.*disabled|dimColor/i);
		});

		it("should not call onTrigger when disabled", () => {
			// Arrange
			const onTrigger = vi.fn();
			const props = { ...defaultProps, isDisabled: true };
			const { stdin } = render(
				<PlanningTrigger {...props} onTrigger={onTrigger} />,
			);

			// Act
			stdin.write("P");

			// Assert
			expect(onTrigger).not.toHaveBeenCalled();
		});
	});
});

describe("PlanningDialog", () => {
	const defaultProps = {
		isOpen: true,
		readyTasks: 2,
		threshold: 3,
		nextSection: "## Features",
		onPlanNext: vi.fn(),
		onPlanAll: vi.fn(),
		onCancel: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render dialog with current status when open", () => {
		// Arrange & Act
		const { lastFrame } = render(<PlanningDialog {...defaultProps} />);

		// Assert
		const output = lastFrame();
		expect(output).toContain("Ready: 2");
		expect(output).toContain("Threshold: 3");
		expect(output).toContain("## Features");
	});
});
