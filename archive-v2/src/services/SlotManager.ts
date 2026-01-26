export class SlotManager {
	private readonly capacity: number;
	private inUse: number = 0;

	constructor(maxParallel: number) {
		this.capacity = maxParallel;
	}

	getAvailable(): number {
		return this.capacity - this.inUse;
	}

	getCapacity(): number {
		return this.capacity;
	}

	getInUse(): number {
		return this.inUse;
	}

	hasAvailable(): boolean {
		return this.getAvailable() > 0;
	}

	acquire(): boolean {
		if (this.getAvailable() === 0) {
			return false;
		}
		this.inUse++;
		return true;
	}

	release(): void {
		if (this.inUse === 0) {
			throw new Error("Cannot release: no slots in use");
		}
		this.inUse--;
	}

	reset(): void {
		this.inUse = 0;
	}
}
