/**
 * Git E2E test fixtures for Chorus
 *
 * Provides helpers to create real temporary git repositories for integration testing.
 */

import { execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface GitTestRepo {
	path: string;
	cleanup: () => void;
}

/**
 * Creates a temporary git repository with an initial commit.
 *
 * @returns GitTestRepo with path and cleanup function
 */
export function createGitRepo(): GitTestRepo {
	const repoPath = join(
		tmpdir(),
		`chorus-git-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
	);

	// Create directory
	mkdirSync(repoPath, { recursive: true });

	// Initialize git repo
	execSync("git init", { cwd: repoPath, stdio: "pipe" });

	// Configure git user for commits (required for CI)
	execSync('git config user.email "test@chorus.dev"', {
		cwd: repoPath,
		stdio: "pipe",
	});
	execSync('git config user.name "Chorus Test"', {
		cwd: repoPath,
		stdio: "pipe",
	});

	// Create initial commit (required for worktrees)
	writeFileSync(join(repoPath, "README.md"), "# Test Repository\n");
	execSync("git add .", { cwd: repoPath, stdio: "pipe" });
	execSync('git commit -m "Initial commit"', { cwd: repoPath, stdio: "pipe" });

	// Rename default branch to 'main' for consistency
	execSync("git branch -M main", { cwd: repoPath, stdio: "pipe" });

	return {
		path: repoPath,
		cleanup: () => cleanupGitRepo(repoPath),
	};
}

/**
 * Creates a git repository with .chorus directory and TaskStore initialized.
 *
 * @returns GitTestRepo with chorus task storage
 */
export function createGitRepoWithTasks(): GitTestRepo {
	const repo = createGitRepo();

	// Create .chorus directory with empty tasks.jsonl
	const chorusDir = join(repo.path, ".chorus");
	mkdirSync(chorusDir, { recursive: true });
	writeFileSync(join(chorusDir, "tasks.jsonl"), "");

	// Commit chorus directory
	execSync("git add .", { cwd: repo.path, stdio: "pipe" });
	execSync('git commit -m "Add .chorus directory with TaskStore"', {
		cwd: repo.path,
		stdio: "pipe",
	});

	return repo;
}

/**
 * Creates a git repository with .chorus directory and templates initialized.
 *
 * @returns GitTestRepo with chorus config directory and templates
 */
export function createGitRepoWithChorus(): GitTestRepo {
	const repo = createGitRepoWithTasks();

	// Create .chorus directory structure
	const chorusDir = join(repo.path, ".chorus");
	const templatesDir = join(chorusDir, "templates");
	mkdirSync(templatesDir, { recursive: true });

	// Create scratchpad template
	writeFileSync(
		join(templatesDir, "scratchpad.md"),
		`# Task Scratchpad: {task_id}

## Notes

## Progress

## Blockers
`,
	);

	// Commit chorus directory
	execSync("git add .", { cwd: repo.path, stdio: "pipe" });
	execSync('git commit -m "Add .chorus directory"', {
		cwd: repo.path,
		stdio: "pipe",
	});

	return repo;
}

/**
 * Cleans up a git repository and all its worktrees.
 *
 * @param repoPath - Path to the repository
 */
export function cleanupGitRepo(repoPath: string): void {
	try {
		// First, remove all worktrees to avoid git lock issues
		try {
			execSync("git worktree prune", { cwd: repoPath, stdio: "pipe" });
		} catch {
			// Ignore prune errors
		}

		// Remove the directory
		rmSync(repoPath, { recursive: true, force: true });
	} catch {
		// Ignore cleanup errors
	}
}

/**
 * Creates a commit in the repository.
 *
 * @param repoPath - Path to the repository
 * @param message - Commit message
 * @param filename - Optional filename to create/modify
 */
export function createCommit(
	repoPath: string,
	message: string,
	filename = "file.txt",
): string {
	const filePath = join(repoPath, filename);
	writeFileSync(filePath, `${message}\n${Date.now()}\n`);
	execSync("git add .", { cwd: repoPath, stdio: "pipe" });
	execSync(`git commit -m "${message}"`, { cwd: repoPath, stdio: "pipe" });

	// Return the commit SHA
	const sha = execSync("git rev-parse HEAD", { cwd: repoPath, stdio: "pipe" })
		.toString()
		.trim();
	return sha;
}

/**
 * Checks if a branch exists in the repository.
 *
 * @param repoPath - Path to the repository
 * @param branchName - Name of the branch
 * @returns True if branch exists
 */
export function branchExists(repoPath: string, branchName: string): boolean {
	try {
		execSync(`git rev-parse --verify ${branchName}`, {
			cwd: repoPath,
			stdio: "pipe",
		});
		return true;
	} catch {
		return false;
	}
}

/**
 * Lists all worktrees in the repository.
 *
 * @param repoPath - Path to the repository
 * @returns Array of worktree paths
 */
export function listWorktrees(repoPath: string): string[] {
	const output = execSync("git worktree list --porcelain", {
		cwd: repoPath,
		stdio: "pipe",
	}).toString();

	const worktrees: string[] = [];
	for (const line of output.split("\n")) {
		if (line.startsWith("worktree ")) {
			worktrees.push(line.replace("worktree ", ""));
		}
	}
	return worktrees;
}

/**
 * Merges a branch into main.
 *
 * @param repoPath - Path to the repository
 * @param branchName - Name of the branch to merge
 */
export function mergeBranch(repoPath: string, branchName: string): void {
	execSync(`git merge ${branchName} --no-edit`, {
		cwd: repoPath,
		stdio: "pipe",
	});
}

/**
 * Creates a branch from the current HEAD.
 *
 * @param repoPath - Path to the repository
 * @param branchName - Name of the branch to create
 */
export function createBranch(repoPath: string, branchName: string): void {
	execSync(`git checkout -b ${branchName}`, { cwd: repoPath, stdio: "pipe" });
}

/**
 * Switches to a branch.
 *
 * @param repoPath - Path to the repository
 * @param branchName - Name of the branch to switch to
 */
export function checkoutBranch(repoPath: string, branchName: string): void {
	execSync(`git checkout ${branchName}`, { cwd: repoPath, stdio: "pipe" });
}

/**
 * Creates a scenario that will result in a merge conflict.
 *
 * @param repoPath - Path to the repository
 * @param featureBranch - Name of the feature branch
 * @returns Object with conflict file info
 */
export function setupMergeConflict(
	repoPath: string,
	featureBranch: string,
): { conflictFile: string } {
	const conflictFile = "conflict.txt";

	// Create file on main
	writeFileSync(join(repoPath, conflictFile), "Line 1: main version\n");
	execSync("git add .", { cwd: repoPath, stdio: "pipe" });
	execSync('git commit -m "Add conflict file on main"', {
		cwd: repoPath,
		stdio: "pipe",
	});

	// Create feature branch and modify the same line
	execSync(`git checkout -b ${featureBranch}`, {
		cwd: repoPath,
		stdio: "pipe",
	});
	writeFileSync(join(repoPath, conflictFile), "Line 1: feature version\n");
	execSync("git add .", { cwd: repoPath, stdio: "pipe" });
	execSync('git commit -m "Modify conflict file on feature"', {
		cwd: repoPath,
		stdio: "pipe",
	});

	// Go back to main and modify the same line differently
	execSync("git checkout main", { cwd: repoPath, stdio: "pipe" });
	writeFileSync(
		join(repoPath, conflictFile),
		"Line 1: main modified version\n",
	);
	execSync("git add .", { cwd: repoPath, stdio: "pipe" });
	execSync('git commit -m "Modify conflict file on main"', {
		cwd: repoPath,
		stdio: "pipe",
	});

	return { conflictFile };
}

/**
 * Aborts any in-progress merge.
 *
 * @param repoPath - Path to the repository
 */
export function abortMerge(repoPath: string): void {
	try {
		execSync("git merge --abort", { cwd: repoPath, stdio: "pipe" });
	} catch {
		// Ignore if no merge in progress
	}
}

/**
 * Aborts any in-progress rebase.
 *
 * @param repoPath - Path to the repository
 */
export function abortRebase(repoPath: string): void {
	try {
		execSync("git rebase --abort", { cwd: repoPath, stdio: "pipe" });
	} catch {
		// Ignore if no rebase in progress
	}
}

/**
 * Gets list of files with conflicts.
 *
 * @param repoPath - Path to the repository
 * @returns Array of conflict file paths
 */
export function getConflictFiles(repoPath: string): string[] {
	try {
		const output = execSync("git diff --name-only --diff-filter=U", {
			cwd: repoPath,
			stdio: "pipe",
		}).toString();
		return output
			.split("\n")
			.map((f) => f.trim())
			.filter(Boolean);
	} catch {
		return [];
	}
}

/**
 * Checks if repository is in merge conflict state.
 *
 * @param repoPath - Path to the repository
 * @returns True if in conflict state
 */
export function isInMergeConflict(repoPath: string): boolean {
	return getConflictFiles(repoPath).length > 0;
}
