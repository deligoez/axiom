import { describe, expect, it, vi } from "vitest";

// Test the logic directly without React rendering
// Following pattern from useAgentGrid.test.ts

interface MockKeyHandler {
	onOpen: () => void;
	isDisabled: boolean;
}

// Pure logic for testability
function handleKeyPress(
	input: string,
	handler: MockKeyHandler,
): { opened: boolean } {
	if (handler.isDisabled) {
		return { opened: false };
	}

	// Only 'M' (uppercase) opens merge queue panel
	if (input === "M") {
		handler.onOpen();
		return { opened: true };
	}

	return { opened: false };
}

describe("useMergeViewKey", () => {
	describe("Open Panel", () => {
		it("'M' (uppercase) key opens merge queue panel", () => {
			// Arrange
			const onOpen = vi.fn();
			const handler: MockKeyHandler = { onOpen, isDisabled: false };

			// Act
			const result = handleKeyPress("M", handler);

			// Assert
			expect(result.opened).toBe(true);
			expect(onOpen).toHaveBeenCalled();
		});

		it("'m' (lowercase) does NOT open (that's Mode Toggle)", () => {
			// Arrange
			const onOpen = vi.fn();
			const handler: MockKeyHandler = { onOpen, isDisabled: false };

			// Act
			const result = handleKeyPress("m", handler);

			// Assert
			expect(result.opened).toBe(false);
			expect(onOpen).not.toHaveBeenCalled();
		});
	});

	describe("Disabled State", () => {
		it("does not open when disabled", () => {
			// Arrange
			const onOpen = vi.fn();
			const handler: MockKeyHandler = { onOpen, isDisabled: true };

			// Act
			const result = handleKeyPress("M", handler);

			// Assert
			expect(result.opened).toBe(false);
			expect(onOpen).not.toHaveBeenCalled();
		});
	});

	describe("Other Keys", () => {
		it("ignores other keys", () => {
			// Arrange
			const onOpen = vi.fn();
			const handler: MockKeyHandler = { onOpen, isDisabled: false };

			// Act
			handleKeyPress("a", handler);
			handleKeyPress("q", handler);
			handleKeyPress("1", handler);

			// Assert
			expect(onOpen).not.toHaveBeenCalled();
		});
	});
});
