import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import {
	type KeyContext,
	type KeyHandler,
	useKeyboardRouter,
} from "./useKeyboardRouter.js";

// Test component that uses the hook
function TestComponent({
	handlers,
	context,
}: {
	handlers: KeyHandler[];
	context: KeyContext;
}) {
	useKeyboardRouter(handlers, context);
	return null;
}

function createContext(overrides: Partial<KeyContext> = {}): KeyContext {
	return {
		focusedPanel: "agentGrid",
		selectedTaskId: null,
		selectedAgentId: null,
		modalOpen: null,
		isPaused: false,
		currentMode: "semi-auto",
		taskStatus: null,
		...overrides,
	};
}

function createHandler(overrides: Partial<KeyHandler> = {}): KeyHandler {
	return {
		keys: ["a"],
		condition: () => true,
		handler: vi.fn(),
		priority: 50,
		...overrides,
	};
}

describe("useKeyboardRouter", () => {
	describe("routing tests", () => {
		it("routes 'r' on failed task to RecoveryKeys handler", () => {
			// Arrange
			const recoveryHandler = vi.fn();
			const redirectHandler = vi.fn();

			const handlers: KeyHandler[] = [
				{
					keys: ["r"],
					condition: (ctx) => ctx.taskStatus === "failed",
					handler: recoveryHandler,
					priority: 100,
				},
				{
					keys: ["r"],
					condition: () => true,
					handler: redirectHandler,
					priority: 50,
				},
			];

			const context = createContext({ taskStatus: "failed" });
			const { stdin } = render(
				<TestComponent handlers={handlers} context={context} />,
			);

			// Act
			stdin.write("r");

			// Assert
			expect(recoveryHandler).toHaveBeenCalledTimes(1);
			expect(redirectHandler).not.toHaveBeenCalled();
		});

		it("routes 'r' on normal task to QuickControlKeys handler", () => {
			// Arrange
			const recoveryHandler = vi.fn();
			const redirectHandler = vi.fn();

			const handlers: KeyHandler[] = [
				{
					keys: ["r"],
					condition: (ctx) => ctx.taskStatus === "failed",
					handler: recoveryHandler,
					priority: 100,
				},
				{
					keys: ["r"],
					condition: () => true,
					handler: redirectHandler,
					priority: 50,
				},
			];

			const context = createContext({ taskStatus: "in_progress" });
			const { stdin } = render(
				<TestComponent handlers={handlers} context={context} />,
			);

			// Act
			stdin.write("r");

			// Assert
			expect(redirectHandler).toHaveBeenCalledTimes(1);
			expect(recoveryHandler).not.toHaveBeenCalled();
		});

		it("routes 'm' key to ModeToggle handler", () => {
			// Arrange
			const modeToggleHandler = vi.fn();

			const handlers: KeyHandler[] = [
				{
					keys: ["m"],
					condition: () => true,
					handler: modeToggleHandler,
					priority: 50,
				},
			];

			const context = createContext();
			const { stdin } = render(
				<TestComponent handlers={handlers} context={context} />,
			);

			// Act
			stdin.write("m");

			// Assert
			expect(modeToggleHandler).toHaveBeenCalledTimes(1);
		});

		it("routes 'M' key to MergeQueueView handler", () => {
			// Arrange
			const mergeViewHandler = vi.fn();

			const handlers: KeyHandler[] = [
				{
					keys: ["M"],
					condition: () => true,
					handler: mergeViewHandler,
					priority: 50,
				},
			];

			const context = createContext();
			const { stdin } = render(
				<TestComponent handlers={handlers} context={context} />,
			);

			// Act
			stdin.write("M");

			// Assert
			expect(mergeViewHandler).toHaveBeenCalledTimes(1);
		});

		it("routes 'q' key to QuitHandler", () => {
			// Arrange
			const quitHandler = vi.fn();

			const handlers: KeyHandler[] = [
				{
					keys: ["q"],
					condition: () => true,
					handler: quitHandler,
					priority: 50,
				},
			];

			const context = createContext();
			const { stdin } = render(
				<TestComponent handlers={handlers} context={context} />,
			);

			// Act
			stdin.write("q");

			// Assert
			expect(quitHandler).toHaveBeenCalledTimes(1);
		});

		it("routes 'q' with running agents to confirmation handler", () => {
			// Arrange
			const confirmHandler = vi.fn();
			const quitHandler = vi.fn();

			const handlers: KeyHandler[] = [
				{
					keys: ["q"],
					condition: (ctx) => ctx.selectedAgentId !== null,
					handler: confirmHandler,
					priority: 100,
				},
				{
					keys: ["q"],
					condition: () => true,
					handler: quitHandler,
					priority: 50,
				},
			];

			const context = createContext({ selectedAgentId: "agent-1" });
			const { stdin } = render(
				<TestComponent handlers={handlers} context={context} />,
			);

			// Act
			stdin.write("q");

			// Assert
			expect(confirmHandler).toHaveBeenCalledTimes(1);
			expect(quitHandler).not.toHaveBeenCalled();
		});

		it("routes ESC in modal to close modal handler", () => {
			// Arrange
			const closeModalHandler = vi.fn();
			const appHandler = vi.fn();

			const handlers: KeyHandler[] = [
				{
					keys: ["escape"],
					condition: (ctx) => ctx.modalOpen !== null,
					handler: closeModalHandler,
					priority: 200,
				},
				{
					keys: ["escape"],
					condition: () => true,
					handler: appHandler,
					priority: 50,
				},
			];

			const context = createContext({ modalOpen: "help" });
			const { stdin } = render(
				<TestComponent handlers={handlers} context={context} />,
			);

			// Act
			stdin.write("\x1b"); // Escape key

			// Assert
			expect(closeModalHandler).toHaveBeenCalledTimes(1);
			expect(appHandler).not.toHaveBeenCalled();
		});

		it("blocks app-level handlers when modal is open", () => {
			// Arrange
			const modalHandler = vi.fn();
			const appHandler = vi.fn();

			const handlers: KeyHandler[] = [
				{
					keys: ["j"],
					condition: (ctx) => ctx.modalOpen !== null,
					handler: modalHandler,
					priority: 150,
				},
				{
					keys: ["j"],
					condition: (ctx) => ctx.modalOpen === null,
					handler: appHandler,
					priority: 50,
				},
			];

			const context = createContext({ modalOpen: "help" });
			const { stdin } = render(
				<TestComponent handlers={handlers} context={context} />,
			);

			// Act
			stdin.write("j");

			// Assert
			expect(modalHandler).toHaveBeenCalledTimes(1);
			expect(appHandler).not.toHaveBeenCalled();
		});

		it("ignores unhandled keys without error", () => {
			// Arrange
			const handler = vi.fn();

			const handlers: KeyHandler[] = [
				{
					keys: ["a"],
					condition: () => true,
					handler,
					priority: 50,
				},
			];

			const context = createContext();
			const { stdin } = render(
				<TestComponent handlers={handlers} context={context} />,
			);

			// Act - press a key that has no handler
			expect(() => stdin.write("z")).not.toThrow();

			// Assert
			expect(handler).not.toHaveBeenCalled();
		});
	});

	describe("priority tests", () => {
		it("runs higher priority handler first", () => {
			// Arrange
			const highPriorityHandler = vi.fn();
			const lowPriorityHandler = vi.fn();

			const handlers: KeyHandler[] = [
				{
					keys: ["a"],
					condition: () => true,
					handler: lowPriorityHandler,
					priority: 10,
				},
				{
					keys: ["a"],
					condition: () => true,
					handler: highPriorityHandler,
					priority: 100,
				},
			];

			const context = createContext();
			const { stdin } = render(
				<TestComponent handlers={handlers} context={context} />,
			);

			// Act
			stdin.write("a");

			// Assert
			expect(highPriorityHandler).toHaveBeenCalledTimes(1);
			expect(lowPriorityHandler).not.toHaveBeenCalled();
		});

		it("runs only one handler per keypress", () => {
			// Arrange
			const handler1 = vi.fn();
			const handler2 = vi.fn();

			const handlers: KeyHandler[] = [
				{
					keys: ["a"],
					condition: () => true,
					handler: handler1,
					priority: 50,
				},
				{
					keys: ["a"],
					condition: () => true,
					handler: handler2,
					priority: 50,
				},
			];

			const context = createContext();
			const { stdin } = render(
				<TestComponent handlers={handlers} context={context} />,
			);

			// Act
			stdin.write("a");

			// Assert - only first handler in sorted order runs
			expect(handler1).toHaveBeenCalledTimes(1);
			expect(handler2).not.toHaveBeenCalled();
		});

		it("checks condition before running handler", () => {
			// Arrange
			const handler = vi.fn();

			const handlers: KeyHandler[] = [
				{
					keys: ["a"],
					condition: () => false, // Always fails
					handler,
					priority: 50,
				},
			];

			const context = createContext();
			const { stdin } = render(
				<TestComponent handlers={handlers} context={context} />,
			);

			// Act
			stdin.write("a");

			// Assert
			expect(handler).not.toHaveBeenCalled();
		});
	});

	describe("context tests", () => {
		it("panel focus affects navigation key routing", () => {
			// Arrange
			const taskPanelNav = vi.fn();
			const agentGridNav = vi.fn();

			const handlers: KeyHandler[] = [
				{
					keys: ["j"],
					condition: (ctx) => ctx.focusedPanel === "left",
					handler: taskPanelNav,
					priority: 50,
				},
				{
					keys: ["j"],
					condition: (ctx) => ctx.focusedPanel === "right",
					handler: agentGridNav,
					priority: 50,
				},
			];

			const context = createContext({ focusedPanel: "left" });
			const { stdin } = render(
				<TestComponent handlers={handlers} context={context} />,
			);

			// Act
			stdin.write("j");

			// Assert
			expect(taskPanelNav).toHaveBeenCalledTimes(1);
			expect(agentGridNav).not.toHaveBeenCalled();
		});

		it("selected task affects control key routing", () => {
			// Arrange
			const stopHandler = vi.fn();
			const noopHandler = vi.fn();

			const handlers: KeyHandler[] = [
				{
					keys: ["x"],
					condition: (ctx) => ctx.selectedTaskId !== null,
					handler: stopHandler,
					priority: 50,
				},
				{
					keys: ["x"],
					condition: (ctx) => ctx.selectedTaskId === null,
					handler: noopHandler,
					priority: 50,
				},
			];

			const context = createContext({ selectedTaskId: "task-1" });
			const { stdin } = render(
				<TestComponent handlers={handlers} context={context} />,
			);

			// Act
			stdin.write("x");

			// Assert
			expect(stopHandler).toHaveBeenCalledTimes(1);
			expect(noopHandler).not.toHaveBeenCalled();
		});

		it("modal state affects all key routing", () => {
			// Arrange
			const modalHandler = vi.fn();
			const appHandler = vi.fn();

			const handlers: KeyHandler[] = [
				{
					keys: ["q"],
					condition: (ctx) => ctx.modalOpen !== null,
					handler: modalHandler,
					priority: 150,
				},
				{
					keys: ["q"],
					condition: (ctx) => ctx.modalOpen === null,
					handler: appHandler,
					priority: 50,
				},
			];

			const context = createContext({ modalOpen: "intervention" });
			const { stdin } = render(
				<TestComponent handlers={handlers} context={context} />,
			);

			// Act
			stdin.write("q");

			// Assert
			expect(modalHandler).toHaveBeenCalledTimes(1);
			expect(appHandler).not.toHaveBeenCalled();
		});
	});

	describe("registration tests", () => {
		it("supports multiple handlers for different keys", () => {
			// Arrange
			const handlerA = vi.fn();
			const handlerB = vi.fn();

			const handlers: KeyHandler[] = [
				createHandler({ keys: ["a"], handler: handlerA }),
				createHandler({ keys: ["b"], handler: handlerB }),
			];

			const context = createContext();
			const { stdin } = render(
				<TestComponent handlers={handlers} context={context} />,
			);

			// Act
			stdin.write("a");
			stdin.write("b");

			// Assert
			expect(handlerA).toHaveBeenCalledTimes(1);
			expect(handlerB).toHaveBeenCalledTimes(1);
		});

		it("handler can register for multiple keys", () => {
			// Arrange
			const handler = vi.fn();

			const handlers: KeyHandler[] = [
				createHandler({ keys: ["a", "b", "c"], handler }),
			];

			const context = createContext();
			const { stdin } = render(
				<TestComponent handlers={handlers} context={context} />,
			);

			// Act
			stdin.write("a");
			stdin.write("b");
			stdin.write("c");

			// Assert
			expect(handler).toHaveBeenCalledTimes(3);
		});
	});
});
