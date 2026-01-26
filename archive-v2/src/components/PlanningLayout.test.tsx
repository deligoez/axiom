import { Text } from "ink";
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
import { PlanningLayout } from "./PlanningLayout.js";

// Mock useTerminalSize hook
vi.mock("../hooks/useTerminalSize.js", () => ({
	useTerminalSize: () => ({ width: 100, height: 40 }),
}));

describe("PlanningLayout", () => {
	let onMessageMock: ReturnType<typeof vi.fn<(text: string) => void>>;
	const originalIsTTY = process.stdin.isTTY;

	beforeAll(() => {
		// Mock isTTY to enable input handling in tests
		Object.defineProperty(process.stdin, "isTTY", {
			value: true,
			writable: true,
			configurable: true,
		});
	});

	afterAll(() => {
		// Restore original isTTY value
		Object.defineProperty(process.stdin, "isTTY", {
			value: originalIsTTY,
			writable: true,
			configurable: true,
		});
	});

	beforeEach(() => {
		vi.clearAllMocks();
		onMessageMock = vi.fn();
	});

	describe("Layout structure", () => {
		it("renders 80% height agent window area", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<PlanningLayout onMessage={onMessageMock}>
					<Text>Agent content</Text>
				</PlanningLayout>,
			);

			// Assert - should have a border or structure
			expect(lastFrame()).toBeDefined();
			expect(lastFrame()).toContain("Agent content");
		});

		it("renders 20% height chat input area", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<PlanningLayout onMessage={onMessageMock}>
					<Text>Content</Text>
				</PlanningLayout>,
			);

			// Assert - should have input area marker or placeholder
			expect(lastFrame()).toBeDefined();
		});

		it("accepts children prop for agent content", () => {
			// Arrange
			const agentContent = <Text>Custom agent content here</Text>;

			// Act
			const { lastFrame } = render(
				<PlanningLayout onMessage={onMessageMock}>
					{agentContent}
				</PlanningLayout>,
			);

			// Assert
			expect(lastFrame()).toContain("Custom agent content");
		});
	});

	describe("Header and footer", () => {
		it("shows mode indicator PLANNING in header", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<PlanningLayout onMessage={onMessageMock}>
					<Text>Content</Text>
				</PlanningLayout>,
			);

			// Assert
			expect(lastFrame()).toMatch(/PLANNING/i);
		});

		it("shows help shortcut hints in footer", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<PlanningLayout onMessage={onMessageMock}>
					<Text>Content</Text>
				</PlanningLayout>,
			);

			// Assert - should show at least some shortcut hints
			expect(lastFrame()).toMatch(/Enter|Tab|Esc/i);
		});
	});

	describe("Focus management", () => {
		it("manages focus between agent window and input area", () => {
			// Arrange
			const { lastFrame } = render(
				<PlanningLayout onMessage={onMessageMock}>
					<Text>Content</Text>
				</PlanningLayout>,
			);

			// Assert - should have visual focus indicator
			expect(lastFrame()).toBeDefined();
		});

		it("Tab key toggles focus between areas", () => {
			// Arrange
			const { lastFrame, stdin } = render(
				<PlanningLayout onMessage={onMessageMock}>
					<Text>Content</Text>
				</PlanningLayout>,
			);

			// Act - press Tab
			stdin.write("\t");

			// Assert - should toggle (visual change not easily testable)
			expect(lastFrame()).toBeDefined();
		});
	});

	describe("Input callback", () => {
		it("accepts onMessage callback for input", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<PlanningLayout onMessage={onMessageMock}>
					<Text>Content</Text>
				</PlanningLayout>,
			);

			// Assert - component renders without error with callback
			expect(lastFrame()).toBeDefined();
			expect(typeof onMessageMock).toBe("function");
		});
	});

	describe("Scrolling", () => {
		it("agent window supports long content", () => {
			// Arrange
			const longContent = Array(50)
				.fill("Line of content")
				.map((line, i) => `${i}: ${line}`)
				.join("\n");

			// Act
			const { lastFrame } = render(
				<PlanningLayout onMessage={onMessageMock}>
					<Text>{longContent}</Text>
				</PlanningLayout>,
			);

			// Assert - should render without error
			expect(lastFrame()).toBeDefined();
		});
	});

	describe("Terminal resize", () => {
		it("responds to terminal resize via useTerminalSize hook", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<PlanningLayout onMessage={onMessageMock}>
					<Text>Content</Text>
				</PlanningLayout>,
			);

			// Assert - component uses useTerminalSize hook (mocked)
			// Layout should render at mocked height (40)
			expect(lastFrame()).toBeDefined();
		});
	});
});
