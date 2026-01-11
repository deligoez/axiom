import * as fs from "node:fs";
import * as path from "node:path";
import { execa, execaSync } from "execa";

export interface WorktreeInfo {
	path: string;
	branch: string;
	agentType: string;
	taskId: string;
}

export class WorktreeExistsError extends Error {
	constructor(agentType: string, taskId: string) {
		super(`Worktree already exists for ${agentType}-${taskId}`);
		this.name = "WorktreeExistsError";
	}
}

export class GitError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "GitError";
	}
}

export class WorktreeNotFoundError extends Error {
	constructor(agentType: string, taskId: string) {
		super(`Worktree not found for ${agentType}-${taskId}`);
		this.name = "WorktreeNotFoundError";
	}
}

export class BranchNotFoundError extends Error {
	constructor(branch: string) {
		super(`Branch not found: ${branch}`);
		this.name = "BranchNotFoundError";
	}
}

const DEFAULT_TEMPLATE = `# Task Scratchpad: {task_id}

## Notes

## Learnings

## Blockers
`;

export class WorktreeService {
	private projectDir: string;

	constructor(projectDir: string) {
		this.projectDir = projectDir;
	}

	async create(agentType: string, taskId: string): Promise<WorktreeInfo> {
		const worktreeName = `${agentType}-${taskId}`;
		const worktreePath = path.join(this.projectDir, ".worktrees", worktreeName);
		const branch = `agent/${agentType}/${taskId}`;

		// Check if worktree already exists
		if (this.exists(agentType, taskId)) {
			throw new WorktreeExistsError(agentType, taskId);
		}

		// Create .worktrees/ directory if it doesn't exist
		const worktreesDir = path.join(this.projectDir, ".worktrees");
		if (!fs.existsSync(worktreesDir)) {
			fs.mkdirSync(worktreesDir, { recursive: true });
		}

		// Run git worktree add
		const result = await execa(
			"git",
			["worktree", "add", worktreePath, "-b", branch, "main"],
			{
				cwd: this.projectDir,
				reject: false,
			},
		);

		if (result.exitCode !== 0) {
			throw new GitError(
				result.stderr || result.stdout || "git worktree failed",
			);
		}

		// Create .agent/ directory in worktree
		const agentDir = path.join(worktreePath, ".agent");
		fs.mkdirSync(agentDir, { recursive: true });

		// Copy scratchpad template
		const template = this.loadTemplate();
		const scratchpadContent = this.applyTemplateSubstitutions(template, taskId);
		const scratchpadPath = path.join(agentDir, "scratchpad.md");
		fs.writeFileSync(scratchpadPath, scratchpadContent, "utf-8");

		return {
			path: worktreePath,
			branch,
			agentType,
			taskId,
		};
	}

	exists(agentType: string, taskId: string): boolean {
		const worktreePath = this.getPath(agentType, taskId);
		return fs.existsSync(worktreePath);
	}

	getPath(agentType: string, taskId: string): string {
		const worktreeName = `${agentType}-${taskId}`;
		return path.join(this.projectDir, ".worktrees", worktreeName);
	}

	getBranch(agentType: string, taskId: string): string {
		return `agent/${agentType}/${taskId}`;
	}

	list(): WorktreeInfo[] {
		try {
			const result = execaSync("git", ["worktree", "list", "--porcelain"], {
				cwd: this.projectDir,
				reject: false,
			});

			if (result.exitCode !== 0) {
				return [];
			}

			return this.parseWorktreeList(result.stdout);
		} catch {
			return [];
		}
	}

	async remove(
		agentType: string,
		taskId: string,
		options?: { deleteBranch?: boolean; force?: boolean },
	): Promise<void> {
		const worktreePath = this.getPath(agentType, taskId);
		const branch = this.getBranch(agentType, taskId);
		const deleteBranch = options?.deleteBranch ?? true;
		const force = options?.force ?? false;

		// Check worktree exists
		if (!this.exists(agentType, taskId)) {
			throw new WorktreeNotFoundError(agentType, taskId);
		}

		// Remove worktree
		const args = ["worktree", "remove"];
		if (force) {
			args.push("--force");
		}
		args.push(worktreePath);

		await execa("git", args, {
			cwd: this.projectDir,
			reject: false,
		});

		// Handle branch deletion if requested
		if (deleteBranch) {
			const isMerged = await this.isBranchMerged(branch);
			if (isMerged) {
				await execa("git", ["branch", "-d", branch], {
					cwd: this.projectDir,
					reject: false,
				});
			}
		}
	}

	async isBranchMerged(branch: string): Promise<boolean> {
		const result = await execa("git", ["branch", "--merged", "main"], {
			cwd: this.projectDir,
			reject: false,
		});

		if (result.exitCode !== 0) {
			throw new BranchNotFoundError(branch);
		}

		// Parse output: each line has optional whitespace + branch name
		const mergedBranches = result.stdout
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 0);

		return mergedBranches.includes(branch);
	}

	async prune(): Promise<void> {
		await execa("git", ["worktree", "prune"], {
			cwd: this.projectDir,
			reject: false,
		});
	}

	private loadTemplate(): string {
		const templatePath = path.join(
			this.projectDir,
			".chorus",
			"templates",
			"scratchpad.md",
		);
		if (fs.existsSync(templatePath)) {
			return fs.readFileSync(templatePath, "utf-8");
		}
		return DEFAULT_TEMPLATE;
	}

	private applyTemplateSubstitutions(template: string, taskId: string): string {
		return template.replace(/{task_id}/g, taskId);
	}

	private parseWorktreeList(output: string): WorktreeInfo[] {
		const worktrees: WorktreeInfo[] = [];
		const blocks = output.split("\n\n").filter((block) => block.trim());

		for (const block of blocks) {
			const lines = block.split("\n");
			let worktreePath = "";
			let branch = "";

			for (const line of lines) {
				if (line.startsWith("worktree ")) {
					worktreePath = line.substring(9);
				} else if (line.startsWith("branch ")) {
					branch = line.substring(7).replace("refs/heads/", "");
				}
			}

			// Parse agent type and task ID from branch name (agent/{type}/{taskId})
			const branchMatch = branch.match(/^agent\/([^/]+)\/(.+)$/);
			if (branchMatch && worktreePath) {
				worktrees.push({
					path: worktreePath,
					branch,
					agentType: branchMatch[1],
					taskId: branchMatch[2],
				});
			}
		}

		return worktrees;
	}
}
