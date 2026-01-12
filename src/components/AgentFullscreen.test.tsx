import { EventEmitter } from "node:events";
import { render } from "ink-testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Agent } from "../types/agent.js";

// Create a mock stdout that's an EventEmitter with columns/rows
class MockStdout extends EventEmitter {
	columns: number | undefined = 120;
	rows: number | undefined = 40;
}

const mockStdout = new MockStdout();

vi.mock("ink", async () => {
	const actual = await vi.importActual("ink");
	return {
		...actual,
		useStdout: () => ({
			stdout: mockStdout,
			write: vi.fn(),
		}),
	};
});

import { AgentFullscreen } from "./AgentFullscreen.js";

describe("AgentFullscreen", () => {
	beforeEach(() => {
		mockStdout.columns = 120;
		mockStdout.rows = 40;
		mockStdout.removeAllListeners();
	});

	// Helper to create agent
	const createAgent = (
		id: string,
		output: string[] = ["line 1", "line 2", "line 3"],
	): Agent => ({
		id,
		name: "Test Agent",
		status: "running",
		output,
		createdAt: new Date(),
	});

	describe("Rendering", () => {
		it("renders at full terminal size", () => {
			// Arrange
			const agent = createAgent("agent-1");
			const onExit = vi.fn();

			// Act
			const { lastFrame } = render(
				<AgentFullscreen agent={agent} scrollPosition={0} onExit={onExit} />,
			);

			// Assert - should use full width/height
			const frame = lastFrame();
			expect(frame).toBeDefined();
			// The component should take up the full terminal width
			expect(frame?.split("\n")[0]?.length).toBeGreaterThan(0);
		});

		it("displays agent output", () => {
			// Arrange
			const agent = createAgent("agent-1", ["Hello", "World", "Test"]);
			const onExit = vi.fn();

			// Act
			const { lastFrame } = render(
				<AgentFullscreen agent={agent} scrollPosition={0} onExit={onExit} />,
			);

			// Assert
			const frame = lastFrame();
			expect(frame).toContain("Hello");
			expect(frame).toContain("World");
		});

		it("displays agent name in header", () => {
			// Arrange
			const agent = createAgent("agent-1");
			agent.name = "My Test Agent";
			const onExit = vi.fn();

			// Act
			const { lastFrame } = render(
				<AgentFullscreen agent={agent} scrollPosition={0} onExit={onExit} />,
			);

			// Assert
			const frame = lastFrame();
			expect(frame).toContain("My Test Agent");
		});
	});

	describe("Scroll Boundaries", () => {
		it("displays output from scroll position", () => {
			// Arrange - create agent with many lines
			const lines = Array.from({ length: 100 }, (_, i) => `Line ${i + 1}`);
			const agent = createAgent("agent-1", lines);
			const onExit = vi.fn();

			// Act - start scrolled to line 10
			const { lastFrame } = render(
				<AgentFullscreen agent={agent} scrollPosition={10} onExit={onExit} />,
			);

			// Assert - should show content from scroll position
			const frame = lastFrame();
			expect(frame).toContain("Line 11"); // Lines are 0-indexed
		});

		it("stops scroll at top boundary (scrollPosition 0)", () => {
			// Arrange
			const agent = createAgent("agent-1", ["First", "Second", "Third"]);
			const onExit = vi.fn();

			// Act - scroll position at 0
			const { lastFrame } = render(
				<AgentFullscreen agent={agent} scrollPosition={0} onExit={onExit} />,
			);

			// Assert - first line should be visible
			const frame = lastFrame();
			expect(frame).toContain("First");
		});

		it("stops scroll at bottom boundary", () => {
			// Arrange - few lines that fit in view
			const lines = ["Line 1", "Line 2", "Line 3"];
			const agent = createAgent("agent-1", lines);
			const onExit = vi.fn();

			// Act - scroll position at max (last line)
			const { lastFrame } = render(
				<AgentFullscreen
					agent={agent}
					scrollPosition={lines.length - 1}
					onExit={onExit}
				/>,
			);

			// Assert - last line should be visible
			const frame = lastFrame();
			expect(frame).toContain("Line 3");
		});
	});

	describe("Exit Hint", () => {
		it("shows exit instructions", () => {
			// Arrange
			const agent = createAgent("agent-1");
			const onExit = vi.fn();

			// Act
			const { lastFrame } = render(
				<AgentFullscreen agent={agent} scrollPosition={0} onExit={onExit} />,
			);

			// Assert - should show hint for exiting
			const frame = lastFrame();
			expect(frame).toMatch(/f|Esc/i); // Should mention f or Escape to exit
		});
	});
});
