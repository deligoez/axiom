import { render } from "ink-testing-library";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import type { Learning } from "./LearningsPanel.js";
import { LearningsPanel } from "./LearningsPanel.js";

describe("LearningsPanel", () => {
	const originalIsTTY = process.stdin.isTTY;

	beforeAll(() => {
		Object.defineProperty(process.stdin, "isTTY", {
			value: true,
			writable: true,
			configurable: true,
		});
	});

	afterAll(() => {
		Object.defineProperty(process.stdin, "isTTY", {
			value: originalIsTTY,
			writable: true,
			configurable: true,
		});
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	// Sample learnings for tests
	const sampleLearnings: Learning[] = [
		{
			id: "l1",
			category: "Testing",
			content: "Always use AAA pattern for tests",
			source: { taskId: "ch-001", agentId: "agent-1", date: "2026-01-10" },
		},
		{
			id: "l2",
			category: "Testing",
			content: "Mock external dependencies",
			source: { taskId: "ch-002", agentId: "agent-2", date: "2026-01-11" },
		},
		{
			id: "l3",
			category: "XState",
			content: "Use sendTo for parent communication",
			source: { taskId: "ch-003", agentId: "agent-1", date: "2026-01-11" },
		},
	];

	describe("Visibility", () => {
		it("renders overlay when isVisible=true", () => {
			// Arrange
			const onClose = vi.fn();

			// Act
			const { lastFrame } = render(
				<LearningsPanel
					isVisible={true}
					learnings={sampleLearnings}
					onClose={onClose}
				/>,
			);

			// Assert
			const frame = lastFrame();
			expect(frame).toContain("Learnings");
		});

		it("returns null when isVisible=false", () => {
			// Arrange
			const onClose = vi.fn();

			// Act
			const { lastFrame } = render(
				<LearningsPanel
					isVisible={false}
					learnings={sampleLearnings}
					onClose={onClose}
				/>,
			);

			// Assert
			expect(lastFrame()).toBe("");
		});
	});

	describe("Content Display", () => {
		it("groups learnings by category", () => {
			// Arrange
			const onClose = vi.fn();

			// Act
			const { lastFrame } = render(
				<LearningsPanel
					isVisible={true}
					learnings={sampleLearnings}
					onClose={onClose}
				/>,
			);

			// Assert - should show category headers
			const frame = lastFrame();
			expect(frame).toContain("Testing");
			expect(frame).toContain("XState");
		});

		it("shows source attribution for learnings", () => {
			// Arrange
			const onClose = vi.fn();

			// Act
			const { lastFrame } = render(
				<LearningsPanel
					isVisible={true}
					learnings={sampleLearnings}
					onClose={onClose}
				/>,
			);

			// Assert - should show source info
			const frame = lastFrame();
			expect(frame).toContain("ch-001");
		});
	});

	describe("Key Handling", () => {
		it("calls onClose when ESC pressed", () => {
			// Arrange
			const onClose = vi.fn();
			const { stdin } = render(
				<LearningsPanel
					isVisible={true}
					learnings={sampleLearnings}
					onClose={onClose}
				/>,
			);

			// Act - Escape key
			stdin.write("\u001b");

			// Assert
			expect(onClose).toHaveBeenCalled();
		});

		it("calls onClose when L pressed (toggle)", () => {
			// Arrange
			const onClose = vi.fn();
			const { stdin } = render(
				<LearningsPanel
					isVisible={true}
					learnings={sampleLearnings}
					onClose={onClose}
				/>,
			);

			// Act - 'L' key to toggle off
			stdin.write("L");

			// Assert
			expect(onClose).toHaveBeenCalled();
		});
	});
});
