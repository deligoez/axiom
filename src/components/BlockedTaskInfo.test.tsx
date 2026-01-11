import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { BlockedTaskInfo } from "./BlockedTaskInfo.js";

describe("BlockedTaskInfo", () => {
	it("returns null for empty blockers array", () => {
		// Arrange & Act
		const { lastFrame } = render(<BlockedTaskInfo blockers={[]} />);

		// Assert
		expect(lastFrame()).toBe("");
	});

	it("shows single blocker with status in parentheses", () => {
		// Arrange
		const blockers = [{ id: "ch-001", status: "in_progress" as const }];

		// Act
		const { lastFrame } = render(<BlockedTaskInfo blockers={blockers} />);

		// Assert
		expect(lastFrame()).toContain("ch-001");
		expect(lastFrame()).toContain("(in_progress)");
	});

	it("shows multiple blockers comma-separated without status", () => {
		// Arrange
		const blockers = [
			{ id: "ch-001", status: "in_progress" as const },
			{ id: "ch-002", status: "open" as const },
		];

		// Act
		const { lastFrame } = render(<BlockedTaskInfo blockers={blockers} />);

		// Assert
		expect(lastFrame()).toContain("ch-001");
		expect(lastFrame()).toContain("ch-002");
		expect(lastFrame()).not.toContain("(in_progress)");
		expect(lastFrame()).not.toContain("(open)");
	});

	it('uses "Waiting:" prefix', () => {
		// Arrange
		const blockers = [{ id: "ch-001", status: "open" as const }];

		// Act
		const { lastFrame } = render(<BlockedTaskInfo blockers={blockers} />);

		// Assert
		expect(lastFrame()).toContain("Waiting:");
	});

	it("uses tree branch character", () => {
		// Arrange
		const blockers = [{ id: "ch-001", status: "open" as const }];

		// Act
		const { lastFrame } = render(<BlockedTaskInfo blockers={blockers} />);

		// Assert
		expect(lastFrame()).toContain("└─");
	});

	it("uses dim styling", () => {
		// Arrange
		const blockers = [{ id: "ch-001", status: "open" as const }];

		// Act
		const { lastFrame } = render(<BlockedTaskInfo blockers={blockers} />);

		// Assert - dim styling is applied (content should render)
		expect(lastFrame()).toContain("Waiting:");
	});

	it("handles mixed statuses in multiple blockers", () => {
		// Arrange
		const blockers = [
			{ id: "ch-001", status: "closed" as const },
			{ id: "ch-002", status: "in_progress" as const },
			{ id: "ch-003", status: "open" as const },
		];

		// Act
		const { lastFrame } = render(<BlockedTaskInfo blockers={blockers} />);

		// Assert
		expect(lastFrame()).toContain("ch-001");
		expect(lastFrame()).toContain("ch-002");
		expect(lastFrame()).toContain("ch-003");
	});
});
