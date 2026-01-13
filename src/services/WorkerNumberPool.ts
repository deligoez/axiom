/**
 * Worker Number Pool Service
 *
 * Manages instance numbering for worker agents, ensuring efficient
 * reuse of numbers when workers are released.
 */

/**
 * Initial pool size.
 */
const INITIAL_POOL_SIZE = 10;

/**
 * Pool for managing worker instance numbers.
 * Numbers are reused in ascending order when released.
 */
export class WorkerNumberPool {
	/** Available numbers sorted in ascending order */
	private available: Set<number>;
	/** Next number to use when pool is empty */
	private nextNumber: number;

	constructor() {
		// Initialize pool with numbers 1-10
		this.available = new Set<number>();
		for (let i = 1; i <= INITIAL_POOL_SIZE; i++) {
			this.available.add(i);
		}
		this.nextNumber = INITIAL_POOL_SIZE + 1;
	}

	/**
	 * Acquire the smallest available number.
	 * If pool is empty, returns the next sequential number.
	 */
	acquire(): number {
		if (this.available.size === 0) {
			const num = this.nextNumber;
			this.nextNumber++;
			return num;
		}

		// Get smallest available number
		const sorted = Array.from(this.available).sort((a, b) => a - b);
		const num = sorted[0];
		this.available.delete(num);
		return num;
	}

	/**
	 * Release a number back to the pool for reuse.
	 */
	release(num: number): void {
		this.available.add(num);
	}

	/**
	 * Format a number as a 3-digit string with leading zeros.
	 */
	formatNumber(num: number): string {
		return num.toString().padStart(3, "0");
	}
}
