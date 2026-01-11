import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type OrchestratorControl, PauseHandler } from "./PauseHandler.js";

describe("PauseHandler", () => {
	let handler: PauseHandler;
	let mockOrchestrator: OrchestratorControl;
	let mockSetPaused: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		mockSetPaused = vi.fn();
		mockOrchestrator = {
			setPaused: mockSetPaused as OrchestratorControl["setPaused"],
		};

		handler = new PauseHandler(mockOrchestrator);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("pause", () => {
		it("sets paused to true", async () => {
			// Arrange

			// Act
			await handler.pause();

			// Assert
			expect(handler.isPaused()).toBe(true);
		});

		it("records timestamp", async () => {
			// Arrange
			const now = new Date("2026-01-11T12:00:00Z");
			vi.setSystemTime(now);

			// Act
			await handler.pause();

			// Assert
			expect(handler.getPauseDuration()).toBe(0);
		});

		it("calls orchestrator.setPaused(true)", async () => {
			// Arrange

			// Act
			await handler.pause();

			// Assert
			expect(mockSetPaused).toHaveBeenCalledWith(true);
		});

		it("is idempotent - double pause returns success", async () => {
			// Arrange
			await handler.pause();

			// Act
			const result = await handler.pause();

			// Assert
			expect(result.success).toBe(true);
			expect(mockSetPaused).toHaveBeenCalledTimes(2);
		});
	});

	describe("resume", () => {
		it("sets paused to false", async () => {
			// Arrange
			await handler.pause();

			// Act
			await handler.resume();

			// Assert
			expect(handler.isPaused()).toBe(false);
		});

		it("calls orchestrator.setPaused(false)", async () => {
			// Arrange
			await handler.pause();
			mockSetPaused.mockClear();

			// Act
			await handler.resume();

			// Assert
			expect(mockSetPaused).toHaveBeenCalledWith(false);
		});

		it("when not paused returns success", async () => {
			// Arrange - not paused

			// Act
			const result = await handler.resume();

			// Assert
			expect(result.success).toBe(true);
		});
	});

	describe("isPaused", () => {
		it("returns correct state", async () => {
			// Arrange

			// Act & Assert
			expect(handler.isPaused()).toBe(false);
			await handler.pause();
			expect(handler.isPaused()).toBe(true);
			await handler.resume();
			expect(handler.isPaused()).toBe(false);
		});
	});

	describe("getPauseDuration", () => {
		it("calculates correctly", async () => {
			// Arrange
			vi.setSystemTime(new Date("2026-01-11T12:00:00Z"));
			await handler.pause();

			// Act - advance time by 5 seconds
			vi.setSystemTime(new Date("2026-01-11T12:00:05Z"));
			const duration = handler.getPauseDuration();

			// Assert
			expect(duration).toBe(5000);
		});

		it("returns null when not paused", () => {
			// Arrange - not paused

			// Act
			const duration = handler.getPauseDuration();

			// Assert
			expect(duration).toBeNull();
		});
	});
});
