import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DiskSpaceMonitor } from "./DiskSpaceMonitor.js";

// Mock child_process
const { mockExecSync } = vi.hoisted(() => ({
	mockExecSync: vi.fn(),
}));

vi.mock("node:child_process", () => ({
	execSync: mockExecSync,
}));

describe("DiskSpaceMonitor", () => {
	let monitor: DiskSpaceMonitor;
	let eventEmitter: EventEmitter;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		eventEmitter = new EventEmitter();
		monitor = new DiskSpaceMonitor({ eventEmitter });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("check()", () => {
		it("returns available space in bytes", async () => {
			// Arrange
			// df -k output format: Filesystem 1K-blocks Used Available Use%
			// We simulate 1GB total, 600MB used, 400MB available
			mockExecSync.mockReturnValue(
				"Filesystem     1K-blocks      Used Available Use%\n/dev/disk1s1 1000000 600000 400000    60%\n",
			);

			// Act
			const result = await monitor.check();

			// Assert
			expect(result.available).toBeGreaterThan(0);
			expect(typeof result.available).toBe("number");
		});

		it("returns total space and percentage", async () => {
			// Arrange
			mockExecSync.mockReturnValue(
				"Filesystem     1K-blocks      Used Available Use%\n/dev/disk1s1 1000000 600000 400000    60%\n",
			);

			// Act
			const result = await monitor.check();

			// Assert
			expect(result).toHaveProperty("total");
			expect(result).toHaveProperty("percent");
			expect(result.total).toBeGreaterThan(0);
			expect(result.percent).toBeGreaterThanOrEqual(0);
			expect(result.percent).toBeLessThanOrEqual(100);
		});
	});

	describe("isLow()", () => {
		it("returns true when below default threshold (100MB)", async () => {
			// Arrange - 50MB available (below 100MB threshold)
			// 50MB = 50 * 1024 = 51200 1K-blocks
			mockExecSync.mockReturnValue(
				"Filesystem     1K-blocks      Used Available Use%\n/dev/disk1s1 1000000 948800 51200    99%\n",
			);

			// Act
			const result = await monitor.isLow();

			// Assert
			expect(result).toBe(true);
		});

		it("returns false when above threshold", async () => {
			// Arrange - 500MB available (above 100MB threshold)
			// 500MB = 500 * 1024 = 512000 1K-blocks
			mockExecSync.mockReturnValue(
				"Filesystem     1K-blocks      Used Available Use%\n/dev/disk1s1 1000000 488000 512000    49%\n",
			);

			// Act
			const result = await monitor.isLow();

			// Assert
			expect(result).toBe(false);
		});

		it("accepts custom threshold parameter", async () => {
			// Arrange - 150MB available
			// 150MB = 150 * 1024 = 153600 1K-blocks
			mockExecSync.mockReturnValue(
				"Filesystem     1K-blocks      Used Available Use%\n/dev/disk1s1 1000000 846400 153600    85%\n",
			);

			// Act - with 200MB threshold
			const result = await monitor.isLow(200 * 1024 * 1024);

			// Assert - 150MB is below 200MB threshold
			expect(result).toBe(true);
		});
	});

	describe("onEnospc()", () => {
		it("registers error handler callback", () => {
			// Arrange
			const callback = vi.fn();

			// Act
			monitor.onEnospc(callback);

			// Emit ENOSPC error through event emitter
			eventEmitter.emit("enospc", new Error("ENOSPC"));

			// Assert
			expect(callback).toHaveBeenCalled();
		});
	});

	describe("ENOSPC Detection", () => {
		it("detects ENOSPC from child process stderr", () => {
			// Arrange
			const diskFullHandler = vi.fn();
			eventEmitter.on("diskFull", diskFullHandler);

			// Act - simulate ENOSPC detection
			const error = new Error(
				"No space left on device",
			) as NodeJS.ErrnoException;
			error.code = "ENOSPC";
			monitor.handleError(error);

			// Assert
			expect(diskFullHandler).toHaveBeenCalledWith(expect.any(Error));
		});
	});

	describe("Events", () => {
		it("emits 'diskLow' event when threshold crossed", async () => {
			// Arrange
			const diskLowHandler = vi.fn();
			eventEmitter.on("diskLow", diskLowHandler);

			// Low disk space - 50MB available (below 100MB threshold)
			// 50MB = 50 * 1024 = 51200 1K-blocks
			mockExecSync.mockReturnValue(
				"Filesystem     1K-blocks      Used Available Use%\n/dev/disk1s1 1000000 948800 51200    99%\n",
			);

			// Act
			await monitor.checkAndEmit();

			// Assert
			expect(diskLowHandler).toHaveBeenCalledWith(
				expect.objectContaining({
					available: expect.any(Number),
				}),
			);
		});

		it("emits 'diskFull' event on ENOSPC detection", () => {
			// Arrange
			const diskFullHandler = vi.fn();
			eventEmitter.on("diskFull", diskFullHandler);

			// Act
			const error = new Error(
				"No space left on device",
			) as NodeJS.ErrnoException;
			error.code = "ENOSPC";
			monitor.handleError(error);

			// Assert
			expect(diskFullHandler).toHaveBeenCalled();
		});
	});

	describe("Monitoring", () => {
		it("startMonitoring() checks disk space at intervals", async () => {
			// Arrange
			mockExecSync.mockReturnValue(
				"Filesystem     1K-blocks      Used Available Use%\n/dev/disk1s1 1000000 500000 500000    50%\n",
			);

			// Act
			monitor.startMonitoring(1000); // 1 second interval

			// Fast-forward time
			await vi.advanceTimersByTimeAsync(3000);

			// Assert - should have checked at least 3 times
			expect(mockExecSync).toHaveBeenCalled();
			expect(mockExecSync.mock.calls.length).toBeGreaterThanOrEqual(3);

			// Cleanup
			monitor.stopMonitoring();
		});

		it("stopMonitoring() stops interval checks", async () => {
			// Arrange
			mockExecSync.mockReturnValue(
				"Filesystem     1K-blocks      Used Available Use%\n/dev/disk1s1 1000000 500000 500000    50%\n",
			);

			// Act
			monitor.startMonitoring(1000);
			await vi.advanceTimersByTimeAsync(2000);
			const callCountBeforeStop = mockExecSync.mock.calls.length;

			monitor.stopMonitoring();
			await vi.advanceTimersByTimeAsync(3000);

			// Assert - no new calls after stop
			expect(mockExecSync.mock.calls.length).toBe(callCountBeforeStop);
		});
	});
});
