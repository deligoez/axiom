import { execSync } from "node:child_process";
import type { EventEmitter } from "node:events";

const DEFAULT_THRESHOLD = 100 * 1024 * 1024; // 100MB in bytes
const DEFAULT_INTERVAL = 60000; // 1 minute

export interface DiskSpaceInfo {
	available: number; // bytes
	total: number; // bytes
	percent: number; // percentage used
}

export interface DiskSpaceMonitorDeps {
	eventEmitter: EventEmitter;
	threshold?: number; // bytes
}

export class DiskSpaceMonitor {
	private eventEmitter: EventEmitter;
	private threshold: number;
	private monitorInterval: ReturnType<typeof setInterval> | null = null;
	private enospcCallbacks: Array<() => void> = [];

	constructor(deps: DiskSpaceMonitorDeps) {
		this.eventEmitter = deps.eventEmitter;
		this.threshold = deps.threshold ?? DEFAULT_THRESHOLD;

		// Listen for enospc events and call registered callbacks
		this.eventEmitter.on("enospc", () => {
			for (const callback of this.enospcCallbacks) {
				callback();
			}
		});
	}

	/**
	 * Check disk space and return available/total/percent info.
	 */
	async check(): Promise<DiskSpaceInfo> {
		return this.getDiskSpace();
	}

	/**
	 * Check if disk space is below threshold.
	 */
	async isLow(threshold?: number): Promise<boolean> {
		const info = await this.check();
		return info.available < (threshold ?? this.threshold);
	}

	/**
	 * Register callback for ENOSPC errors.
	 */
	onEnospc(callback: () => void): void {
		this.enospcCallbacks.push(callback);
	}

	/**
	 * Handle an error and detect ENOSPC.
	 */
	handleError(error: unknown): void {
		if (this.isEnospcError(error)) {
			const err = error instanceof Error ? error : new Error(String(error));
			this.eventEmitter.emit("diskFull", err);
		}
	}

	/**
	 * Check disk space and emit events if low or full.
	 */
	async checkAndEmit(): Promise<void> {
		const info = await this.check();

		if (info.available < this.threshold) {
			this.eventEmitter.emit("diskLow", {
				available: info.available,
				total: info.total,
				percent: info.percent,
			});
		}
	}

	/**
	 * Start monitoring disk space at intervals.
	 */
	startMonitoring(intervalMs = DEFAULT_INTERVAL): void {
		// Stop any existing monitoring
		this.stopMonitoring();

		// Check immediately
		void this.checkAndEmit();

		// Then check at intervals
		this.monitorInterval = setInterval(() => {
			void this.checkAndEmit();
		}, intervalMs);
	}

	/**
	 * Stop monitoring disk space.
	 */
	stopMonitoring(): void {
		if (this.monitorInterval) {
			clearInterval(this.monitorInterval);
			this.monitorInterval = null;
		}
	}

	/**
	 * Check if error is ENOSPC.
	 */
	private isEnospcError(error: unknown): boolean {
		if (error instanceof Error) {
			const nodeError = error as NodeJS.ErrnoException;
			return nodeError.code === "ENOSPC";
		}
		return false;
	}

	/**
	 * Get disk space info using df command.
	 */
	private getDiskSpace(): DiskSpaceInfo {
		try {
			// Use df to get disk space for current directory
			const output = execSync("df -k .", { encoding: "utf-8" });
			const lines = output.trim().split("\n");

			if (lines.length < 2) {
				return { available: 0, total: 0, percent: 100 };
			}

			// Parse the second line (first is header)
			const parts = lines[1].split(/\s+/);

			// df -k output format on macOS/Linux:
			// Filesystem 1K-blocks Used Available Use%
			// Parts: [filesystem, total, used, available, percent, ...]
			if (parts.length < 5) {
				return { available: 0, total: 0, percent: 100 };
			}

			const total = Number.parseInt(parts[1], 10) * 1024; // Convert from 1K-blocks to bytes
			const available = Number.parseInt(parts[3], 10) * 1024;
			const percentStr = parts[4].replace("%", "");
			const percent = Number.parseInt(percentStr, 10);

			return { available, total, percent };
		} catch (error) {
			// If df fails, warn and assume disk is full for safety
			console.warn("Failed to get disk space info:", error);
			return { available: 0, total: 0, percent: 100 };
		}
	}
}
