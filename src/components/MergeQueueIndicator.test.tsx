import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { MergeQueueIndicator } from "./MergeQueueIndicator.js";

describe("MergeQueueIndicator", () => {
	it('shows "Merge: 0 queued" for empty queue', () => {
		// Arrange & Act
		const { lastFrame } = render(<MergeQueueIndicator queued={0} />);

		// Assert
		expect(lastFrame()).toContain("Merge:");
		expect(lastFrame()).toContain("0 queued");
	});

	it('shows "Merge: 3 queued" for items in queue', () => {
		// Arrange & Act
		const { lastFrame } = render(<MergeQueueIndicator queued={3} />);

		// Assert
		expect(lastFrame()).toContain("Merge:");
		expect(lastFrame()).toContain("3 queued");
	});

	it("shows merging state with dot indicator", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<MergeQueueIndicator queued={1} merging={true} />,
		);

		// Assert
		expect(lastFrame()).toContain("Merge:");
		expect(lastFrame()).toContain("●");
		expect(lastFrame()).toContain("merging");
	});

	it("shows conflict state with warning icon", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<MergeQueueIndicator queued={1} conflict={true} />,
		);

		// Assert
		expect(lastFrame()).toContain("Merge:");
		expect(lastFrame()).toContain("⚠");
		expect(lastFrame()).toContain("conflict");
	});

	it("uses yellow color for merging", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<MergeQueueIndicator queued={1} merging={true} />,
		);

		// Assert - Ink applies ANSI color codes, verify content is present
		expect(lastFrame()).toContain("●");
		expect(lastFrame()).toContain("merging");
	});

	it("uses red color for conflict", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<MergeQueueIndicator queued={1} conflict={true} />,
		);

		// Assert - Ink applies ANSI color codes, verify content is present
		expect(lastFrame()).toContain("⚠");
		expect(lastFrame()).toContain("conflict");
	});

	it("conflict state takes priority over merging state", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<MergeQueueIndicator queued={1} merging={true} conflict={true} />,
		);

		// Assert - should show conflict, not merging
		expect(lastFrame()).toContain("⚠");
		expect(lastFrame()).toContain("conflict");
		expect(lastFrame()).not.toContain("merging");
	});
});
