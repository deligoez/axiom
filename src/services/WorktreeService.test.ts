import * as fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	GitError,
	WorktreeExistsError,
	WorktreeService,
} from "./WorktreeService.js";

// Mock fs
vi.mock("node:fs", () => ({
	existsSync: vi.fn(),
	mkdirSync: vi.fn(),
	readFileSync: vi.fn(),
	writeFileSync: vi.fn(),
}));

// Mock execa
vi.mock("execa", () => ({
	execa: vi.fn(),
	execaSync: vi.fn(),
}));

import { execa, execaSync } from "execa";

const mockExistsSync = vi.mocked(fs.existsSync);
const mockMkdirSync = vi.mocked(fs.mkdirSync);
const mockReadFileSync = vi.mocked(fs.readFileSync);
const mockWriteFileSync = vi.mocked(fs.writeFileSync);
const mockExeca = vi.mocked(execa);
const mockExecaSync = vi.mocked(execaSync);

describe("WorktreeService", () => {
	let service: WorktreeService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new WorktreeService("/test/project");
	});

	// create() tests (8)
	it("create() runs git worktree add command correctly", async () => {
		// Arrange
		mockExistsSync.mockReturnValue(false);
		mockExeca.mockResolvedValue({
			exitCode: 0,
			stdout: "",
			stderr: "",
		} as never);
		mockReadFileSync.mockReturnValue("# Scratchpad: {task_id}");

		// Act
		await service.create("claude", "ch-abc");

		// Assert
		expect(mockExeca).toHaveBeenCalledWith(
			"git",
			[
				"worktree",
				"add",
				"/test/project/.worktrees/claude-ch-abc",
				"-b",
				"agent/claude/ch-abc",
				"main",
			],
			{ cwd: "/test/project", reject: false },
		);
	});

	it("create() creates .worktrees/ directory if missing", async () => {
		// Arrange
		mockExistsSync.mockImplementation((p) => {
			const pathStr = String(p);
			// Worktree doesn't exist, but .worktrees doesn't exist either
			if (pathStr.includes(".worktrees/claude")) return false;
			if (pathStr.includes(".worktrees")) return false;
			return false;
		});
		mockExeca.mockResolvedValue({
			exitCode: 0,
			stdout: "",
			stderr: "",
		} as never);
		mockReadFileSync.mockReturnValue("template");

		// Act
		await service.create("claude", "ch-abc");

		// Assert
		expect(mockMkdirSync).toHaveBeenCalledWith("/test/project/.worktrees", {
			recursive: true,
		});
	});

	it("create() creates .agent/ directory in worktree", async () => {
		// Arrange
		mockExistsSync.mockReturnValue(false);
		mockExeca.mockResolvedValue({
			exitCode: 0,
			stdout: "",
			stderr: "",
		} as never);
		mockReadFileSync.mockReturnValue("template");

		// Act
		await service.create("claude", "ch-abc");

		// Assert
		expect(mockMkdirSync).toHaveBeenCalledWith(
			"/test/project/.worktrees/claude-ch-abc/.agent",
			{ recursive: true },
		);
	});

	it("create() copies template from .chorus/templates/scratchpad.md", async () => {
		// Arrange
		mockExistsSync.mockImplementation((p) => {
			const pathStr = String(p);
			if (pathStr.includes(".chorus/templates")) return true;
			return false;
		});
		mockExeca.mockResolvedValue({
			exitCode: 0,
			stdout: "",
			stderr: "",
		} as never);
		mockReadFileSync.mockReturnValue("Custom template: {task_id}");

		// Act
		await service.create("claude", "ch-abc");

		// Assert
		expect(mockReadFileSync).toHaveBeenCalledWith(
			"/test/project/.chorus/templates/scratchpad.md",
			"utf-8",
		);
	});

	it("create() substitutes {task_id} in template", async () => {
		// Arrange
		mockExistsSync.mockImplementation((p) => {
			const pathStr = String(p);
			if (pathStr.includes(".chorus/templates")) return true;
			return false;
		});
		mockExeca.mockResolvedValue({
			exitCode: 0,
			stdout: "",
			stderr: "",
		} as never);
		mockReadFileSync.mockReturnValue("Task: {task_id}\nID: {task_id}");

		// Act
		await service.create("claude", "ch-xyz");

		// Assert
		expect(mockWriteFileSync).toHaveBeenCalledWith(
			"/test/project/.worktrees/claude-ch-xyz/.agent/scratchpad.md",
			"Task: ch-xyz\nID: ch-xyz",
			"utf-8",
		);
	});

	it("create() returns correct WorktreeInfo", async () => {
		// Arrange
		mockExistsSync.mockReturnValue(false);
		mockExeca.mockResolvedValue({
			exitCode: 0,
			stdout: "",
			stderr: "",
		} as never);
		mockReadFileSync.mockReturnValue("template");

		// Act
		const result = await service.create("claude", "ch-abc");

		// Assert
		expect(result).toEqual({
			path: "/test/project/.worktrees/claude-ch-abc",
			branch: "agent/claude/ch-abc",
			agentType: "claude",
			taskId: "ch-abc",
		});
	});

	it("create() throws WorktreeExistsError if already exists", async () => {
		// Arrange
		mockExistsSync.mockReturnValue(true);

		// Act & Assert
		await expect(service.create("claude", "ch-abc")).rejects.toThrow(
			WorktreeExistsError,
		);
	});

	it("create() throws GitError on git command failure", async () => {
		// Arrange
		mockExistsSync.mockReturnValue(false);
		mockExeca.mockResolvedValue({
			exitCode: 1,
			stdout: "",
			stderr: "fatal: branch already exists",
		} as never);

		// Act & Assert
		await expect(service.create("claude", "ch-abc")).rejects.toThrow(GitError);
	});

	// Fallback template test (1)
	it("create() uses fallback template if .chorus/templates/scratchpad.md missing", async () => {
		// Arrange
		mockExistsSync.mockReturnValue(false);
		mockExeca.mockResolvedValue({
			exitCode: 0,
			stdout: "",
			stderr: "",
		} as never);

		// Act
		await service.create("claude", "ch-abc");

		// Assert
		expect(mockWriteFileSync).toHaveBeenCalledWith(
			expect.stringContaining("scratchpad.md"),
			expect.stringContaining("# Task Scratchpad: ch-abc"),
			"utf-8",
		);
	});

	// Query methods tests (4)
	it("exists() returns true for existing worktree", () => {
		// Arrange
		mockExistsSync.mockReturnValue(true);

		// Act
		const result = service.exists("claude", "ch-abc");

		// Assert
		expect(result).toBe(true);
		expect(mockExistsSync).toHaveBeenCalledWith(
			"/test/project/.worktrees/claude-ch-abc",
		);
	});

	it("exists() returns false for non-existent worktree", () => {
		// Arrange
		mockExistsSync.mockReturnValue(false);

		// Act
		const result = service.exists("claude", "ch-xyz");

		// Assert
		expect(result).toBe(false);
	});

	it("getPath() returns correct absolute path", () => {
		// Act
		const result = service.getPath("claude", "ch-abc");

		// Assert
		expect(result).toBe("/test/project/.worktrees/claude-ch-abc");
	});

	it("getBranch() returns correct branch name", () => {
		// Act
		const result = service.getBranch("claude", "ch-abc");

		// Assert
		expect(result).toBe("agent/claude/ch-abc");
	});

	// list() test (1)
	it("list() parses git worktree list output correctly", () => {
		// Arrange
		const porcelainOutput = `worktree /test/project
HEAD abc123def456
branch refs/heads/main

worktree /test/project/.worktrees/claude-ch-a1b2
HEAD def456789abc
branch refs/heads/agent/claude/ch-a1b2

worktree /test/project/.worktrees/aider-ch-x1y2
HEAD 789abcdef012
branch refs/heads/agent/aider/ch-x1y2
`;
		mockExecaSync.mockReturnValue({
			exitCode: 0,
			stdout: porcelainOutput,
			stderr: "",
		} as never);

		// Act
		const result = service.list();

		// Assert
		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({
			path: "/test/project/.worktrees/claude-ch-a1b2",
			branch: "agent/claude/ch-a1b2",
			agentType: "claude",
			taskId: "ch-a1b2",
		});
		expect(result[1]).toEqual({
			path: "/test/project/.worktrees/aider-ch-x1y2",
			branch: "agent/aider/ch-x1y2",
			agentType: "aider",
			taskId: "ch-x1y2",
		});
	});
});
