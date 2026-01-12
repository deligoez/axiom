import { describe, expect, it, vi } from "vitest";

// Note: This hook tests keyboard bindings for sprint planning.
// Due to ink's useInput restrictions in test environments,
// we test the handler functions directly.

import {
	createSprintKeyHandler,
	type UseSprintKeysOptions,
} from "./useSprintKeys.js";

describe("useSprintKeys", () => {
	const createMockOptions = (
		overrides: Partial<UseSprintKeysOptions> = {},
	): UseSprintKeysOptions => ({
		isSprintRunning: false,
		onOpenPlanningPanel: vi.fn(),
		onCancelPlanning: vi.fn(),
		isPlanningPanelOpen: false,
		isDisabled: false,
		...overrides,
	});

	describe("Shift+S key", () => {
		it("opens sprint planning panel when pressed", () => {
			// Arrange
			const onOpenPlanningPanel = vi.fn();
			const options = createMockOptions({ onOpenPlanningPanel });
			const handler = createSprintKeyHandler(options);

			// Act
			handler("S", { shift: true, return: false, escape: false });

			// Assert
			expect(onOpenPlanningPanel).toHaveBeenCalledTimes(1);
		});

		it("does nothing when sprint is already running", () => {
			// Arrange
			const onOpenPlanningPanel = vi.fn();
			const options = createMockOptions({
				onOpenPlanningPanel,
				isSprintRunning: true,
			});
			const handler = createSprintKeyHandler(options);

			// Act
			handler("S", { shift: true, return: false, escape: false });

			// Assert
			expect(onOpenPlanningPanel).not.toHaveBeenCalled();
		});
	});

	describe("Esc key", () => {
		it("cancels planning when panel is open", () => {
			// Arrange
			const onCancelPlanning = vi.fn();
			const options = createMockOptions({
				onCancelPlanning,
				isPlanningPanelOpen: true,
			});
			const handler = createSprintKeyHandler(options);

			// Act
			handler("", { shift: false, return: false, escape: true });

			// Assert
			expect(onCancelPlanning).toHaveBeenCalledTimes(1);
		});

		it("does nothing when planning panel is not open", () => {
			// Arrange
			const onCancelPlanning = vi.fn();
			const options = createMockOptions({
				onCancelPlanning,
				isPlanningPanelOpen: false,
			});
			const handler = createSprintKeyHandler(options);

			// Act
			handler("", { shift: false, return: false, escape: true });

			// Assert
			expect(onCancelPlanning).not.toHaveBeenCalled();
		});
	});
});
