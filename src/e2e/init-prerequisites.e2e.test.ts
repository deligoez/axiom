import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { InitPrerequisites } from "../services/InitPrerequisites.js";
import { RealProcessRunner } from "../services/ProcessRunner.js";
import { createGitRepo, type GitTestRepo } from "../test-utils/git-fixtures.js";

describe("E2E: InitPrerequisites", () => {
	let repo: GitTestRepo;
	let prereqs: InitPrerequisites;

	afterEach(() => {
		if (repo) {
			repo.cleanup();
		}
	});

	describe("checkGitRepo()", () => {
		it("returns true for git repository", () => {
			// Arrange
			repo = createGitRepo();
			prereqs = new InitPrerequisites(repo.path, new RealProcessRunner());

			// Act
			const result = prereqs.checkGitRepo();

			// Assert
			expect(result).toBe(true);
		});

		it("returns false for non-git directory", () => {
			// Arrange - use temp dir without .git
			const os = require("node:os");
			const path = require("node:path");
			const fs = require("node:fs");
			const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "non-git-"));
			prereqs = new InitPrerequisites(tempDir, new RealProcessRunner());

			try {
				// Act
				const result = prereqs.checkGitRepo();

				// Assert
				expect(result).toBe(false);
			} finally {
				fs.rmSync(tempDir, { recursive: true, force: true });
			}
		});
	});

	describe("checkNodeVersion()", () => {
		beforeEach(() => {
			repo = createGitRepo();
			prereqs = new InitPrerequisites(repo.path, new RealProcessRunner());
		});

		it("returns valid: true for current Node.js (>= 20)", async () => {
			// Act
			const result = await prereqs.checkNodeVersion();

			// Assert - assuming test environment has Node 20+
			expect(result.valid).toBe(true);
			expect(result.version).toBeTruthy();
		});

		it("returns version string", async () => {
			// Act
			const result = await prereqs.checkNodeVersion();

			// Assert
			expect(result.version).toMatch(/^\d+\.\d+\.\d+$/);
		});
	});

	describe("checkAll()", () => {
		it("returns all passed for valid git repo", async () => {
			// Arrange
			repo = createGitRepo();
			prereqs = new InitPrerequisites(repo.path, new RealProcessRunner());

			// Act
			const result = await prereqs.checkAll();

			// Assert
			expect(result.gitRepo).toBe(true);
			expect(result.nodeVersion).toBe(true);
			// claudeCLI might not be installed
		});

		it("returns nodeVersionFound with version string", async () => {
			// Arrange
			repo = createGitRepo();
			prereqs = new InitPrerequisites(repo.path, new RealProcessRunner());

			// Act
			const result = await prereqs.checkAll();

			// Assert
			expect(result.nodeVersionFound).toBeTruthy();
			expect(result.nodeVersionFound).toMatch(/^\d+\.\d+\.\d+$/);
		});
	});
});
