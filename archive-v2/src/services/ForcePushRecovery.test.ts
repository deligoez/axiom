import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ForcePushGitService } from "./ForcePushRecovery.js";
import { ForcePushRecovery } from "./ForcePushRecovery.js";
import type { RebaseResult, RebaseRetry } from "./RebaseRetry.js";

describe("ForcePushRecovery", () => {
	let recovery: ForcePushRecovery;
	let mockGit: {
		getRef: ReturnType<typeof vi.fn>;
		fetch: ReturnType<typeof vi.fn>;
	};
	let mockRebaseRetry: {
		rebase: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		mockGit = {
			getRef: vi.fn(),
			fetch: vi.fn(),
		};
		mockRebaseRetry = {
			rebase: vi.fn(),
		};
		recovery = new ForcePushRecovery({
			git: mockGit as unknown as ForcePushGitService,
			rebaseRetry: mockRebaseRetry as unknown as RebaseRetry,
		});
	});

	// F25b: detectForcePush() - 3 tests
	describe("detectForcePush()", () => {
		it("returns true when main ref changed after fetch", async () => {
			// Arrange
			const beforeRef = "abc123";
			mockGit.fetch.mockResolvedValue(undefined);
			mockGit.getRef.mockResolvedValue("def456"); // Different ref

			// Act
			const result = await recovery.detectForcePush(beforeRef);

			// Assert
			expect(result).toBe(true);
			expect(mockGit.fetch).toHaveBeenCalledWith("origin", "main");
			expect(mockGit.getRef).toHaveBeenCalledWith("refs/heads/main");
		});

		it("returns false when main ref unchanged", async () => {
			// Arrange
			const beforeRef = "abc123";
			mockGit.fetch.mockResolvedValue(undefined);
			mockGit.getRef.mockResolvedValue("abc123"); // Same ref

			// Act
			const result = await recovery.detectForcePush(beforeRef);

			// Assert
			expect(result).toBe(false);
		});

		it("returns false on fetch error (conservative)", async () => {
			// Arrange
			const beforeRef = "abc123";
			mockGit.fetch.mockRejectedValue(new Error("Network error"));

			// Act
			const result = await recovery.detectForcePush(beforeRef);

			// Assert
			expect(result).toBe(false);
		});
	});

	// F25b: recover() - 5 tests
	describe("recover()", () => {
		it("fetches latest main via git.fetch('origin', 'main')", async () => {
			// Arrange
			mockGit.fetch.mockResolvedValue(undefined);
			mockRebaseRetry.rebase.mockResolvedValue({
				success: true,
				rebased: true,
			} as RebaseResult);

			// Act
			await recovery.recover("task-1", "feature-branch");

			// Assert
			expect(mockGit.fetch).toHaveBeenCalledWith("origin", "main");
		});

		it("rebases branch onto new main via rebaseRetry.rebase()", async () => {
			// Arrange
			mockGit.fetch.mockResolvedValue(undefined);
			mockRebaseRetry.rebase.mockResolvedValue({
				success: true,
				rebased: true,
			} as RebaseResult);

			// Act
			await recovery.recover("task-1", "feature-branch");

			// Assert
			expect(mockRebaseRetry.rebase).toHaveBeenCalledWith("main");
		});

		it("returns { success: true, recovered: true } on successful rebase", async () => {
			// Arrange
			mockGit.fetch.mockResolvedValue(undefined);
			mockRebaseRetry.rebase.mockResolvedValue({
				success: true,
				rebased: true,
			} as RebaseResult);

			// Act
			const result = await recovery.recover("task-1", "feature-branch");

			// Assert
			expect(result.success).toBe(true);
			expect(result.recovered).toBe(true);
		});

		it("increments recoveryCount for taskId", async () => {
			// Arrange
			mockGit.fetch.mockResolvedValue(undefined);
			mockRebaseRetry.rebase.mockResolvedValue({
				success: true,
				rebased: true,
			} as RebaseResult);

			// Act - recover twice
			await recovery.recover("task-1", "feature-branch");
			await recovery.recover("task-1", "feature-branch");

			// Assert
			expect(recovery.getRecoveryCount("task-1")).toBe(2);
		});

		it("returns { needsPause: true } after 2 recoveries for same task", async () => {
			// Arrange
			mockGit.fetch.mockResolvedValue(undefined);
			mockRebaseRetry.rebase.mockResolvedValue({
				success: true,
				rebased: true,
			} as RebaseResult);

			// Act - recover twice
			await recovery.recover("task-1", "feature-branch");
			const result = await recovery.recover("task-1", "feature-branch");

			// Assert
			expect(result.needsPause).toBe(true);
		});
	});

	// F25b: getRecoveryCount() / resetRecoveryCount() - 2 tests
	describe("getRecoveryCount() / resetRecoveryCount()", () => {
		it("getRecoveryCount() returns current count (0 if never recovered)", () => {
			// Arrange - no recovery yet

			// Act
			const count = recovery.getRecoveryCount("task-1");

			// Assert
			expect(count).toBe(0);
		});

		it("resetRecoveryCount() clears count to 0", async () => {
			// Arrange - perform a recovery first
			mockGit.fetch.mockResolvedValue(undefined);
			mockRebaseRetry.rebase.mockResolvedValue({
				success: true,
				rebased: true,
			} as RebaseResult);
			await recovery.recover("task-1", "feature-branch");
			expect(recovery.getRecoveryCount("task-1")).toBe(1);

			// Act
			recovery.resetRecoveryCount("task-1");

			// Assert
			expect(recovery.getRecoveryCount("task-1")).toBe(0);
		});
	});
});
