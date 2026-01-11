import * as fs from "node:fs";
import * as path from "node:path";
import { execa, execaSync } from "execa";
import type { AgentType } from "../types/config.js";

export interface Task {
	id: string;
	title: string;
	description?: string;
	priority: number;
	status: string;
	labels: string[];
	dependencies: string[];
	custom?: {
		model?: string;
		agent?: string;
		acceptance_criteria?: string[];
	};
}

export interface GetReadyOptions {
	excludeLabels?: string[];
	includeLabels?: string[];
}

export interface TaskOptions {
	priority?: 1 | 2 | 3 | 4;
	labels?: string[];
	depends?: string[];
	model?: string;
	agent?: AgentType;
	acceptanceCriteria?: string[];
}

export class BeadsCLI {
	private projectDir: string;

	constructor(projectDir: string) {
		this.projectDir = projectDir;
	}

	private async runBd(
		args: string[],
	): Promise<{ stdout: string; stderr: string }> {
		const result = await execa("bd", args, {
			cwd: this.projectDir,
			reject: false,
		});

		if (result.exitCode !== 0) {
			throw new Error(result.stderr || result.stdout || "bd command failed");
		}

		return { stdout: result.stdout, stderr: result.stderr };
	}

	async claimTask(id: string, assignee: string): Promise<void> {
		await this.runBd([
			"update",
			id,
			"--status=in_progress",
			`--assignee=${assignee}`,
		]);
	}

	async releaseTask(id: string): Promise<void> {
		await this.runBd(["update", id, "--status=open", "--assignee="]);
	}

	async getTask(id: string): Promise<Task | null> {
		try {
			const { stdout } = await this.runBd(["show", id, "--json"]);
			const data = JSON.parse(stdout);
			return this.parseTask(data);
		} catch {
			return null;
		}
	}

	async getReadyTasks(options: GetReadyOptions = {}): Promise<Task[]> {
		try {
			const { stdout } = await this.runBd(["ready", "-n", "0", "--json"]);
			let tasks = this.parseTaskList(stdout);

			// Step 2: Apply excludeLabels (remove tasks with any excluded label)
			if (options.excludeLabels && options.excludeLabels.length > 0) {
				tasks = tasks.filter(
					(task) =>
						!task.labels.some((label) =>
							options.excludeLabels?.includes(label),
						),
				);
			}

			// Step 3: Apply includeLabels (keep only tasks with any included label)
			if (options.includeLabels && options.includeLabels.length > 0) {
				tasks = tasks.filter((task) =>
					task.labels.some((label) => options.includeLabels?.includes(label)),
				);
			}

			return tasks;
		} catch {
			return [];
		}
	}

	async createTask(title: string, options: TaskOptions = {}): Promise<string> {
		const args = ["create", title];

		if (options.priority) {
			args.push("-p", String(options.priority));
		}

		if (options.labels && options.labels.length > 0) {
			for (const label of options.labels) {
				args.push("-l", label);
			}
		}

		if (options.depends && options.depends.length > 0) {
			args.push("--deps", options.depends.join(","));
		}

		if (options.model) {
			args.push("--custom", `model=${options.model}`);
		}

		if (options.agent) {
			args.push("--custom", `agent=${options.agent}`);
		}

		if (options.acceptanceCriteria && options.acceptanceCriteria.length > 0) {
			args.push(
				"--custom",
				`acceptance_criteria=${options.acceptanceCriteria.join(",")}`,
			);
		}

		const { stdout } = await this.runBd(args);
		// Extract task ID from output (e.g., "Created ch-xyz: Title")
		const match = stdout.match(/(?:Created\s+)?(ch-[a-z0-9]+)/i);
		if (!match) {
			throw new Error("Failed to parse created task ID");
		}
		return match[1];
	}

	async closeTask(id: string, comment?: string): Promise<void> {
		const args = ["close", id];
		if (comment) {
			args.push("--comment", comment);
		}
		await this.runBd(args);
	}

	async reopenTask(id: string): Promise<void> {
		await this.runBd(["update", id, "--status=open"]);
	}

	async getTaskStatus(id: string): Promise<string | null> {
		const task = await this.getTask(id);
		return task?.status ?? null;
	}

	async getInProgressTasks(): Promise<Task[]> {
		try {
			const { stdout } = await this.runBd([
				"list",
				"--status=in_progress",
				"-n",
				"0",
				"--json",
			]);
			return this.parseTaskList(stdout);
		} catch {
			return [];
		}
	}

	async getClosedTasks(): Promise<Task[]> {
		try {
			const { stdout } = await this.runBd([
				"list",
				"--status=closed",
				"-n",
				"0",
				"--json",
			]);
			return this.parseTaskList(stdout);
		} catch {
			return [];
		}
	}

	isAvailable(): boolean {
		try {
			const result = execaSync("which", ["bd"], { reject: false });
			return result.exitCode === 0;
		} catch {
			return false;
		}
	}

	isInitialized(): boolean {
		const beadsDir = path.join(this.projectDir, ".beads");
		return fs.existsSync(beadsDir);
	}

	private parseTask(data: Record<string, unknown>): Task {
		return {
			id: String(data.id || ""),
			title: String(data.title || ""),
			description: data.description ? String(data.description) : undefined,
			priority: Number(data.priority) || 4,
			status: String(data.status || "open"),
			labels: Array.isArray(data.labels) ? data.labels : [],
			dependencies: Array.isArray(data.dependencies) ? data.dependencies : [],
			custom: data.custom as Task["custom"],
		};
	}

	private parseTaskList(stdout: string): Task[] {
		try {
			const data = JSON.parse(stdout);
			if (Array.isArray(data)) {
				return data.map((item) => this.parseTask(item));
			}
			return [];
		} catch {
			return [];
		}
	}
}
