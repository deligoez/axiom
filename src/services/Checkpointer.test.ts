import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CheckpointConfig } from "../types/rollback.js";
import { Checkpointer, type GitRunner } from "./Checkpointer.js";

describe("Checkpointer", () => {
	let checkpointer: Checkpointer;
	let mockGitRunner: GitRunner;
	let mockRun: ReturnType<typeof vi.fn>;

	const defaultConfig: CheckpointConfig = {
		enabled: true,
		beforeAutopilot: true,
		beforeMerge: true,
		periodic: 5,
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-11T12:00:00Z"));

		mockRun = vi.fn();
		mockGitRunner = { run: mockRun as GitRunner["run"] };
		checkpointer = new Checkpointer(defaultConfig, mockGitRunner);
	});

	describe("create", () => {
		it("creates tag chorus-checkpoint-{timestamp} for autopilot_start", async () => {
			// Arrange
			mockRun.mockResolvedValue({ success: true, output: "" });

			// Act
			const checkpoint = await checkpointer.create("autopilot_start");

			// Assert
			expect(checkpoint.tag).toMatch(/^chorus-checkpoint-\d+$/);
			expect(mockRun).toHaveBeenCalledWith(expect.stringContaining("git tag"));
		});

		it("creates tag chorus-checkpoint-{timestamp} for periodic", async () => {
			// Arrange
			mockRun.mockResolvedValue({ success: true, output: "" });

			// Act
			const checkpoint = await checkpointer.create("periodic");

			// Assert
			expect(checkpoint.tag).toMatch(/^chorus-checkpoint-\d+$/);
			expect(checkpoint.type).toBe("periodic");
		});

		it("creates tag pre-merge-{task-id} for pre_merge", async () => {
			// Arrange
			mockRun.mockResolvedValue({ success: true, output: "" });

			// Act
			const checkpoint = await checkpointer.create("pre_merge", "ch-abc");

			// Assert
			expect(checkpoint.tag).toBe("pre-merge-ch-abc");
			expect(checkpoint.taskId).toBe("ch-abc");
		});

		it("stores checkpoint metadata", async () => {
			// Arrange
			mockRun.mockResolvedValue({ success: true, output: "" });

			// Act
			await checkpointer.create("autopilot_start");

			// Assert
			const checkpoints = await checkpointer.list();
			expect(checkpoints).toHaveLength(1);
			expect(checkpoints[0].type).toBe("autopilot_start");
		});

		it("throws error if tag already exists", async () => {
			// Arrange
			mockRun.mockResolvedValueOnce({ success: true, output: "" });
			mockRun.mockResolvedValueOnce({
				success: false,
				output: "tag already exists",
			});

			// Act
			await checkpointer.create("autopilot_start");

			// Assert
			await expect(checkpointer.create("autopilot_start")).rejects.toThrow(
				"already exists",
			);
		});
	});

	describe("restore", () => {
		it("runs git reset --hard {tag}", async () => {
			// Arrange
			mockRun
				.mockResolvedValueOnce({ success: true, output: "" }) // create
				.mockResolvedValueOnce({ success: true, output: "" }) // log
				.mockResolvedValueOnce({ success: true, output: "" }); // reset
			await checkpointer.create("autopilot_start");

			// Act
			await checkpointer.restore("chorus-checkpoint-1736596800");

			// Assert
			expect(mockRun).toHaveBeenCalledWith(
				expect.stringMatching(/git reset --hard chorus-checkpoint-\d+/),
			);
		});

		it("returns affected task IDs from commits after checkpoint", async () => {
			// Arrange
			const gitLogOutput = `abc123 feat: task A [ch-001]
def456 feat: task B [ch-002]`;
			mockRun
				.mockResolvedValueOnce({ success: true, output: "" }) // create
				.mockResolvedValueOnce({ success: true, output: gitLogOutput }) // log
				.mockResolvedValueOnce({ success: true, output: "" }); // reset
			await checkpointer.create("autopilot_start");

			// Act
			const affectedIds = await checkpointer.restore(
				"chorus-checkpoint-1736596800",
			);

			// Assert
			expect(affectedIds).toContain("ch-001");
			expect(affectedIds).toContain("ch-002");
		});
	});

	describe("list", () => {
		it("returns all checkpoints from git tags", async () => {
			// Arrange
			mockRun
				.mockResolvedValueOnce({ success: true, output: "" })
				.mockResolvedValueOnce({ success: true, output: "" });
			await checkpointer.create("autopilot_start");
			await checkpointer.create("periodic");

			// Act
			const checkpoints = await checkpointer.list();

			// Assert
			expect(checkpoints).toHaveLength(2);
		});
	});

	describe("prune", () => {
		it("deletes oldest checkpoints, keeps last N", async () => {
			// Arrange
			mockRun.mockResolvedValue({ success: true, output: "" });
			vi.setSystemTime(new Date("2026-01-11T12:00:00Z"));
			await checkpointer.create("periodic");
			vi.setSystemTime(new Date("2026-01-11T12:01:00Z"));
			await checkpointer.create("periodic");
			vi.setSystemTime(new Date("2026-01-11T12:02:00Z"));
			await checkpointer.create("periodic");

			// Act
			const deleted = await checkpointer.prune(1);

			// Assert
			expect(deleted).toBe(2); // Deleted 2, kept 1
			const remaining = await checkpointer.list();
			expect(remaining).toHaveLength(1);
		});
	});

	describe("shouldCreate", () => {
		it("returns false when enabled=false (master switch)", () => {
			// Arrange
			const disabledConfig: CheckpointConfig = {
				...defaultConfig,
				enabled: false,
			};
			const cp = new Checkpointer(disabledConfig, mockGitRunner);

			// Act & Assert
			expect(cp.shouldCreate("autopilot_start")).toBe(false);
			expect(cp.shouldCreate("pre_merge")).toBe(false);
			expect(cp.shouldCreate("periodic")).toBe(false);
		});

		it("respects beforeAutopilot config for autopilot_start", () => {
			// Arrange
			const config1: CheckpointConfig = {
				...defaultConfig,
				beforeAutopilot: true,
			};
			const config2: CheckpointConfig = {
				...defaultConfig,
				beforeAutopilot: false,
			};
			const cp1 = new Checkpointer(config1, mockGitRunner);
			const cp2 = new Checkpointer(config2, mockGitRunner);

			// Act & Assert
			expect(cp1.shouldCreate("autopilot_start")).toBe(true);
			expect(cp2.shouldCreate("autopilot_start")).toBe(false);
		});

		it("respects beforeMerge config for pre_merge", () => {
			// Arrange
			const config1: CheckpointConfig = { ...defaultConfig, beforeMerge: true };
			const config2: CheckpointConfig = {
				...defaultConfig,
				beforeMerge: false,
			};
			const cp1 = new Checkpointer(config1, mockGitRunner);
			const cp2 = new Checkpointer(config2, mockGitRunner);

			// Act & Assert
			expect(cp1.shouldCreate("pre_merge")).toBe(true);
			expect(cp2.shouldCreate("pre_merge")).toBe(false);
		});

		it("returns true only when periodic > 0 for periodic type", () => {
			// Arrange
			const config1: CheckpointConfig = { ...defaultConfig, periodic: 5 };
			const config2: CheckpointConfig = { ...defaultConfig, periodic: 0 };
			const cp1 = new Checkpointer(config1, mockGitRunner);
			const cp2 = new Checkpointer(config2, mockGitRunner);

			// Act & Assert
			expect(cp1.shouldCreate("periodic")).toBe(true);
			expect(cp2.shouldCreate("periodic")).toBe(false);
		});
	});
});
