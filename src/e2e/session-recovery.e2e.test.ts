import { execSync, spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type BeadsCLIProvider,
	type CommandRunner,
	type MergeQueueProvider,
	SessionRecovery,
	type StateProvider,
} from "../services/SessionRecovery.js";
import type {
	AgentState,
	ChorusState,
	MergeQueueItem,
} from "../types/state.js";

describe("E2E: Session Recovery on Crash", () => {
	let tempDir: string;
	let stateFilePath: string;

	const createRealCommandRunner = (): CommandRunner => ({
		run: async (command: string, cwd?: string) => {
			const result = spawnSync("sh", ["-c", command], {
				cwd,
				encoding: "utf-8",
				stdio: ["pipe", "pipe", "pipe"],
			});
			if (result.status === 0) {
				return { success: true, output: result.stdout || "" };
			}
			throw new Error(result.stderr || `Exit code: ${result.status}`);
		},
	});

	const createMockState = (
		agents: Record<string, AgentState> = {},
		mergeQueue: MergeQueueItem[] = [],
	): ChorusState => ({
		version: "1.0",
		sessionId: "test-session",
		startedAt: Date.now(),
		mode: "semi-auto",
		paused: false,
		agents,
		mergeQueue,
		checkpoint: null,
		stats: {
			tasksCompleted: 0,
			tasksFailed: 0,
			mergesAuto: 0,
			mergesManual: 0,
			totalIterations: 0,
			totalRuntime: 0,
		},
	});

	const createMockAgent = (
		id: string,
		taskId: string,
		pid: number,
		worktree: string,
	): AgentState => ({
		id,
		type: "claude",
		pid,
		taskId,
		worktree,
		branch: `agent/claude/${taskId}`,
		iteration: 1,
		startedAt: Date.now(),
		status: "running",
	});

	beforeEach(() => {
		// Create a fresh temp directory
		tempDir = join(
			tmpdir(),
			`chorus-recovery-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		);
		mkdirSync(tempDir, { recursive: true });
		stateFilePath = join(tempDir, "state.json");

		// Initialize git repo for worktree operations
		execSync("git init", { cwd: tempDir });
		execSync('git config user.email "test@example.com"', { cwd: tempDir });
		execSync('git config user.name "Test User"', { cwd: tempDir });
		writeFileSync(join(tempDir, "README.md"), "# Test");
		execSync("git add .", { cwd: tempDir });
		execSync('git commit -m "Initial"', { cwd: tempDir });
	});

	afterEach(() => {
		try {
			rmSync(tempDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("Running Agents Detection", () => {
		it("detects running agents from saved state", async () => {
			// Arrange
			const worktreePath = join(tempDir, "worktrees", "agent-1");
			mkdirSync(worktreePath, { recursive: true });

			const agent = createMockAgent("agent-1", "ch-001", 99999, worktreePath);
			const state = createMockState({ "agent-1": agent });
			writeFileSync(stateFilePath, JSON.stringify(state));

			let loadedState: ChorusState | null = null;
			const stateProvider: StateProvider = {
				load: () => {
					const content = require("node:fs").readFileSync(
						stateFilePath,
						"utf-8",
					);
					loadedState = JSON.parse(content);
					return loadedState;
				},
				save: vi.fn(),
				getRunningAgents: () =>
					loadedState ? Object.values(loadedState.agents) : [],
				removeAgent: vi.fn(),
			};

			const recovery = new SessionRecovery(
				stateProvider,
				{ enqueue: vi.fn() },
				{ reopenTask: vi.fn() },
				{ remove: vi.fn() },
				createRealCommandRunner(),
			);

			// Act
			const needsRecovery = await recovery.needsRecovery();

			// Assert
			expect(needsRecovery).toBe(true);
		});

		it("returns false when no agents in state", async () => {
			// Arrange
			const state = createMockState({});
			writeFileSync(stateFilePath, JSON.stringify(state));

			const stateProvider: StateProvider = {
				load: () =>
					JSON.parse(require("node:fs").readFileSync(stateFilePath, "utf-8")),
				save: vi.fn(),
				getRunningAgents: () => [],
				removeAgent: vi.fn(),
			};

			const recovery = new SessionRecovery(
				stateProvider,
				{ enqueue: vi.fn() },
				{ reopenTask: vi.fn() },
				{ remove: vi.fn() },
				createRealCommandRunner(),
			);

			// Act
			const needsRecovery = await recovery.needsRecovery();

			// Assert
			expect(needsRecovery).toBe(false);
		});
	});

	describe("Process Termination", () => {
		it("verifies process existence using kill -0", async () => {
			// Arrange
			const recovery = new SessionRecovery(
				{
					load: vi.fn(),
					save: vi.fn(),
					getRunningAgents: vi.fn().mockReturnValue([]),
					removeAgent: vi.fn(),
				},
				{ enqueue: vi.fn() },
				{ reopenTask: vi.fn() },
				{ remove: vi.fn() },
				createRealCommandRunner(),
			);

			// Act - check if current process exists (should exist)
			const exists = await recovery.processExists(process.pid);

			// Assert
			expect(exists).toBe(true);
		});

		it("returns false for non-existent PID", async () => {
			// Arrange
			const recovery = new SessionRecovery(
				{
					load: vi.fn(),
					save: vi.fn(),
					getRunningAgents: vi.fn().mockReturnValue([]),
					removeAgent: vi.fn(),
				},
				{ enqueue: vi.fn() },
				{ reopenTask: vi.fn() },
				{ remove: vi.fn() },
				createRealCommandRunner(),
			);

			// Act - check non-existent PID
			const exists = await recovery.processExists(999999999);

			// Assert
			expect(exists).toBe(false);
		});
	});

	describe("Task Restoration", () => {
		it("returns tasks to pending status after recovery", async () => {
			// Arrange
			const worktreePath = join(tempDir, "worktrees", "agent-1");
			mkdirSync(worktreePath, { recursive: true });

			// Use non-existent PID so it won't try to kill
			const agent = createMockAgent(
				"agent-1",
				"ch-001",
				999999999,
				worktreePath,
			);
			const state = createMockState({ "agent-1": agent });
			writeFileSync(stateFilePath, JSON.stringify(state));

			let loadedState: ChorusState | null = null;
			const reopenedTasks: string[] = [];
			const removedAgents: string[] = [];

			const stateProvider: StateProvider = {
				load: () => {
					loadedState = JSON.parse(
						require("node:fs").readFileSync(stateFilePath, "utf-8"),
					);
					return loadedState;
				},
				save: vi.fn(),
				getRunningAgents: () =>
					loadedState ? Object.values(loadedState.agents) : [],
				removeAgent: (id) => {
					removedAgents.push(id);
				},
			};

			const beadsCLI: BeadsCLIProvider = {
				reopenTask: async (taskId) => {
					reopenedTasks.push(taskId);
				},
			};

			const recovery = new SessionRecovery(
				stateProvider,
				{ enqueue: vi.fn() },
				beadsCLI,
				{ remove: vi.fn() },
				createRealCommandRunner(),
			);

			// Act
			const result = await recovery.recover();

			// Assert
			expect(result.recovered).toBe(true);
			expect(reopenedTasks).toContain("ch-001");
			expect(removedAgents).toContain("agent-1");
		});
	});

	describe("Merge Queue Resumption", () => {
		it("resumes pending merge queue items", async () => {
			// Arrange
			const pendingItem: MergeQueueItem = {
				taskId: "ch-001",
				branch: "agent/claude/ch-001",
				worktree: "/worktrees/agent-1",
				priority: 1,
				status: "pending",
				retries: 0,
				enqueuedAt: Date.now(),
			};
			const state = createMockState({}, [pendingItem]);
			writeFileSync(stateFilePath, JSON.stringify(state));

			const enqueuedItems: MergeQueueItem[] = [];
			const mergeQueueProvider: MergeQueueProvider = {
				enqueue: (item) => {
					enqueuedItems.push(item);
				},
			};

			const stateProvider: StateProvider = {
				load: () =>
					JSON.parse(require("node:fs").readFileSync(stateFilePath, "utf-8")),
				save: vi.fn(),
				getRunningAgents: () => [],
				removeAgent: vi.fn(),
			};

			const recovery = new SessionRecovery(
				stateProvider,
				mergeQueueProvider,
				{ reopenTask: vi.fn() },
				{ remove: vi.fn() },
				createRealCommandRunner(),
			);

			// Act
			const count = await recovery.resumeMergeQueue();

			// Assert
			expect(count).toBe(1);
			expect(enqueuedItems).toHaveLength(1);
			expect(enqueuedItems[0].taskId).toBe("ch-001");
		});

		it("skips non-pending merge queue items", async () => {
			// Arrange
			const mergingItem: MergeQueueItem = {
				taskId: "ch-002",
				branch: "agent/claude/ch-002",
				worktree: "/worktrees/agent-2",
				priority: 1,
				status: "merging",
				retries: 0,
				enqueuedAt: Date.now(),
			};
			const state = createMockState({}, [mergingItem]);
			writeFileSync(stateFilePath, JSON.stringify(state));

			const enqueuedItems: MergeQueueItem[] = [];

			const stateProvider: StateProvider = {
				load: () =>
					JSON.parse(require("node:fs").readFileSync(stateFilePath, "utf-8")),
				save: vi.fn(),
				getRunningAgents: () => [],
				removeAgent: vi.fn(),
			};

			const recovery = new SessionRecovery(
				stateProvider,
				{ enqueue: (item) => enqueuedItems.push(item) },
				{ reopenTask: vi.fn() },
				{ remove: vi.fn() },
				createRealCommandRunner(),
			);

			// Act
			const count = await recovery.resumeMergeQueue();

			// Assert
			expect(count).toBe(0);
			expect(enqueuedItems).toHaveLength(0);
		});
	});

	describe("Full Recovery Flow", () => {
		it("completes recovery without data loss", async () => {
			// Arrange
			const worktreePath = join(tempDir, "worktrees", "agent-1");
			mkdirSync(worktreePath, { recursive: true });

			const agent = createMockAgent(
				"agent-1",
				"ch-001",
				999999999,
				worktreePath,
			);
			const pendingItem: MergeQueueItem = {
				taskId: "ch-002",
				branch: "agent/claude/ch-002",
				worktree: "/worktrees/agent-2",
				priority: 1,
				status: "pending",
				retries: 0,
				enqueuedAt: Date.now(),
			};
			const state = createMockState({ "agent-1": agent }, [pendingItem]);
			writeFileSync(stateFilePath, JSON.stringify(state));

			let loadedState: ChorusState | null = null;
			const reopenedTasks: string[] = [];
			const enqueuedItems: MergeQueueItem[] = [];
			let saveCalled = false;

			const stateProvider: StateProvider = {
				load: () => {
					loadedState = JSON.parse(
						require("node:fs").readFileSync(stateFilePath, "utf-8"),
					);
					return loadedState;
				},
				save: () => {
					saveCalled = true;
				},
				getRunningAgents: () =>
					loadedState ? Object.values(loadedState.agents) : [],
				removeAgent: vi.fn(),
			};

			const recovery = new SessionRecovery(
				stateProvider,
				{ enqueue: (item) => enqueuedItems.push(item) },
				{
					reopenTask: async (taskId) => {
						reopenedTasks.push(taskId);
					},
				},
				{ remove: vi.fn() },
				createRealCommandRunner(),
			);

			// Act
			const result = await recovery.recover();

			// Assert
			expect(result.recovered).toBe(true);
			expect(result.restoredTasks).toContain("ch-001");
			expect(result.resumedMergeItems).toBe(1);
			expect(saveCalled).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});
});
