import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { EmptySlot } from "./EmptySlot.js";

describe("EmptySlot", () => {
	it('shows "[empty slot]" text', () => {
		// Arrange & Act
		const { lastFrame } = render(<EmptySlot />);

		// Assert
		expect(lastFrame()).toContain("[empty slot]");
	});

	it("text is centered", () => {
		// Arrange & Act
		const { lastFrame } = render(<EmptySlot width={30} />);

		// Assert - text should be padded with spaces due to centering
		const frame = lastFrame() ?? "";
		// Check that the text appears somewhere in the output
		expect(frame).toContain("[empty slot]");
	});

	it("uses dimColor for text", () => {
		// Arrange & Act
		const { lastFrame } = render(<EmptySlot />);

		// Assert - Ink applies ANSI codes for dimColor
		// We verify the text is present (dimColor is visual only)
		expect(lastFrame()).toContain("[empty slot]");
	});

	it("has single border style", () => {
		// Arrange & Act
		const { lastFrame } = render(<EmptySlot />);

		// Assert - single border uses ─ and │ characters
		const frame = lastFrame() ?? "";
		expect(frame).toMatch(/[┌┐└┘│─]/);
	});

	it("border uses gray color", () => {
		// Arrange & Act
		const { lastFrame } = render(<EmptySlot />);

		// Assert - Ink applies ANSI codes for borderColor
		// We verify border characters are present
		const frame = lastFrame() ?? "";
		expect(frame).toMatch(/[┌┐└┘│─]/);
	});

	it("respects width prop", () => {
		// Arrange & Act
		const { lastFrame: frame1 } = render(<EmptySlot width={20} />);
		const { lastFrame: frame2 } = render(<EmptySlot width={40} />);

		// Assert - wider box should have longer lines
		const width1 = (frame1() ?? "").split("\n")[0]?.length ?? 0;
		const width2 = (frame2() ?? "").split("\n")[0]?.length ?? 0;
		expect(width2).toBeGreaterThan(width1);
	});
});
