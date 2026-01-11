import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompletionHandlerDeps } from "./CompletionHandler.js";
import { CompletionHandler } from "./CompletionHandler.js";

describe("CompletionHandler", () => {
	let handler: CompletionHandler;
	let deps: CompletionHandlerDeps;
	let eventEmitter: EventEmitter;

	beforeEach(() => {
		eventEmitter = new EventEmitter();

		deps = {
			completionChecker: {
				check: vi.fn().mockResolvedValue({
					complete: true,
					hasSignal: true,
					testsPassed: true,
				}),
			} as unknown as CompletionHandlerDeps["completionChecker"],
			beadsCLI: {
				closeTask: vi.fn().mockResolvedValue(undefined),
				getTask: vi.fn().mockResolvedValue({
					id: "ch-123",
					title: "Test task",
					status: "in_progress",
					priority: 1,
					labels: [],
					dependencies: [],
				}),
			} as unknown as CompletionHandlerDeps["beadsCLI"],
			dependencyResolver: {
				getDependents: vi.fn().mockResolvedValue([]),
				check: vi.fn().mockResolvedValue({ satisfied: true }),
			} as unknown as CompletionHandlerDeps["dependencyResolver"],
			scratchpadManager: {
				read: vi.fn().mockResolvedValue(null),
				extractLearningsSection: vi.fn().mockReturnValue(null),
				clear: vi.fn().mockResolvedValue(undefined),
			} as unknown as CompletionHandlerDeps["scratchpadManager"],
			learningExtractor: {
				parse: vi.fn().mockReturnValue([]),
			} as unknown as CompletionHandlerDeps["learningExtractor"],
			learningStore: {
				append: vi
					.fn()
					.mockResolvedValue({ added: [], skipped: [], merged: [] }),
				commit: vi.fn().mockResolvedValue(undefined),
			} as unknown as CompletionHandlerDeps["learningStore"],
			signalParser: {
				isBlocked: vi.fn().mockReturnValue(false),
				hasSignal: vi.fn().mockReturnValue(false),
				getReason: vi.fn().mockReturnValue(null),
			} as unknown as CompletionHandlerDeps["signalParser"],
			eventEmitter,
			config: {
				maxIterations: 50,
			},
		};

		handler = new CompletionHandler(deps);
	});

	const createParams = (overrides = {}) => ({
		taskId: "ch-123",
		agentId: "claude-ch-123",
		output: "<chorus>COMPLETE</chorus>",
		worktreePath: "/worktrees/claude-ch-123",
		branch: "agent/claude/ch-123",
		agentType: "claude" as const,
		iteration: 1,
		...overrides,
	});

	// F16a: handleAgentExit() - Success Path - 5 tests
	describe("handleAgentExit() - Success Path", () => {
		it("returns success when signal + tests pass", async () => {
			// Arrange
			const params = createParams();

			// Act
			const result = await handler.handleAgentExit(params);

			// Assert
			expect(result.success).toBe(true);
			expect(result.action).toBe("success");
		});

		it("closes task via beadsCLI.closeTask()", async () => {
			// Arrange
			const params = createParams();

			// Act
			await handler.handleAgentExit(params);

			// Assert
			expect(deps.beadsCLI.closeTask).toHaveBeenCalledWith(
				"ch-123",
				expect.any(String),
			);
		});

		it("emits 'completed' event with taskId, agentId", async () => {
			// Arrange
			const params = createParams();
			const completedSpy = vi.fn();
			eventEmitter.on("completed", completedSpy);

			// Act
			await handler.handleAgentExit(params);

			// Assert
			expect(completedSpy).toHaveBeenCalledWith({
				taskId: "ch-123",
				agentId: "claude-ch-123",
			});
		});

		it("emits 'readyForMerge' event with taskId, branch, worktreePath", async () => {
			// Arrange
			const params = createParams();
			const mergeSpy = vi.fn();
			eventEmitter.on("readyForMerge", mergeSpy);

			// Act
			await handler.handleAgentExit(params);

			// Assert
			expect(mergeSpy).toHaveBeenCalledWith({
				taskId: "ch-123",
				branch: "agent/claude/ch-123",
				worktreePath: "/worktrees/claude-ch-123",
			});
		});

		it("returns TaskCompletionResult with success=true", async () => {
			// Arrange
			const params = createParams();

			// Act
			const result = await handler.handleAgentExit(params);

			// Assert
			expect(result).toEqual(
				expect.objectContaining({
					taskId: "ch-123",
					agentId: "claude-ch-123",
					success: true,
					action: "success",
				}),
			);
		});
	});

	// F16a: Learning Extraction - 6 tests
	describe("handleSuccess() - Learning Extraction", () => {
		it("reads scratchpad from agent's worktree via ScratchpadManager.read()", async () => {
			// Arrange
			const params = createParams();

			// Act
			await handler.handleAgentExit(params);

			// Assert
			expect(deps.scratchpadManager.read).toHaveBeenCalled();
		});

		it("extracts learnings if learningsSection present via LearningExtractor.parse()", async () => {
			// Arrange
			const params = createParams();
			vi.mocked(deps.scratchpadManager.read).mockResolvedValue({
				content: "## Learnings\n- [LOCAL] Something learned",
				path: "/worktrees/claude-ch-123/.agent/scratchpad.md",
				modifiedAt: new Date(),
			});
			vi.mocked(deps.scratchpadManager.extractLearningsSection).mockReturnValue(
				"- [LOCAL] Something learned",
			);
			vi.mocked(deps.learningExtractor.parse).mockReturnValue([
				{
					id: "learn-1",
					content: "Something learned",
					scope: "local",
					category: "general",
					source: {
						taskId: "ch-123",
						agentType: "claude",
						timestamp: new Date(),
					},
					suggestPattern: false,
				},
			]);

			// Act
			await handler.handleAgentExit(params);

			// Assert
			expect(deps.learningExtractor.parse).toHaveBeenCalledWith(
				"- [LOCAL] Something learned",
				"ch-123",
				"claude",
			);
		});

		it("skips extraction gracefully when no learnings section", async () => {
			// Arrange
			const params = createParams();
			vi.mocked(deps.scratchpadManager.read).mockResolvedValue({
				content: "## Notes\nSome notes",
				path: "/worktrees/claude-ch-123/.agent/scratchpad.md",
				modifiedAt: new Date(),
			});
			vi.mocked(deps.scratchpadManager.extractLearningsSection).mockReturnValue(
				null,
			);

			// Act
			const result = await handler.handleAgentExit(params);

			// Assert
			expect(result.success).toBe(true);
			expect(deps.learningExtractor.parse).not.toHaveBeenCalled();
		});

		it("appends learnings to shared store via LearningStore.append()", async () => {
			// Arrange
			const params = createParams();
			const learnings = [
				{
					id: "learn-1",
					content: "Something learned",
					scope: "local" as const,
					category: "general",
					source: {
						taskId: "ch-123",
						agentType: "claude" as const,
						timestamp: new Date(),
					},
					suggestPattern: false,
				},
			];
			vi.mocked(deps.scratchpadManager.read).mockResolvedValue({
				content: "## Learnings\n- [LOCAL] Something",
				path: "/path",
				modifiedAt: new Date(),
			});
			vi.mocked(deps.scratchpadManager.extractLearningsSection).mockReturnValue(
				"- [LOCAL] Something",
			);
			vi.mocked(deps.learningExtractor.parse).mockReturnValue(learnings);

			// Act
			await handler.handleAgentExit(params);

			// Assert
			expect(deps.learningStore.append).toHaveBeenCalledWith(learnings);
		});

		it("commits learnings with attribution via LearningStore.commit()", async () => {
			// Arrange
			const params = createParams();
			vi.mocked(deps.scratchpadManager.read).mockResolvedValue({
				content: "## Learnings\n- [LOCAL] Something",
				path: "/path",
				modifiedAt: new Date(),
			});
			vi.mocked(deps.scratchpadManager.extractLearningsSection).mockReturnValue(
				"- [LOCAL] Something",
			);
			vi.mocked(deps.learningExtractor.parse).mockReturnValue([
				{
					id: "learn-1",
					content: "Something",
					scope: "local" as const,
					category: "general",
					source: {
						taskId: "ch-123",
						agentType: "claude" as const,
						timestamp: new Date(),
					},
					suggestPattern: false,
				},
			]);

			// Act
			await handler.handleAgentExit(params);

			// Assert
			expect(deps.learningStore.commit).toHaveBeenCalledWith(
				"ch-123",
				"claude",
			);
		});

		it("clears scratchpad after successful extraction via ScratchpadManager.clear()", async () => {
			// Arrange
			const params = createParams();
			vi.mocked(deps.scratchpadManager.read).mockResolvedValue({
				content: "## Learnings\n- [LOCAL] Something",
				path: "/path",
				modifiedAt: new Date(),
			});
			vi.mocked(deps.scratchpadManager.extractLearningsSection).mockReturnValue(
				"- [LOCAL] Something",
			);
			vi.mocked(deps.learningExtractor.parse).mockReturnValue([
				{
					id: "learn-1",
					content: "Something",
					scope: "local" as const,
					category: "general",
					source: {
						taskId: "ch-123",
						agentType: "claude" as const,
						timestamp: new Date(),
					},
					suggestPattern: false,
				},
			]);

			// Act
			await handler.handleAgentExit(params);

			// Assert
			expect(deps.scratchpadManager.clear).toHaveBeenCalled();
		});
	});

	// F16a: CASCADE Unblock - 6 tests
	describe("handleSuccess() - CASCADE Unblock", () => {
		it("gets dependent tasks via dependencyResolver.getDependents()", async () => {
			// Arrange
			const params = createParams();

			// Act
			await handler.handleAgentExit(params);

			// Assert
			expect(deps.dependencyResolver.getDependents).toHaveBeenCalledWith(
				"ch-123",
			);
		});

		it("checks each dependent's full dependency satisfaction", async () => {
			// Arrange
			const params = createParams();
			vi.mocked(deps.dependencyResolver.getDependents).mockResolvedValue([
				"ch-dep1",
				"ch-dep2",
			]);

			// Act
			await handler.handleAgentExit(params);

			// Assert
			expect(deps.dependencyResolver.check).toHaveBeenCalledWith("ch-dep1");
			expect(deps.dependencyResolver.check).toHaveBeenCalledWith("ch-dep2");
		});

		it("returns unblockedTasks in result", async () => {
			// Arrange
			const params = createParams();
			vi.mocked(deps.dependencyResolver.getDependents).mockResolvedValue([
				"ch-dep1",
			]);
			vi.mocked(deps.dependencyResolver.check).mockResolvedValue({
				satisfied: true,
				pending: [],
				inProgress: [],
				failed: [],
			});

			// Act
			const result = await handler.handleAgentExit(params);

			// Assert
			expect(result.unblockedTasks).toContain("ch-dep1");
		});

		it("emits 'tasksUnblocked' event with taskIds array", async () => {
			// Arrange
			const params = createParams();
			const unblockSpy = vi.fn();
			eventEmitter.on("tasksUnblocked", unblockSpy);
			vi.mocked(deps.dependencyResolver.getDependents).mockResolvedValue([
				"ch-dep1",
			]);
			vi.mocked(deps.dependencyResolver.check).mockResolvedValue({
				satisfied: true,
				pending: [],
				inProgress: [],
				failed: [],
			});

			// Act
			await handler.handleAgentExit(params);

			// Assert
			expect(unblockSpy).toHaveBeenCalledWith({
				taskIds: ["ch-dep1"],
			});
		});

		it("handles no dependents gracefully (empty array)", async () => {
			// Arrange
			const params = createParams();
			vi.mocked(deps.dependencyResolver.getDependents).mockResolvedValue([]);

			// Act
			const result = await handler.handleAgentExit(params);

			// Assert
			expect(result.success).toBe(true);
			expect(result.unblockedTasks).toEqual([]);
		});

		it("skips dependent if other deps still open", async () => {
			// Arrange
			const params = createParams();
			vi.mocked(deps.dependencyResolver.getDependents).mockResolvedValue([
				"ch-dep1",
			]);
			vi.mocked(deps.dependencyResolver.check).mockResolvedValue({
				satisfied: false,
				pending: ["ch-other"],
				inProgress: [],
				failed: [],
			});

			// Act
			const result = await handler.handleAgentExit(params);

			// Assert
			expect(result.unblockedTasks).toEqual([]);
		});
	});

	// F16b: No Signal Path - 3 tests
	describe("handleAgentExit() - No Signal Path", () => {
		it("returns action='retry' when no completion signal and iteration < max", async () => {
			// Arrange
			vi.mocked(deps.completionChecker.check).mockResolvedValue({
				complete: false,
				hasSignal: false,
			});
			const params = createParams({ iteration: 1 });

			// Act
			const result = await handler.handleAgentExit(params);

			// Assert
			expect(result.action).toBe("retry");
			expect(result.success).toBe(false);
		});

		it("returns action='retry' when tests fail (even with signal) and iteration < max", async () => {
			// Arrange
			vi.mocked(deps.completionChecker.check).mockResolvedValue({
				complete: false,
				hasSignal: true,
				testsPassed: false,
			});
			const params = createParams({ iteration: 1 });

			// Act
			const result = await handler.handleAgentExit(params);

			// Assert
			expect(result.action).toBe("retry");
		});

		it("returns action='failed' when no signal and iteration >= max", async () => {
			// Arrange
			vi.mocked(deps.completionChecker.check).mockResolvedValue({
				complete: false,
				hasSignal: false,
			});
			const params = createParams({ iteration: 50 }); // maxIterations = 50

			// Act
			const result = await handler.handleAgentExit(params);

			// Assert
			expect(result.action).toBe("failed");
			expect(result.reason).toBe("max_iterations");
		});
	});

	// F16b: Blocked Path - 2 tests
	describe("handleAgentExit() - Blocked Path", () => {
		it("returns action='blocked' with reason when BLOCKED signal detected", async () => {
			// Arrange
			vi.mocked(deps.signalParser.isBlocked).mockReturnValue(true);
			vi.mocked(deps.signalParser.getReason).mockReturnValue(
				"API not available",
			);
			const params = createParams({
				output: "<chorus>BLOCKED:API not available</chorus>",
			});

			// Act
			const result = await handler.handleAgentExit(params);

			// Assert
			expect(result.action).toBe("blocked");
			expect(result.reason).toBe("API not available");
		});

		it("handles BLOCKED signal without reason", async () => {
			// Arrange
			vi.mocked(deps.signalParser.isBlocked).mockReturnValue(true);
			vi.mocked(deps.signalParser.getReason).mockReturnValue(null);
			const params = createParams({ output: "<chorus>BLOCKED</chorus>" });

			// Act
			const result = await handler.handleAgentExit(params);

			// Assert
			expect(result.action).toBe("blocked");
			expect(result.reason).toBeUndefined();
		});
	});

	// F16b: Needs Help Path - 3 tests
	describe("handleAgentExit() - Needs Help Path", () => {
		it("returns action='needs_help' with question when NEEDS_HELP signal detected", async () => {
			// Arrange
			vi.mocked(deps.signalParser.hasSignal).mockImplementation(
				(_output, type) => type === "NEEDS_HELP",
			);
			vi.mocked(deps.signalParser.getReason).mockReturnValue(
				"What API key should I use?",
			);
			const params = createParams();

			// Act
			const result = await handler.handleAgentExit(params);

			// Assert
			expect(result.action).toBe("needs_help");
			expect(result.question).toBe("What API key should I use?");
		});

		it("returns action='needs_help' when NEEDS_HUMAN signal detected", async () => {
			// Arrange
			vi.mocked(deps.signalParser.hasSignal).mockImplementation(
				(_output, type) => type === "NEEDS_HUMAN",
			);
			vi.mocked(deps.signalParser.getReason).mockReturnValue("Need approval");
			const params = createParams();

			// Act
			const result = await handler.handleAgentExit(params);

			// Assert
			expect(result.action).toBe("needs_help");
		});

		it("handles NEEDS_HELP signal without question", async () => {
			// Arrange
			vi.mocked(deps.signalParser.hasSignal).mockImplementation(
				(_output, type) => type === "NEEDS_HELP",
			);
			vi.mocked(deps.signalParser.getReason).mockReturnValue(null);
			const params = createParams();

			// Act
			const result = await handler.handleAgentExit(params);

			// Assert
			expect(result.action).toBe("needs_help");
			expect(result.question).toBeUndefined();
		});
	});

	// F16b: Crash Path - 2 tests
	describe("handleAgentExit() - Crash Path", () => {
		it("returns action='failed' with reason='crash' on non-zero exit code", async () => {
			// Arrange
			const params = createParams({ exitCode: 1 });

			// Act
			const result = await handler.handleAgentExit(params);

			// Assert
			expect(result.action).toBe("failed");
			expect(result.reason).toBe("crash");
		});

		it("emits 'failed' event on crash", async () => {
			// Arrange
			const params = createParams({ exitCode: 1 });
			const failedSpy = vi.fn();
			eventEmitter.on("failed", failedSpy);

			// Act
			await handler.handleAgentExit(params);

			// Assert
			expect(failedSpy).toHaveBeenCalledWith({
				taskId: "ch-123",
				reason: "crash",
			});
		});
	});

	// F16b: Timeout Path - 2 tests
	describe("handleTimeout()", () => {
		it("returns action='timeout'", async () => {
			// Arrange
			const params = createParams();

			// Act
			const result = await handler.handleTimeout(params);

			// Assert
			expect(result.action).toBe("timeout");
			expect(result.success).toBe(false);
		});

		it("returns correct taskId and agentId", async () => {
			// Arrange
			const params = createParams();

			// Act
			const result = await handler.handleTimeout(params);

			// Assert
			expect(result.taskId).toBe("ch-123");
			expect(result.agentId).toBe("claude-ch-123");
		});
	});

	// F16b: handleRetry() - 4 tests
	describe("handleRetry()", () => {
		it("emits 'retry' event with { taskId, iteration }", async () => {
			// Arrange
			const params = createParams({ iteration: 3 });
			const retrySpy = vi.fn();
			eventEmitter.on("retry", retrySpy);

			// Act
			await handler.handleRetry(params);

			// Assert
			expect(retrySpy).toHaveBeenCalledWith({
				taskId: "ch-123",
				iteration: 4, // incremented
			});
		});

		it("increments iteration count in result", async () => {
			// Arrange
			const params = createParams({ iteration: 5 });

			// Act
			const result = await handler.handleRetry(params);

			// Assert
			expect(result.iteration).toBe(6);
		});

		it("returns action='retry'", async () => {
			// Arrange
			const params = createParams();

			// Act
			const result = await handler.handleRetry(params);

			// Assert
			expect(result.action).toBe("retry");
			expect(result.success).toBe(false);
		});

		it("respects config.maxIterations by returning retry below limit", async () => {
			// Arrange
			vi.mocked(deps.completionChecker.check).mockResolvedValue({
				complete: false,
				hasSignal: false,
			});
			const params = createParams({ iteration: 49 }); // maxIterations = 50

			// Act
			const result = await handler.handleAgentExit(params);

			// Assert - should retry, not fail
			expect(result.action).toBe("retry");
		});
	});

	// F16b: handleMaxReached() - 2 tests
	describe("handleMaxReached()", () => {
		it("returns action='failed' with reason='max_iterations'", async () => {
			// Arrange
			const params = createParams({ iteration: 50 });

			// Act
			const result = await handler.handleMaxReached(params);

			// Assert
			expect(result.action).toBe("failed");
			expect(result.reason).toBe("max_iterations");
		});

		it("emits 'failed' event with taskId and iteration count", async () => {
			// Arrange
			const params = createParams({ iteration: 50 });
			const failedSpy = vi.fn();
			eventEmitter.on("failed", failedSpy);

			// Act
			await handler.handleMaxReached(params);

			// Assert
			expect(failedSpy).toHaveBeenCalledWith({
				taskId: "ch-123",
				iteration: 50,
				reason: "max_iterations",
			});
		});
	});
});
