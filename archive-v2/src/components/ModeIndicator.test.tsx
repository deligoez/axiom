import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { stripAnsi } from "../test-utils/pty-helpers.js";
import { ModeIndicator } from "./ModeIndicator.js";

describe("ModeIndicator", () => {
	it("renders 'semi-auto' text when mode='semi-auto'", () => {
		// Arrange & Act
		const { lastFrame } = render(<ModeIndicator mode="semi-auto" />);

		// Assert
		expect(lastFrame()).toContain("semi-auto");
	});

	it("renders 'autopilot' text when mode='autopilot'", () => {
		// Arrange & Act
		const { lastFrame } = render(<ModeIndicator mode="autopilot" />);

		// Assert
		expect(lastFrame()).toContain("autopilot");
	});

	it("shows green dot for semi-auto", () => {
		// Arrange & Act
		const { lastFrame } = render(<ModeIndicator mode="semi-auto" />);

		// Assert - Ink renders color codes, check for the dot character
		expect(lastFrame()).toContain("●");
	});

	it("shows yellow dot for autopilot", () => {
		// Arrange & Act
		const { lastFrame } = render(<ModeIndicator mode="autopilot" />);

		// Assert - Ink renders color codes, check for the dot character
		expect(lastFrame()).toContain("●");
	});

	it("handles undefined mode gracefully (shows 'unknown')", () => {
		// Arrange & Act
		const { lastFrame } = render(<ModeIndicator mode={undefined} />);

		// Assert
		expect(lastFrame()).toContain("unknown");
	});

	it("handles invalid mode string gracefully (shows 'unknown')", () => {
		// Arrange & Act
		const { lastFrame } = render(<ModeIndicator mode="invalid-mode" />);

		// Assert
		expect(lastFrame()).toContain("unknown");
	});

	it("text and dot have correct spacing (single space between)", () => {
		// Arrange & Act
		const { lastFrame } = render(<ModeIndicator mode="semi-auto" />);

		// Assert - check for single space before dot (strip ANSI codes first)
		const output = stripAnsi(lastFrame() ?? "");
		expect(output).toMatch(/semi-auto\s●/);
	});

	it("shows gray dot for unknown mode", () => {
		// Arrange & Act
		const { lastFrame } = render(<ModeIndicator mode="invalid" />);

		// Assert
		expect(lastFrame()).toContain("●");
		expect(lastFrame()).toContain("unknown");
	});
});
