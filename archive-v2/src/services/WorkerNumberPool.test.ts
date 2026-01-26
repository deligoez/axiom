import { describe, expect, it } from "vitest";
import { WorkerNumberPool } from "./WorkerNumberPool.js";

describe("WorkerNumberPool", () => {
	describe("acquire()", () => {
		it("returns smallest available number", () => {
			// Arrange
			const pool = new WorkerNumberPool();

			// Act
			const num = pool.acquire();

			// Assert
			expect(num).toBe(1);
		});

		it("removes acquired number from pool", () => {
			// Arrange
			const pool = new WorkerNumberPool();

			// Act
			pool.acquire(); // gets 1
			const second = pool.acquire();

			// Assert
			expect(second).toBe(2);
		});

		it("on empty pool returns next sequential (pool starts 1-10)", () => {
			// Arrange
			const pool = new WorkerNumberPool();

			// Act - exhaust initial pool
			for (let i = 0; i < 10; i++) {
				pool.acquire();
			}
			const eleventh = pool.acquire();

			// Assert
			expect(eleventh).toBe(11);
		});
	});

	describe("release()", () => {
		it("adds number back to available pool", () => {
			// Arrange
			const pool = new WorkerNumberPool();
			pool.acquire(); // gets 1
			pool.acquire(); // gets 2
			pool.acquire(); // gets 3

			// Act
			pool.release(2);
			const next = pool.acquire();

			// Assert - should reuse released number
			expect(next).toBe(2);
		});

		it("numbers reused in ascending order (release 3,1 → acquire gets 1 first)", () => {
			// Arrange
			const pool = new WorkerNumberPool();
			pool.acquire(); // gets 1
			pool.acquire(); // gets 2
			pool.acquire(); // gets 3

			// Act
			pool.release(3);
			pool.release(1);
			const first = pool.acquire();
			const second = pool.acquire();

			// Assert - should get 1 before 3
			expect(first).toBe(1);
			expect(second).toBe(3);
		});
	});

	describe("formatNumber()", () => {
		it("returns 3-digit string", () => {
			// Arrange
			const pool = new WorkerNumberPool();

			// Act & Assert
			expect(pool.formatNumber(1)).toBe("001");
			expect(pool.formatNumber(2)).toBe("002");
			expect(pool.formatNumber(10)).toBe("010");
			expect(pool.formatNumber(100)).toBe("100");
			expect(pool.formatNumber(999)).toBe("999");
		});
	});
});
