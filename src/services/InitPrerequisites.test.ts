import * as fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InitPrerequisites } from "./InitPrerequisites.js";
import type { ProcessRunner } from "./ProcessRunner.js";

// Mock fs
vi.mock("node:fs", () => ({
	existsSync: vi.fn(),
}));

const mockExistsSync = vi.mocked(fs.existsSync);

// Mock ProcessRunner
const createMockProcessRunner = (): ProcessRunner => ({
	exec: vi.fn(),
});

describe("InitPrerequisites", () => {
	let service: InitPrerequisites;
	let mockProcessRunner: ProcessRunner;

	beforeEach(() => {
		vi.clearAllMocks();
		mockProcessRunner = createMockProcessRunner();
		service = new InitPrerequisites("/test/project", mockProcessRunner);
	});

	// checkGitRepo() - 2 tests
	describe("checkGitRepo", () => {
		it("returns true if current directory is a git repository", () => {
			// Arrange
			mockExistsSync.mockReturnValue(true);

			// Act
			const result = service.checkGitRepo();

			// Assert
			expect(result).toBe(true);
			expect(mockExistsSync).toHaveBeenCalledWith("/test/project/.git");
		});

		it("returns false if .git/ directory does not exist", () => {
			// Arrange
			mockExistsSync.mockReturnValue(false);

			// Act
			const result = service.checkGitRepo();

			// Assert
			expect(result).toBe(false);
		});
	});

	// checkNodeVersion() - 3 tests
	describe("checkNodeVersion", () => {
		it("returns valid: true when Node.js >= 20", async () => {
			// Arrange
			vi.mocked(mockProcessRunner.exec).mockResolvedValue({
				stdout: "v22.1.0\n",
				stderr: "",
				exitCode: 0,
			});

			// Act
			const result = await service.checkNodeVersion();

			// Assert
			expect(result).toEqual({ valid: true, version: "22.1.0" });
		});

		it("returns valid: false when Node.js < 20", async () => {
			// Arrange
			vi.mocked(mockProcessRunner.exec).mockResolvedValue({
				stdout: "v18.0.0\n",
				stderr: "",
				exitCode: 0,
			});

			// Act
			const result = await service.checkNodeVersion();

			// Assert
			expect(result).toEqual({ valid: false, version: "18.0.0" });
		});

		it("returns version: null when Node.js not installed", async () => {
			// Arrange
			vi.mocked(mockProcessRunner.exec).mockResolvedValue({
				stdout: "",
				stderr: "node: command not found",
				exitCode: 1,
			});

			// Act
			const result = await service.checkNodeVersion();

			// Assert
			expect(result).toEqual({ valid: false, version: null });
		});
	});

	// checkClaudeCLI() - 2 tests
	describe("checkClaudeCLI", () => {
		it("returns true if claude --version exits with code 0", async () => {
			// Arrange
			vi.mocked(mockProcessRunner.exec).mockResolvedValue({
				stdout: "claude version 1.0.0\n",
				stderr: "",
				exitCode: 0,
			});

			// Act
			const result = await service.checkClaudeCLI();

			// Assert
			expect(result).toBe(true);
			expect(mockProcessRunner.exec).toHaveBeenCalledWith("claude --version");
		});

		it("returns false if claude command not found", async () => {
			// Arrange
			vi.mocked(mockProcessRunner.exec).mockResolvedValue({
				stdout: "",
				stderr: "claude: command not found",
				exitCode: 127,
			});

			// Act
			const result = await service.checkClaudeCLI();

			// Assert
			expect(result).toBe(false);
		});
	});

	// checkAll() - 2 tests
	describe("checkAll", () => {
		it("returns PrerequisiteResult with all check results populated", async () => {
			// Arrange
			mockExistsSync.mockReturnValue(true); // git repo exists
			vi.mocked(mockProcessRunner.exec)
				.mockResolvedValueOnce({
					stdout: "v22.1.0\n",
					stderr: "",
					exitCode: 0,
				}) // node
				.mockResolvedValueOnce({
					stdout: "claude version 1.0.0\n",
					stderr: "",
					exitCode: 0,
				}); // claude

			// Act
			const result = await service.checkAll();

			// Assert
			expect(result).toEqual({
				gitRepo: true,
				nodeVersion: true,
				nodeVersionFound: "22.1.0",
				claudeCLI: true,
				missing: [],
				allPassed: true,
			});
		});

		it("returns missing array with install instructions for each failed check", async () => {
			// Arrange
			mockExistsSync.mockReturnValue(false); // git repo missing
			vi.mocked(mockProcessRunner.exec)
				.mockResolvedValueOnce({
					stdout: "v18.0.0\n",
					stderr: "",
					exitCode: 0,
				}) // node < 20
				.mockResolvedValueOnce({
					stdout: "",
					stderr: "claude: command not found",
					exitCode: 127,
				}); // claude missing

			// Act
			const result = await service.checkAll();

			// Assert
			expect(result.gitRepo).toBe(false);
			expect(result.nodeVersion).toBe(false);
			expect(result.nodeVersionFound).toBe("18.0.0");
			expect(result.claudeCLI).toBe(false);
			expect(result.allPassed).toBe(false);
			expect(result.missing).toHaveLength(3);
			expect(result.missing).toEqual([
				{
					name: "gitRepo",
					instruction: "Run `git init` to initialize a git repository",
				},
				{
					name: "nodeVersion",
					instruction: "Install Node.js 20+ from https://nodejs.org",
				},
				{
					name: "claudeCLI",
					instruction:
						"Install Claude Code: `npm install -g @anthropic-ai/claude-code`",
				},
			]);
		});
	});
});
