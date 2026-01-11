import { beforeEach, describe, expect, it, vi } from "vitest";
import { RebaseRetry, type RebaseRetryDeps } from "./RebaseRetry.js";

describe("RebaseRetry", () => {
	let rebaseRetry: RebaseRetry;
	let mockDeps: RebaseRetryDeps;

	beforeEach(() => {
		mockDeps = {
			exec: vi.fn(),
			fileExists: vi.fn(),
		};
		rebaseRetry = new RebaseRetry(mockDeps);
	});

	// F28: rebase() - 3 tests
	describe("rebase()", () => {
		it("returns { success: true, rebased: true } when git rebase main exits 0", async () => {
			// Arrange
			vi.mocked(mockDeps.exec).mockResolvedValueOnce({
				exitCode: 0,
				stdout: "",
				stderr: "",
			});

			// Act
			const result = await rebaseRetry.rebase("main");

			// Assert
			expect(result.success).toBe(true);
			expect(result.rebased).toBe(true);
		});

		it("returns { success: false, hadConflicts: true } when exit code != 0 AND .git/rebase-merge/ exists", async () => {
			// Arrange
			vi.mocked(mockDeps.exec).mockResolvedValueOnce({
				exitCode: 1,
				stdout: "",
				stderr: "CONFLICT",
			});
			vi.mocked(mockDeps.fileExists).mockResolvedValueOnce(true);

			// Act
			const result = await rebaseRetry.rebase("main");

			// Assert
			expect(result.success).toBe(false);
			expect(result.hadConflicts).toBe(true);
		});

		it("returns { success: false, hadConflicts: false, error: string } on other git errors", async () => {
			// Arrange
			vi.mocked(mockDeps.exec).mockResolvedValueOnce({
				exitCode: 128,
				stdout: "",
				stderr: "fatal: not a git repository",
			});
			vi.mocked(mockDeps.fileExists).mockResolvedValueOnce(false);

			// Act
			const result = await rebaseRetry.rebase("main");

			// Assert
			expect(result.success).toBe(false);
			expect(result.hadConflicts).toBe(false);
			expect(result.error).toContain("fatal: not a git repository");
		});
	});

	// F28: rebaseAndRetry() - 2 tests
	describe("rebaseAndRetry()", () => {
		it("calls rebase(), if success returns { ready: true } for merge retry", async () => {
			// Arrange
			vi.mocked(mockDeps.exec).mockResolvedValueOnce({
				exitCode: 0,
				stdout: "",
				stderr: "",
			});

			// Act
			const result = await rebaseRetry.rebaseAndRetry("main");

			// Assert
			expect(result.ready).toBe(true);
		});

		it("calls rebase(), if conflicts calls abortRebase() and returns { ready: false, aborted: true }", async () => {
			// Arrange
			// First call: rebase fails with conflict
			vi.mocked(mockDeps.exec).mockResolvedValueOnce({
				exitCode: 1,
				stdout: "",
				stderr: "CONFLICT",
			});
			vi.mocked(mockDeps.fileExists).mockResolvedValueOnce(true);
			// Second call: abort succeeds
			vi.mocked(mockDeps.exec).mockResolvedValueOnce({
				exitCode: 0,
				stdout: "",
				stderr: "",
			});

			// Act
			const result = await rebaseRetry.rebaseAndRetry("main");

			// Assert
			expect(result.ready).toBe(false);
			expect(result.aborted).toBe(true);
		});
	});

	// F28: abortRebase() - 1 test
	describe("abortRebase()", () => {
		it("runs git rebase --abort via deps.exec() and returns success", async () => {
			// Arrange
			vi.mocked(mockDeps.exec).mockResolvedValueOnce({
				exitCode: 0,
				stdout: "",
				stderr: "",
			});

			// Act
			const result = await rebaseRetry.abortRebase();

			// Assert
			expect(result.success).toBe(true);
			expect(mockDeps.exec).toHaveBeenCalledWith("git rebase --abort");
		});
	});
});
