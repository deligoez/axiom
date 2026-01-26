import * as fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	BranchNotFoundError,
	GitError,
	WorktreeExistsError,
	WorktreeNotFoundError,
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

	// F05: Worktree Remove Tests (10)

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

	// F05: remove() tests (6)
	it("remove() runs git worktree remove command", async () => {
		// Arrange
		mockExistsSync.mockReturnValue(true);
		mockExeca.mockResolvedValue({
			exitCode: 0,
			stdout: "",
			stderr: "",
		} as never);

		// Act
		await service.remove("claude", "ch-abc", { deleteBranch: false });

		// Assert
		expect(mockExeca).toHaveBeenCalledWith(
			"git",
			["worktree", "remove", "/test/project/.worktrees/claude-ch-abc"],
			{ cwd: "/test/project", reject: false },
		);
	});

	it("remove() throws WorktreeNotFoundError if worktree doesn't exist", async () => {
		// Arrange
		mockExistsSync.mockReturnValue(false);

		// Act & Assert
		await expect(
			service.remove("claude", "ch-abc", { deleteBranch: false }),
		).rejects.toThrow(WorktreeNotFoundError);
	});

	it("remove() deletes branch when merged and deleteBranch: true (default)", async () => {
		// Arrange
		mockExistsSync.mockReturnValue(true);
		mockExeca
			.mockResolvedValueOnce({
				exitCode: 0,
				stdout: "",
				stderr: "",
			} as never) // git worktree remove
			.mockResolvedValueOnce({
				exitCode: 0,
				stdout: "  main\n  agent/claude/ch-abc\n",
				stderr: "",
			} as never) // git branch --merged
			.mockResolvedValueOnce({
				exitCode: 0,
				stdout: "",
				stderr: "",
			} as never); // git branch -d

		// Act
		await service.remove("claude", "ch-abc");

		// Assert
		expect(mockExeca).toHaveBeenCalledWith(
			"git",
			["branch", "-d", "agent/claude/ch-abc"],
			{ cwd: "/test/project", reject: false },
		);
	});

	it("remove() keeps branch when not merged (no error)", async () => {
		// Arrange
		mockExistsSync.mockReturnValue(true);
		mockExeca
			.mockResolvedValueOnce({
				exitCode: 0,
				stdout: "",
				stderr: "",
			} as never) // git worktree remove
			.mockResolvedValueOnce({
				exitCode: 0,
				stdout: "  main\n",
				stderr: "",
			} as never); // git branch --merged (branch NOT included)

		// Act
		await service.remove("claude", "ch-abc");

		// Assert - branch -d should NOT be called
		const branchDeleteCall = (mockExeca.mock.calls as unknown[][]).find(
			(call) => {
				const args = call[1] as string[];
				return args[0] === "branch" && args[1] === "-d";
			},
		);
		expect(branchDeleteCall).toBeUndefined();
	});

	it("remove() with force: true uses --force flag", async () => {
		// Arrange
		mockExistsSync.mockReturnValue(true);
		mockExeca.mockResolvedValue({
			exitCode: 0,
			stdout: "",
			stderr: "",
		} as never);

		// Act
		await service.remove("claude", "ch-abc", {
			force: true,
			deleteBranch: false,
		});

		// Assert
		expect(mockExeca).toHaveBeenCalledWith(
			"git",
			[
				"worktree",
				"remove",
				"--force",
				"/test/project/.worktrees/claude-ch-abc",
			],
			{ cwd: "/test/project", reject: false },
		);
	});

	it("remove() with deleteBranch: false keeps branch even if merged", async () => {
		// Arrange
		mockExistsSync.mockReturnValue(true);
		mockExeca.mockResolvedValue({
			exitCode: 0,
			stdout: "",
			stderr: "",
		} as never);

		// Act
		await service.remove("claude", "ch-abc", { deleteBranch: false });

		// Assert - branch --merged should NOT be called
		const branchMergedCall = (mockExeca.mock.calls as unknown[][]).find(
			(call) => {
				const args = call[1] as string[];
				return args[0] === "branch" && args[1] === "--merged";
			},
		);
		expect(branchMergedCall).toBeUndefined();
	});

	// F05: isBranchMerged() tests (2)
	it("isBranchMerged() returns true for merged branch", async () => {
		// Arrange
		mockExeca.mockResolvedValue({
			exitCode: 0,
			stdout: "  main\n  agent/claude/ch-abc\n  feature/other\n",
			stderr: "",
		} as never);

		// Act
		const result = await service.isBranchMerged("agent/claude/ch-abc");

		// Assert
		expect(result).toBe(true);
		expect(mockExeca).toHaveBeenCalledWith(
			"git",
			["branch", "--merged", "main"],
			{ cwd: "/test/project", reject: false },
		);
	});

	it("isBranchMerged() returns false for unmerged branch", async () => {
		// Arrange
		mockExeca.mockResolvedValue({
			exitCode: 0,
			stdout: "  main\n  feature/other\n",
			stderr: "",
		} as never);

		// Act
		const result = await service.isBranchMerged("agent/claude/ch-abc");

		// Assert
		expect(result).toBe(false);
	});

	// F05: prune() test (1)
	it("prune() runs git worktree prune", async () => {
		// Arrange
		mockExeca.mockResolvedValue({
			exitCode: 0,
			stdout: "",
			stderr: "",
		} as never);

		// Act
		await service.prune();

		// Assert
		expect(mockExeca).toHaveBeenCalledWith("git", ["worktree", "prune"], {
			cwd: "/test/project",
			reject: false,
		});
	});

	// F05: Edge case (1)
	it("remove() throws BranchNotFoundError if branch already deleted", async () => {
		// Arrange
		mockExistsSync.mockReturnValue(true);
		mockExeca
			.mockResolvedValueOnce({
				exitCode: 0,
				stdout: "",
				stderr: "",
			} as never) // git worktree remove succeeds
			.mockResolvedValueOnce({
				exitCode: 1,
				stdout: "",
				stderr: "error: malformed object name agent/claude/ch-abc",
			} as never); // git branch --merged fails

		// Act & Assert
		await expect(service.remove("claude", "ch-abc")).rejects.toThrow(
			BranchNotFoundError,
		);
	});

	// F06: getInfo() tests (4)
	it("getInfo() returns complete WorktreeInfo with headSha", async () => {
		// Arrange
		mockExistsSync.mockReturnValue(true);
		mockExeca.mockResolvedValue({
			exitCode: 0,
			stdout: "abc123def456\n",
			stderr: "",
		} as never);

		// Act
		const info = await service.getInfo("claude", "ch-abc");

		// Assert
		expect(info).toEqual({
			path: "/test/project/.worktrees/claude-ch-abc",
			branch: "agent/claude/ch-abc",
			agentType: "claude",
			taskId: "ch-abc",
			headSha: "abc123def456",
		});
	});

	it("getInfo() retrieves headSha via git rev-parse", async () => {
		// Arrange
		mockExistsSync.mockReturnValue(true);
		mockExeca.mockResolvedValue({
			exitCode: 0,
			stdout: "deadbeef123\n",
			stderr: "",
		} as never);

		// Act
		await service.getInfo("claude", "ch-xyz");

		// Assert
		expect(mockExeca).toHaveBeenCalledWith(
			"git",
			["-C", "/test/project/.worktrees/claude-ch-xyz", "rev-parse", "HEAD"],
			{ cwd: "/test/project", reject: false },
		);
	});

	it("getInfo() throws WorktreeNotFoundError for non-existent worktree", async () => {
		// Arrange
		mockExistsSync.mockReturnValue(false);

		// Act & Assert
		await expect(service.getInfo("claude", "ch-abc")).rejects.toThrow(
			WorktreeNotFoundError,
		);
	});

	it("getInfo() correctly parses agentType and taskId", async () => {
		// Arrange
		mockExistsSync.mockReturnValue(true);
		mockExeca.mockResolvedValue({
			exitCode: 0,
			stdout: "sha123\n",
			stderr: "",
		} as never);

		// Act
		const info = await service.getInfo("codex", "ch-task123");

		// Assert
		expect(info.agentType).toBe("codex");
		expect(info.taskId).toBe("ch-task123");
	});

	// F06: removeAll() tests (3)
	it("removeAll() removes all agent worktrees", async () => {
		// Arrange
		mockExecaSync.mockReturnValue({
			exitCode: 0,
			stdout: `worktree /test/project
HEAD abc123
branch refs/heads/main

worktree /test/project/.worktrees/claude-ch-a1b2
HEAD def456
branch refs/heads/agent/claude/ch-a1b2

worktree /test/project/.worktrees/aider-ch-x1y2
HEAD 789abc
branch refs/heads/agent/aider/ch-x1y2
`,
			stderr: "",
		} as never);

		// For each remove() call
		mockExistsSync.mockReturnValue(true);
		mockExeca.mockResolvedValue({
			exitCode: 0,
			stdout: "",
			stderr: "",
		} as never);

		// Act
		await service.removeAll();

		// Assert - should call remove for each agent worktree (not main)
		const worktreeRemoveCalls = (mockExeca.mock.calls as unknown[][]).filter(
			(call) => {
				const args = call[1] as string[];
				return args[0] === "worktree" && args[1] === "remove";
			},
		);
		expect(worktreeRemoveCalls.length).toBeGreaterThanOrEqual(2);
	});

	it("removeAll() skips non-agent worktrees (main, manual)", async () => {
		// Arrange
		mockExecaSync.mockReturnValue({
			exitCode: 0,
			stdout: `worktree /test/project
HEAD abc123
branch refs/heads/main

worktree /test/project/.worktrees/manual-test
HEAD def456
branch refs/heads/feature/manual
`,
			stderr: "",
		} as never);

		// Act
		await service.removeAll();

		// Assert - no remove calls should be made (no agent worktrees)
		const worktreeRemoveCalls = (mockExeca.mock.calls as unknown[][]).filter(
			(call) => {
				const args = call[1] as string[];
				return args[0] === "worktree" && args[1] === "remove";
			},
		);
		expect(worktreeRemoveCalls).toHaveLength(0);
	});

	it("removeAll() with force: true passes force to remove()", async () => {
		// Arrange
		mockExecaSync.mockReturnValue({
			exitCode: 0,
			stdout: `worktree /test/project/.worktrees/claude-ch-a1b2
HEAD def456
branch refs/heads/agent/claude/ch-a1b2
`,
			stderr: "",
		} as never);

		mockExistsSync.mockReturnValue(true);
		mockExeca.mockResolvedValue({
			exitCode: 0,
			stdout: "",
			stderr: "",
		} as never);

		// Act
		await service.removeAll({ force: true });

		// Assert - should have --force flag
		expect(mockExeca).toHaveBeenCalledWith(
			"git",
			[
				"worktree",
				"remove",
				"--force",
				"/test/project/.worktrees/claude-ch-a1b2",
			],
			{ cwd: "/test/project", reject: false },
		);
	});

	// F06: Edge case (1)
	it("removeAll() completes successfully with empty worktree list", async () => {
		// Arrange
		mockExecaSync.mockReturnValue({
			exitCode: 0,
			stdout: `worktree /test/project
HEAD abc123
branch refs/heads/main
`,
			stderr: "",
		} as never);

		// Act & Assert - should not throw
		await expect(service.removeAll()).resolves.toBeUndefined();
	});
});
