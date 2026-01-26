import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	AgentDataIntegration,
	type ErrorType,
} from "./AgentDataIntegration.js";

describe("AgentDataIntegration", () => {
	let tempDir: string;
	let integration: AgentDataIntegration;

	beforeEach(() => {
		vi.clearAllMocks();

		// Create temp directory
		tempDir = join(
			tmpdir(),
			`agent-data-integration-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		);
		mkdirSync(tempDir, { recursive: true });

		// Create integration instance
		integration = new AgentDataIntegration({ projectDir: tempDir });
	});

	afterEach(() => {
		try {
			rmSync(tempDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	// Test 1: onAgentStart calls logService.logStart
	it("onAgentStart calls logService.logStart with persona and taskId", () => {
		// Arrange
		const persona = "sage";
		const taskId = "ch-test1";
		const logService = integration.getLogService();
		const spy = vi.spyOn(logService, "logStart");

		// Act
		integration.onAgentStart(persona, taskId);

		// Assert
		expect(spy).toHaveBeenCalledWith(persona, taskId);
		expect(spy).toHaveBeenCalledTimes(1);
	});

	// Test 2: onIteration calls logService.logIteration
	it("onIteration calls logService.logIteration with all parameters", () => {
		// Arrange
		const persona = "chip";
		const taskId = "ch-test2";
		const iteration = 3;
		const input = "user input";
		const output = "agent output";
		const logService = integration.getLogService();
		const spy = vi.spyOn(logService, "logIteration");

		// Start task first to track it
		integration.onAgentStart(persona, taskId);

		// Act
		integration.onIteration(persona, taskId, iteration, input, output);

		// Assert
		expect(spy).toHaveBeenCalledWith(persona, taskId, iteration, input, output);
		expect(spy).toHaveBeenCalledTimes(1);
	});

	// Test 3: onSignal calls logService.logSignal
	it("onSignal calls logService.logSignal with type and optional payload", () => {
		// Arrange
		const persona = "archie";
		const taskId = "ch-test3";
		const signalType = "PROGRESS";
		const payload = "50";
		const logService = integration.getLogService();
		const spy = vi.spyOn(logService, "logSignal");

		// Act
		integration.onSignal(persona, taskId, signalType, payload);

		// Assert
		expect(spy).toHaveBeenCalledWith(persona, taskId, signalType, payload);
		expect(spy).toHaveBeenCalledTimes(1);
	});

	// Test 4: onComplete calls logService.logComplete + metricsService.recordTaskComplete
	it("onComplete calls logService and metricsService then flushes", () => {
		// Arrange
		const persona = "patch";
		const taskId = "ch-test4";

		const logService = integration.getLogService();
		const metricsService = integration.getMetricsService();

		const logCompleteSpy = vi.spyOn(logService, "logComplete");
		const recordCompleteSpy = vi.spyOn(metricsService, "recordTaskComplete");
		const flushSpy = vi.spyOn(metricsService, "flush");

		// Start task to track timing
		integration.onAgentStart(persona, taskId);
		// Simulate some iterations
		integration.onIteration(persona, taskId, 1, "in1", "out1");
		integration.onIteration(persona, taskId, 2, "in2", "out2");

		// Act
		integration.onComplete(persona, taskId);

		// Assert
		expect(logCompleteSpy).toHaveBeenCalledWith(
			persona,
			taskId,
			expect.any(Number), // durationMs
			2, // iterations
		);
		expect(recordCompleteSpy).toHaveBeenCalledWith(
			persona,
			expect.any(Number), // durationMs
			2, // iterations
		);
		expect(flushSpy).toHaveBeenCalledWith(persona);
	});

	// Test 5: onError calls logService.logError + metricsService.recordTaskFail
	it("onError calls logService and metricsService then flushes", () => {
		// Arrange
		const persona = "scout";
		const taskId = "ch-test5";
		const error = new Error("Test error");
		const errorType: ErrorType = "timeout";

		const logService = integration.getLogService();
		const metricsService = integration.getMetricsService();

		const logErrorSpy = vi.spyOn(logService, "logError");
		const recordFailSpy = vi.spyOn(metricsService, "recordTaskFail");
		const flushSpy = vi.spyOn(metricsService, "flush");

		// Start task first
		integration.onAgentStart(persona, taskId);

		// Act
		integration.onError(persona, taskId, error, errorType);

		// Assert
		expect(logErrorSpy).toHaveBeenCalledWith(persona, taskId, error);
		expect(recordFailSpy).toHaveBeenCalledWith(persona, errorType);
		expect(flushSpy).toHaveBeenCalledWith(persona);
	});

	// Test 6: onLearning calls learningsService.add
	it("onLearning calls learningsService.add with deduplication", () => {
		// Arrange
		const persona = "echo";
		const category = "performance";
		const learning = "Use memoization for expensive computations";
		const learningsService = integration.getLearningsService();
		const spy = vi.spyOn(learningsService, "add");

		// Act
		integration.onLearning(persona, category, learning);

		// Assert
		expect(spy).toHaveBeenCalledWith(persona, category, learning);
		expect(spy).toHaveBeenCalledTimes(1);
	});

	// Test 7: recordTokens calls metricsService.recordTokens
	it("recordTokens calls metricsService.recordTokens for cost tracking", () => {
		// Arrange
		const persona = "maestro";
		const inputTokens = 1500;
		const outputTokens = 500;
		const metricsService = integration.getMetricsService();
		const spy = vi.spyOn(metricsService, "recordTokens");

		// Act
		integration.recordTokens(persona, inputTokens, outputTokens);

		// Assert
		expect(spy).toHaveBeenCalledWith(persona, inputTokens, outputTokens);
		expect(spy).toHaveBeenCalledTimes(1);
	});
});
