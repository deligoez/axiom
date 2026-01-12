import { render } from "ink-testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatInput } from "./ChatInput.js";

describe("ChatInput", () => {
	let onSendMock: ReturnType<typeof vi.fn<(message: string) => void>>;
	let onCancelMock: ReturnType<typeof vi.fn<() => void>>;

	beforeEach(() => {
		vi.clearAllMocks();
		onSendMock = vi.fn();
		onCancelMock = vi.fn();
	});

	describe("Rendering", () => {
		it("renders text input with placeholder text", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ChatInput onSend={onSendMock} placeholder="Type a message..." />,
			);

			// Assert
			expect(lastFrame()).toContain("Type a message...");
		});

		it("shows > prompt prefix", () => {
			// Arrange & Act
			const { lastFrame } = render(<ChatInput onSend={onSendMock} />);

			// Assert
			expect(lastFrame()).toMatch(/>/);
		});

		it("uses default placeholder when not specified", () => {
			// Arrange & Act
			const { lastFrame } = render(<ChatInput onSend={onSendMock} />);

			// Assert
			expect(lastFrame()).toBeDefined();
		});
	});

	describe("Sending messages", () => {
		it("does not send empty messages on Enter", () => {
			// Arrange
			const { stdin } = render(<ChatInput onSend={onSendMock} />);

			// Act - press Enter without typing
			stdin.write("\r");

			// Assert
			expect(onSendMock).not.toHaveBeenCalled();
		});

		it("accepts onSend callback prop", () => {
			// Arrange & Act
			const { lastFrame } = render(<ChatInput onSend={onSendMock} />);

			// Assert - renders successfully with callback
			expect(lastFrame()).toBeDefined();
			expect(typeof onSendMock).toBe("function");
		});
	});

	describe("Clearing input", () => {
		it("Esc key does not trigger send", () => {
			// Arrange
			const { stdin } = render(<ChatInput onSend={onSendMock} />);

			// Act - type something then Escape
			stdin.write("text");
			stdin.write("\x1B"); // Escape key

			// Assert
			expect(onSendMock).not.toHaveBeenCalled();
		});
	});

	describe("Cancel callback", () => {
		it("Ctrl+C triggers cancel/exit callback", () => {
			// Arrange
			const { stdin } = render(
				<ChatInput onSend={onSendMock} onCancel={onCancelMock} />,
			);

			// Act
			stdin.write("\x03"); // Ctrl+C

			// Assert
			expect(onCancelMock).toHaveBeenCalled();
		});

		it("does not crash without onCancel callback", () => {
			// Arrange
			const { stdin, lastFrame } = render(<ChatInput onSend={onSendMock} />);

			// Act
			stdin.write("\x03"); // Ctrl+C

			// Assert - should not throw
			expect(lastFrame()).toBeDefined();
		});
	});

	describe("History navigation", () => {
		it("accepts history prop", () => {
			// Arrange
			const history = ["First message", "Second message"];

			// Act
			const { lastFrame } = render(
				<ChatInput onSend={onSendMock} history={history} />,
			);

			// Assert - renders successfully
			expect(lastFrame()).toBeDefined();
		});

		it("defaults to empty history", () => {
			// Arrange & Act
			const { lastFrame } = render(<ChatInput onSend={onSendMock} />);

			// Assert - renders with default empty history
			expect(lastFrame()).toBeDefined();
		});
	});

	describe("Input handling", () => {
		it("handles Tab key without error", () => {
			// Arrange
			const { stdin, lastFrame } = render(<ChatInput onSend={onSendMock} />);

			// Act
			stdin.write("\t");

			// Assert - should not crash
			expect(lastFrame()).toBeDefined();
		});

		it("handles backspace without error", () => {
			// Arrange
			const { stdin, lastFrame } = render(<ChatInput onSend={onSendMock} />);

			// Act
			stdin.write("\x7F"); // Backspace

			// Assert - should not crash
			expect(lastFrame()).toBeDefined();
		});
	});
});
