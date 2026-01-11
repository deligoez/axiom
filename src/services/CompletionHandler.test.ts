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
			eventEmitter,
		};

		handler = new CompletionHandler(deps);
	});

	// handleAgentExit() - 5 tests
	describe("handleAgentExit()", () => {
		it("returns success when signal + tests pass", async () => {
			// Arrange
			const output = "<chorus>COMPLETE</chorus>";

			// Act
			const result = await handler.handleAgentExit({
				taskId: "ch-123",
				agentId: "claude-ch-123",
				output,
				worktreePath: "/worktrees/claude-ch-123",
				branch: "agent/claude/ch-123",
				agentType: "claude",
			});

			// Assert
			expect(result.success).toBe(true);
		});

		it("closes task via beadsCLI.closeTask()", async () => {
			// Arrange
			const output = "<chorus>COMPLETE</chorus>";

			// Act
			await handler.handleAgentExit({
				taskId: "ch-123",
				agentId: "claude-ch-123",
				output,
				worktreePath: "/worktrees/claude-ch-123",
				branch: "agent/claude/ch-123",
				agentType: "claude",
			});

			// Assert
			expect(deps.beadsCLI.closeTask).toHaveBeenCalledWith(
				"ch-123",
				expect.any(String),
			);
		});

		it("emits 'completed' event with taskId, agentId", async () => {
			// Arrange
			const output = "<chorus>COMPLETE</chorus>";
			const completedSpy = vi.fn();
			eventEmitter.on("completed", completedSpy);

			// Act
			await handler.handleAgentExit({
				taskId: "ch-123",
				agentId: "claude-ch-123",
				output,
				worktreePath: "/worktrees/claude-ch-123",
				branch: "agent/claude/ch-123",
				agentType: "claude",
			});

			// Assert
			expect(completedSpy).toHaveBeenCalledWith({
				taskId: "ch-123",
				agentId: "claude-ch-123",
			});
		});

		it("emits 'readyForMerge' event with taskId, branch, worktreePath", async () => {
			// Arrange
			const output = "<chorus>COMPLETE</chorus>";
			const mergeSpy = vi.fn();
			eventEmitter.on("readyForMerge", mergeSpy);

			// Act
			await handler.handleAgentExit({
				taskId: "ch-123",
				agentId: "claude-ch-123",
				output,
				worktreePath: "/worktrees/claude-ch-123",
				branch: "agent/claude/ch-123",
				agentType: "claude",
			});

			// Assert
			expect(mergeSpy).toHaveBeenCalledWith({
				taskId: "ch-123",
				branch: "agent/claude/ch-123",
				worktreePath: "/worktrees/claude-ch-123",
			});
		});

		it("returns TaskCompletionResult with success=true", async () => {
			// Arrange
			const output = "<chorus>COMPLETE</chorus>";

			// Act
			const result = await handler.handleAgentExit({
				taskId: "ch-123",
				agentId: "claude-ch-123",
				output,
				worktreePath: "/worktrees/claude-ch-123",
				branch: "agent/claude/ch-123",
				agentType: "claude",
			});

			// Assert
			expect(result).toEqual(
				expect.objectContaining({
					taskId: "ch-123",
					agentId: "claude-ch-123",
					success: true,
				}),
			);
		});
	});

	// handleSuccess() - Learning Extraction - 6 tests
	describe("handleSuccess() - Learning Extraction", () => {
		it("reads scratchpad from agent's worktree via ScratchpadManager.read()", async () => {
			// Arrange
			const output = "<chorus>COMPLETE</chorus>";

			// Act
			await handler.handleAgentExit({
				taskId: "ch-123",
				agentId: "claude-ch-123",
				output,
				worktreePath: "/worktrees/claude-ch-123",
				branch: "agent/claude/ch-123",
				agentType: "claude",
			});

			// Assert
			expect(deps.scratchpadManager.read).toHaveBeenCalled();
		});

		it("extracts learnings if learningsSection present via LearningExtractor.parse()", async () => {
			// Arrange
			const output = "<chorus>COMPLETE</chorus>";
			const scratchpadContent = "## Learnings\n- [LOCAL] Something learned";
			vi.mocked(deps.scratchpadManager.read).mockResolvedValue({
				content: scratchpadContent,
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
			await handler.handleAgentExit({
				taskId: "ch-123",
				agentId: "claude-ch-123",
				output,
				worktreePath: "/worktrees/claude-ch-123",
				branch: "agent/claude/ch-123",
				agentType: "claude",
			});

			// Assert
			expect(deps.learningExtractor.parse).toHaveBeenCalledWith(
				"- [LOCAL] Something learned",
				"ch-123",
				"claude",
			);
		});

		it("skips extraction gracefully when no learnings section", async () => {
			// Arrange
			const output = "<chorus>COMPLETE</chorus>";
			vi.mocked(deps.scratchpadManager.read).mockResolvedValue({
				content: "## Notes\nSome notes",
				path: "/worktrees/claude-ch-123/.agent/scratchpad.md",
				modifiedAt: new Date(),
			});
			vi.mocked(deps.scratchpadManager.extractLearningsSection).mockReturnValue(
				null,
			);

			// Act
			const result = await handler.handleAgentExit({
				taskId: "ch-123",
				agentId: "claude-ch-123",
				output,
				worktreePath: "/worktrees/claude-ch-123",
				branch: "agent/claude/ch-123",
				agentType: "claude",
			});

			// Assert
			expect(result.success).toBe(true);
			expect(deps.learningExtractor.parse).not.toHaveBeenCalled();
		});

		it("appends learnings to shared store via LearningStore.append()", async () => {
			// Arrange
			const output = "<chorus>COMPLETE</chorus>";
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
			await handler.handleAgentExit({
				taskId: "ch-123",
				agentId: "claude-ch-123",
				output,
				worktreePath: "/worktrees/claude-ch-123",
				branch: "agent/claude/ch-123",
				agentType: "claude",
			});

			// Assert
			expect(deps.learningStore.append).toHaveBeenCalledWith(learnings);
		});

		it("commits learnings with attribution via LearningStore.commit()", async () => {
			// Arrange
			const output = "<chorus>COMPLETE</chorus>";
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
			await handler.handleAgentExit({
				taskId: "ch-123",
				agentId: "claude-ch-123",
				output,
				worktreePath: "/worktrees/claude-ch-123",
				branch: "agent/claude/ch-123",
				agentType: "claude",
			});

			// Assert
			expect(deps.learningStore.commit).toHaveBeenCalledWith(
				"ch-123",
				"claude",
			);
		});

		it("clears scratchpad after successful extraction via ScratchpadManager.clear()", async () => {
			// Arrange
			const output = "<chorus>COMPLETE</chorus>";
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
			await handler.handleAgentExit({
				taskId: "ch-123",
				agentId: "claude-ch-123",
				output,
				worktreePath: "/worktrees/claude-ch-123",
				branch: "agent/claude/ch-123",
				agentType: "claude",
			});

			// Assert
			expect(deps.scratchpadManager.clear).toHaveBeenCalled();
		});
	});

	// handleSuccess() - CASCADE Unblock - 6 tests
	describe("handleSuccess() - CASCADE Unblock", () => {
		it("gets dependent tasks via dependencyResolver.getDependents()", async () => {
			// Arrange
			const output = "<chorus>COMPLETE</chorus>";

			// Act
			await handler.handleAgentExit({
				taskId: "ch-123",
				agentId: "claude-ch-123",
				output,
				worktreePath: "/worktrees/claude-ch-123",
				branch: "agent/claude/ch-123",
				agentType: "claude",
			});

			// Assert
			expect(deps.dependencyResolver.getDependents).toHaveBeenCalledWith(
				"ch-123",
			);
		});

		it("checks each dependent's full dependency satisfaction", async () => {
			// Arrange
			const output = "<chorus>COMPLETE</chorus>";
			vi.mocked(deps.dependencyResolver.getDependents).mockResolvedValue([
				"ch-dep1",
				"ch-dep2",
			]);

			// Act
			await handler.handleAgentExit({
				taskId: "ch-123",
				agentId: "claude-ch-123",
				output,
				worktreePath: "/worktrees/claude-ch-123",
				branch: "agent/claude/ch-123",
				agentType: "claude",
			});

			// Assert
			expect(deps.dependencyResolver.check).toHaveBeenCalledWith("ch-dep1");
			expect(deps.dependencyResolver.check).toHaveBeenCalledWith("ch-dep2");
		});

		it("returns unblockedTasks in result", async () => {
			// Arrange
			const output = "<chorus>COMPLETE</chorus>";
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
			const result = await handler.handleAgentExit({
				taskId: "ch-123",
				agentId: "claude-ch-123",
				output,
				worktreePath: "/worktrees/claude-ch-123",
				branch: "agent/claude/ch-123",
				agentType: "claude",
			});

			// Assert
			expect(result.unblockedTasks).toContain("ch-dep1");
		});

		it("emits 'tasksUnblocked' event with taskIds array", async () => {
			// Arrange
			const output = "<chorus>COMPLETE</chorus>";
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
			await handler.handleAgentExit({
				taskId: "ch-123",
				agentId: "claude-ch-123",
				output,
				worktreePath: "/worktrees/claude-ch-123",
				branch: "agent/claude/ch-123",
				agentType: "claude",
			});

			// Assert
			expect(unblockSpy).toHaveBeenCalledWith({
				taskIds: ["ch-dep1"],
			});
		});

		it("handles no dependents gracefully (empty array)", async () => {
			// Arrange
			const output = "<chorus>COMPLETE</chorus>";
			vi.mocked(deps.dependencyResolver.getDependents).mockResolvedValue([]);

			// Act
			const result = await handler.handleAgentExit({
				taskId: "ch-123",
				agentId: "claude-ch-123",
				output,
				worktreePath: "/worktrees/claude-ch-123",
				branch: "agent/claude/ch-123",
				agentType: "claude",
			});

			// Assert
			expect(result.success).toBe(true);
			expect(result.unblockedTasks).toEqual([]);
		});

		it("skips dependent if other deps still open", async () => {
			// Arrange
			const output = "<chorus>COMPLETE</chorus>";
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
			const result = await handler.handleAgentExit({
				taskId: "ch-123",
				agentId: "claude-ch-123",
				output,
				worktreePath: "/worktrees/claude-ch-123",
				branch: "agent/claude/ch-123",
				agentType: "claude",
			});

			// Assert
			expect(result.unblockedTasks).toEqual([]);
		});
	});
});
