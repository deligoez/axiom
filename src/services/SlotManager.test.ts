import { beforeEach, describe, expect, it } from "vitest";
import { SlotManager } from "./SlotManager.js";

describe("SlotManager", () => {
	let manager: SlotManager;
	const maxParallel = 3;

	beforeEach(() => {
		manager = new SlotManager(maxParallel);
	});

	// F22: getAvailable() - 2 tests
	describe("getAvailable()", () => {
		it("returns maxParallel when no slots acquired", () => {
			// Arrange - fresh manager

			// Act
			const available = manager.getAvailable();

			// Assert
			expect(available).toBe(maxParallel);
		});

		it("decreases by 1 for each acquired slot", () => {
			// Arrange
			manager.acquire();
			manager.acquire();

			// Act
			const available = manager.getAvailable();

			// Assert
			expect(available).toBe(maxParallel - 2);
		});
	});

	// F22: getCapacity() / getInUse() - 2 tests
	describe("getCapacity() and getInUse()", () => {
		it("getCapacity() returns maxParallel (immutable)", () => {
			// Arrange
			manager.acquire();
			manager.acquire();

			// Act
			const capacity = manager.getCapacity();

			// Assert
			expect(capacity).toBe(maxParallel);
		});

		it("getInUse() returns count of acquired slots", () => {
			// Arrange
			manager.acquire();
			manager.acquire();

			// Act
			const inUse = manager.getInUse();

			// Assert
			expect(inUse).toBe(2);
		});
	});

	// F22: acquire() - 2 tests
	describe("acquire()", () => {
		it("returns true and decrements available", () => {
			// Arrange
			const availableBefore = manager.getAvailable();

			// Act
			const result = manager.acquire();

			// Assert
			expect(result).toBe(true);
			expect(manager.getAvailable()).toBe(availableBefore - 1);
		});

		it("returns false when available === 0", () => {
			// Arrange - acquire all slots
			for (let i = 0; i < maxParallel; i++) {
				manager.acquire();
			}

			// Act
			const result = manager.acquire();

			// Assert
			expect(result).toBe(false);
			expect(manager.getAvailable()).toBe(0);
		});
	});

	// F22: release() - 2 tests
	describe("release()", () => {
		it("increments available count", () => {
			// Arrange
			manager.acquire();
			manager.acquire();
			const availableBefore = manager.getAvailable();

			// Act
			manager.release();

			// Assert
			expect(manager.getAvailable()).toBe(availableBefore + 1);
		});

		it("throws Error when inUse === 0", () => {
			// Arrange - no slots acquired

			// Act & Assert
			expect(() => manager.release()).toThrow(
				"Cannot release: no slots in use",
			);
		});
	});
});
