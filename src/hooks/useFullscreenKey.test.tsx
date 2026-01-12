import { Box, Text } from "ink";
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
import type { Agent } from "../types/agent.js";
import { useFullscreenKey } from "./useFullscreenKey.js";

// Test component that uses the hook
function TestComponent({
	selectedAgent,
	isFullscreen,
	scrollPosition,
	onToggleFullscreen,
	onScroll,
}: {
	selectedAgent: Agent | null;
	isFullscreen: boolean;
	scrollPosition: number;
	onToggleFullscreen?: () => void;
	onScroll?: (direction: "up" | "down") => void;
}) {
	useFullscreenKey({
		selectedAgent,
		isFullscreen,
		scrollPosition,
		maxScroll: 100, // Mock max scroll
		onToggleFullscreen,
		onScroll,
	});

	return (
		<Box flexDirection="column">
			<Text>
				Selected: {selectedAgent ? selectedAgent.id : "none"}, Fullscreen:{" "}
				{isFullscreen ? "yes" : "no"}
			</Text>
		</Box>
	);
}

describe("useFullscreenKey", () => {
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

	// Helper to create agent
	const createAgent = (id: string): Agent => ({
		id,
		name: "Test Agent",
		status: "running",
		output: ["line 1", "line 2", "line 3"],
		createdAt: new Date(),
	});

	describe("Toggle Fullscreen", () => {
		it("'f' key calls onToggleFullscreen when agent selected", () => {
			// Arrange
			const onToggleFullscreen = vi.fn();
			const agent = createAgent("agent-1");
			const { stdin } = render(
				<TestComponent
					selectedAgent={agent}
					isFullscreen={false}
					scrollPosition={0}
					onToggleFullscreen={onToggleFullscreen}
				/>,
			);

			// Act
			stdin.write("f");

			// Assert
			expect(onToggleFullscreen).toHaveBeenCalled();
		});

		it("'f' key does nothing when no agent selected", () => {
			// Arrange
			const onToggleFullscreen = vi.fn();
			const { stdin } = render(
				<TestComponent
					selectedAgent={null}
					isFullscreen={false}
					scrollPosition={0}
					onToggleFullscreen={onToggleFullscreen}
				/>,
			);

			// Act
			stdin.write("f");

			// Assert
			expect(onToggleFullscreen).not.toHaveBeenCalled();
		});

		it("'f' key in fullscreen mode exits fullscreen", () => {
			// Arrange
			const onToggleFullscreen = vi.fn();
			const agent = createAgent("agent-1");
			const { stdin } = render(
				<TestComponent
					selectedAgent={agent}
					isFullscreen={true}
					scrollPosition={0}
					onToggleFullscreen={onToggleFullscreen}
				/>,
			);

			// Act
			stdin.write("f");

			// Assert
			expect(onToggleFullscreen).toHaveBeenCalled();
		});

		it("Escape key in fullscreen exits fullscreen", () => {
			// Arrange
			const onToggleFullscreen = vi.fn();
			const agent = createAgent("agent-1");
			const { stdin } = render(
				<TestComponent
					selectedAgent={agent}
					isFullscreen={true}
					scrollPosition={0}
					onToggleFullscreen={onToggleFullscreen}
				/>,
			);

			// Act - Escape key
			stdin.write("\u001b");

			// Assert
			expect(onToggleFullscreen).toHaveBeenCalled();
		});

		it("Escape key does nothing when not in fullscreen", () => {
			// Arrange
			const onToggleFullscreen = vi.fn();
			const agent = createAgent("agent-1");
			const { stdin } = render(
				<TestComponent
					selectedAgent={agent}
					isFullscreen={false}
					scrollPosition={0}
					onToggleFullscreen={onToggleFullscreen}
				/>,
			);

			// Act - Escape key
			stdin.write("\u001b");

			// Assert
			expect(onToggleFullscreen).not.toHaveBeenCalled();
		});
	});

	describe("Scroll in Fullscreen", () => {
		it("'j' key scrolls down in fullscreen", () => {
			// Arrange
			const onScroll = vi.fn();
			const agent = createAgent("agent-1");
			const { stdin } = render(
				<TestComponent
					selectedAgent={agent}
					isFullscreen={true}
					scrollPosition={0}
					onScroll={onScroll}
				/>,
			);

			// Act
			stdin.write("j");

			// Assert
			expect(onScroll).toHaveBeenCalledWith("down");
		});

		it("'k' key scrolls up in fullscreen", () => {
			// Arrange
			const onScroll = vi.fn();
			const agent = createAgent("agent-1");
			const { stdin } = render(
				<TestComponent
					selectedAgent={agent}
					isFullscreen={true}
					scrollPosition={50}
					onScroll={onScroll}
				/>,
			);

			// Act
			stdin.write("k");

			// Assert
			expect(onScroll).toHaveBeenCalledWith("up");
		});

		it("'j'/'k' keys do nothing when not in fullscreen", () => {
			// Arrange
			const onScroll = vi.fn();
			const agent = createAgent("agent-1");
			const { stdin } = render(
				<TestComponent
					selectedAgent={agent}
					isFullscreen={false}
					scrollPosition={0}
					onScroll={onScroll}
				/>,
			);

			// Act
			stdin.write("j");
			stdin.write("k");

			// Assert
			expect(onScroll).not.toHaveBeenCalled();
		});
	});
});
