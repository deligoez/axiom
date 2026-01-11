import { describe, expect, it } from "vitest";
import { SlotManager } from "../services/SlotManager.js";

describe("E2E: Parallel Agent Orchestration", () => {
	describe("SlotManager Slot Allocation", () => {
		it("enforces maxParallel limit", () => {
			// Arrange
			const manager = new SlotManager(3);

			// Act - acquire 3 slots
			const slot1 = manager.acquire();
			const slot2 = manager.acquire();
			const slot3 = manager.acquire();
			const slot4 = manager.acquire(); // Should fail

			// Assert
			expect(slot1).toBe(true);
			expect(slot2).toBe(true);
			expect(slot3).toBe(true);
			expect(slot4).toBe(false); // No more slots available
			expect(manager.getInUse()).toBe(3);
		});

		it("queues requests when all slots full", () => {
			// Arrange
			const manager = new SlotManager(2);

			// Act - fill all slots
			manager.acquire();
			manager.acquire();

			// Assert - third acquire fails (no queueing in basic SlotManager)
			expect(manager.hasAvailable()).toBe(false);
			expect(manager.acquire()).toBe(false);
		});

		it("frees slot when agent completes", () => {
			// Arrange
			const manager = new SlotManager(2);
			manager.acquire();
			manager.acquire();
			expect(manager.hasAvailable()).toBe(false);

			// Act - release a slot
			manager.release();

			// Assert - slot is now available
			expect(manager.hasAvailable()).toBe(true);
			expect(manager.getAvailable()).toBe(1);
		});

		it("allows new agent after slot freed", () => {
			// Arrange
			const manager = new SlotManager(1);
			manager.acquire();
			expect(manager.acquire()).toBe(false); // Full

			// Act - release and acquire again
			manager.release();
			const newSlot = manager.acquire();

			// Assert
			expect(newSlot).toBe(true);
			expect(manager.getInUse()).toBe(1);
		});
	});

	describe("SlotManager Capacity Management", () => {
		it("reports correct capacity", () => {
			// Arrange & Act
			const manager = new SlotManager(5);

			// Assert
			expect(manager.getCapacity()).toBe(5);
			expect(manager.getAvailable()).toBe(5);
		});

		it("tracks in-use count correctly", () => {
			// Arrange
			const manager = new SlotManager(4);

			// Act
			manager.acquire();
			manager.acquire();

			// Assert
			expect(manager.getInUse()).toBe(2);
			expect(manager.getAvailable()).toBe(2);
		});

		it("reset clears all slots", () => {
			// Arrange
			const manager = new SlotManager(3);
			manager.acquire();
			manager.acquire();
			manager.acquire();
			expect(manager.getAvailable()).toBe(0);

			// Act
			manager.reset();

			// Assert
			expect(manager.getAvailable()).toBe(3);
			expect(manager.getInUse()).toBe(0);
		});

		it("throws error on invalid release", () => {
			// Arrange
			const manager = new SlotManager(2);

			// Act & Assert - cannot release without acquiring
			expect(() => manager.release()).toThrow(
				"Cannot release: no slots in use",
			);
		});
	});
});
