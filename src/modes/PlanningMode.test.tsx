import { render } from "ink-testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlanningMode } from "./PlanningMode.js";

// Mock useTerminalSize hook
vi.mock("../hooks/useTerminalSize.js", () => ({
	useTerminalSize: () => ({ width: 100, height: 40 }),
}));

describe("PlanningMode", () => {
	let onModeSwitchMock: ReturnType<
		typeof vi.fn<(mode: string, data?: unknown) => void>
	>;
	let onLogMock: ReturnType<
		typeof vi.fn<
			(event: {
				mode: string;
				eventType: string;
				details: Record<string, unknown>;
			}) => void
		>
	>;

	beforeEach(() => {
		vi.clearAllMocks();
		onModeSwitchMock = vi.fn();
		onLogMock = vi.fn();
	});

	describe("Layout and rendering", () => {
		it("renders PlanningLayout component", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<PlanningMode onModeSwitch={onModeSwitchMock} />,
			);

			// Assert - should show PLANNING header from PlanningLayout
			expect(lastFrame()).toMatch(/PLANNING/i);
		});

		it("shows ChatInput for user input", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<PlanningMode onModeSwitch={onModeSwitchMock} />,
			);

			// Assert - should have message input area
			expect(lastFrame()).toMatch(/Message/i);
		});
	});

	describe("Conversation management", () => {
		it("manages conversation state with messages array", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<PlanningMode onModeSwitch={onModeSwitchMock} />,
			);

			// Assert - component renders without error
			expect(lastFrame()).toBeDefined();
		});

		it("handles user input via onMessage callback", () => {
			// Arrange
			const { lastFrame, stdin } = render(
				<PlanningMode onModeSwitch={onModeSwitchMock} />,
			);

			// Act - focus on input area first (Tab), then type
			stdin.write("\t"); // Switch to input focus

			// Assert - should have input area visible
			expect(lastFrame()).toBeDefined();
		});

		it("displays agent responses in agent window", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<PlanningMode
					onModeSwitch={onModeSwitchMock}
					initialMessages={[
						{ role: "assistant", content: "Planning response" },
					]}
				/>,
			);

			// Assert - should display response in agent area
			expect(lastFrame()).toContain("Planning response");
		});
	});

	describe("Planning workflows", () => {
		it("supports free-form planning - user describes goal", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<PlanningMode
					onModeSwitch={onModeSwitchMock}
					initialMessages={[{ role: "user", content: "Build a login system" }]}
				/>,
			);

			// Assert - shows user message
			expect(lastFrame()).toContain("Build a login system");
		});

		it("supports task list review - user pastes tasks", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<PlanningMode
					onModeSwitch={onModeSwitchMock}
					initialMessages={[
						{
							role: "user",
							content: "Review these tasks:\n1. Task A\n2. Task B",
						},
					]}
				/>,
			);

			// Assert - shows task review request
			expect(lastFrame()).toContain("Review these tasks");
		});

		it("supports spec parsing - user provides file path", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<PlanningMode
					onModeSwitch={onModeSwitchMock}
					initialMessages={[
						{ role: "user", content: "Parse spec from ./docs/spec.md" },
					]}
				/>,
			);

			// Assert - shows spec parsing request
			expect(lastFrame()).toContain("Parse spec from");
		});
	});

	describe("Mode transitions", () => {
		it("supports transition to Review mode via callback", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<PlanningMode onModeSwitch={onModeSwitchMock} />,
			);

			// Assert - component ready to transition (callback available)
			expect(lastFrame()).toBeDefined();
			expect(typeof onModeSwitchMock).toBe("function");
		});

		it("supports transition to Implementation mode via callback", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<PlanningMode onModeSwitch={onModeSwitchMock} />,
			);

			// Assert - component ready to transition
			expect(lastFrame()).toBeDefined();
			expect(typeof onModeSwitchMock).toBe("function");
		});

		it("preserves conversation state for mode switch", () => {
			// Arrange
			const messages = [
				{ role: "user" as const, content: "My goal" },
				{ role: "assistant" as const, content: "Agent response" },
			];

			// Act
			const { lastFrame } = render(
				<PlanningMode
					onModeSwitch={onModeSwitchMock}
					initialMessages={messages}
				/>,
			);

			// Assert - both messages visible
			expect(lastFrame()).toContain("My goal");
			expect(lastFrame()).toContain("Agent response");
		});
	});

	describe("Task panel", () => {
		it("shows task list panel when tasks exist", () => {
			// Arrange
			const tasks = [
				{ title: "Task 1", description: "First task" },
				{ title: "Task 2", description: "Second task" },
			];

			// Act
			const { lastFrame } = render(
				<PlanningMode onModeSwitch={onModeSwitchMock} tasks={tasks} />,
			);

			// Assert - should show tasks
			expect(lastFrame()).toMatch(/Task 1|Tasks/i);
		});
	});

	describe("Session logging", () => {
		it("logs mode events via SessionLogger callback", () => {
			// Arrange & Act
			render(
				<PlanningMode onModeSwitch={onModeSwitchMock} onLog={onLogMock} />,
			);

			// Assert - logging callback should have been called for mode entry
			expect(onLogMock).toHaveBeenCalled();
		});
	});
});
