import type { EventEmitter } from "node:events";
import type { MergeService } from "./MergeService.js";
import type { Orchestrator } from "./Orchestrator.js";
import type { SlotManager } from "./SlotManager.js";

interface Task {
	id: string;
	priority: number;
	created?: string;
}

export interface RalphLoopDeps {
	orchestrator: Orchestrator;
	slotManager: SlotManager;
	mergeService: MergeService;
	eventEmitter: EventEmitter;
	maxIterations?: number;
	maxTotalTasks?: number;
	idleTimeout?: number;
}

export interface LoopStatus {
	running: boolean;
	paused: boolean;
	tasksAssigned: number;
	tasksCompleted: number;
}

const ERROR_THRESHOLD = 3;

const STUCK_AGENT_THRESHOLD = 5;

export class RalphLoop {
	private running = false;
	private paused = false;
	private tasksAssigned = 0;
	private tasksCompleted = 0;
	private stopResolve: (() => void) | null = null;
	private maxIterations: number;
	private consecutiveErrors = 0;
	private diskFull = false;
	private agentCommitCounts = new Map<string, number>();
	private agentIterationsWithoutCommit = new Map<string, number>();
	private maxTotalTasks: number;
	private totalTasksCompleted = 0;
	private idleTimeout: number | undefined;
	private idleTimer: ReturnType<typeof setTimeout> | null = null;

	// Store handler references for cleanup
	private agentCompletedHandler: () => void;
	private taskCompletedHandler: (event: {
		taskId: string;
		worktreePath: string;
		branch?: string;
	}) => void;
	private agentNoSignalHandler: (event: {
		taskId: string;
		iteration: number;
	}) => void;
	private agentBlockedHandler: (event: {
		taskId: string;
		agentId: string;
	}) => void;

	constructor(private deps: RalphLoopDeps) {
		this.maxIterations = deps.maxIterations ?? 3;
		this.maxTotalTasks = deps.maxTotalTasks ?? 100;
		this.idleTimeout = deps.idleTimeout;

		// Define handlers as instance methods for cleanup
		this.agentCompletedHandler = () => {
			this.tasksCompleted++;
			// If we're stopping and no agents are left, resolve the stop promise
			if (this.stopResolve && this.deps.slotManager.getInUse() === 0) {
				this.stopResolve();
			}
		};

		this.taskCompletedHandler = (event: {
			taskId: string;
			worktreePath: string;
			branch?: string;
		}) => {
			this.deps.mergeService.enqueue({
				taskId: event.taskId,
				worktree: event.worktreePath,
				branch: event.branch ?? `task/${event.taskId}`,
				priority: 2,
			});
		};

		this.agentNoSignalHandler = (event: {
			taskId: string;
			iteration: number;
		}) => {
			if (event.iteration >= this.maxIterations) {
				// Emit timeout event
				this.deps.eventEmitter.emit("taskTimeout", {
					taskId: event.taskId,
					iterations: event.iteration,
				});
			} else {
				// Respawn - re-assign the task
				void this.deps.orchestrator.assignTask({ taskId: event.taskId });
			}
		};

		this.agentBlockedHandler = (_event: {
			taskId: string;
			agentId: string;
		}) => {
			// Release the slot but don't close the task
			this.deps.slotManager.release();
		};

		// Register handlers
		this.deps.eventEmitter.on("agentCompleted", this.agentCompletedHandler);
		this.deps.eventEmitter.on("taskCompleted", this.taskCompletedHandler);
		this.deps.eventEmitter.on("agentNoSignal", this.agentNoSignalHandler);
		this.deps.eventEmitter.on("agentBlocked", this.agentBlockedHandler);
	}

	start(): void {
		// Idempotent - don't restart if already running
		if (this.running) {
			return;
		}

		this.running = true;
		this.paused = false;

		// Emit started event
		this.deps.eventEmitter.emit("started");
	}

	async stop(): Promise<void> {
		if (!this.running) {
			return;
		}

		this.running = false;
		this.paused = false;

		// Wait for active agents to complete
		const inUse = this.deps.slotManager.getInUse();
		if (inUse > 0) {
			await new Promise<void>((resolve) => {
				this.stopResolve = resolve;
			});
			this.stopResolve = null;
		}

		// Emit stopped event
		this.deps.eventEmitter.emit("stopped");
	}

	/**
	 * Clean up all event listeners.
	 * Call this before disposing of the RalphLoop instance.
	 */
	cleanup(): void {
		// Remove all event listeners
		this.deps.eventEmitter.off("agentCompleted", this.agentCompletedHandler);
		this.deps.eventEmitter.off("taskCompleted", this.taskCompletedHandler);
		this.deps.eventEmitter.off("agentNoSignal", this.agentNoSignalHandler);
		this.deps.eventEmitter.off("agentBlocked", this.agentBlockedHandler);

		// Clear idle timer if set
		if (this.idleTimer) {
			clearTimeout(this.idleTimer);
			this.idleTimer = null;
		}
	}

	pause(): void {
		if (!this.running) {
			return;
		}
		this.paused = true;
	}

	resume(): void {
		if (!this.running) {
			return;
		}
		this.paused = false;
	}

	isRunning(): boolean {
		return this.running;
	}

	isPaused(): boolean {
		return this.paused;
	}

	getStatus(): LoopStatus {
		return {
			running: this.running,
			paused: this.paused,
			tasksAssigned: this.tasksAssigned,
			tasksCompleted: this.tasksCompleted,
		};
	}

	/**
	 * Check if paused due to disk full.
	 */
	isDiskFullPause(): boolean {
		return this.diskFull;
	}

	/**
	 * Process the task assignment loop.
	 *
	 * Assigns ready tasks to available slots, respecting priority and FIFO order.
	 */
	async processLoop(): Promise<void> {
		// Get ready tasks from orchestrator (already filtered for deferred)
		const readyTasks = await this.deps.orchestrator.getReadyTasks();

		// Sort by priority (ascending) then by created date (FIFO)
		const sortedTasks = this.sortTasksByPriorityAndFifo(readyTasks as Task[]);

		// Assign tasks to available slots
		for (const task of sortedTasks) {
			// Check if paused (error threshold or disk full)
			if (this.paused) {
				break;
			}

			// Check if we have available slots
			if (!this.deps.slotManager.hasAvailable()) {
				break;
			}

			// Try to acquire a slot
			const acquired = this.deps.slotManager.acquire();
			if (!acquired) {
				break;
			}

			// Assign the task with error handling
			try {
				await this.deps.orchestrator.assignTask({ taskId: task.id });
				this.tasksAssigned++;
				this.consecutiveErrors = 0; // Reset on success
			} catch (error) {
				// Handle error
				this.handleAssignmentError(error);
				// Release the slot we acquired
				this.deps.slotManager.release();
			}
		}

		// Check if all done
		const activeSlots = this.deps.slotManager.getInUse();
		if (sortedTasks.length === 0 && activeSlots === 0) {
			this.deps.eventEmitter.emit("allDone");
			// Auto-stop after all tasks are done
			this.running = false;
		}
	}

	/**
	 * Handle task assignment errors.
	 */
	private handleAssignmentError(error: unknown): void {
		const err = error instanceof Error ? error : new Error(String(error));

		// Check for disk full (ENOSPC)
		if (this.isDiskFullError(error)) {
			this.diskFull = true;
			this.paused = true;
			this.deps.eventEmitter.emit("diskFull", err);
			return;
		}

		// Emit error event
		this.deps.eventEmitter.emit("error", err);

		// Track consecutive errors
		this.consecutiveErrors++;

		// Check error threshold
		if (this.consecutiveErrors >= ERROR_THRESHOLD) {
			this.paused = true;
			this.deps.eventEmitter.emit("errorThreshold", {
				consecutiveErrors: this.consecutiveErrors,
				lastError: err,
			});
		}
	}

	/**
	 * Check if error is disk full (ENOSPC).
	 */
	private isDiskFullError(error: unknown): boolean {
		if (error instanceof Error) {
			const nodeError = error as NodeJS.ErrnoException;
			return nodeError.code === "ENOSPC";
		}
		return false;
	}

	/**
	 * Sort tasks by priority (P1 first) then FIFO within same priority.
	 */
	private sortTasksByPriorityAndFifo(tasks: Task[]): Task[] {
		return [...tasks].sort((a, b) => {
			// Sort by priority first (lower number = higher priority)
			if (a.priority !== b.priority) {
				return a.priority - b.priority;
			}
			// Within same priority, sort by created date (FIFO - older first)
			const aCreated = a.created ? new Date(a.created).getTime() : 0;
			const bCreated = b.created ? new Date(b.created).getTime() : 0;
			return aCreated - bCreated;
		});
	}

	/**
	 * Check agent progress by tracking commit count.
	 * If agent has 5 iterations without new commits, emit stuckAgent event and pause.
	 */
	async checkAgentProgress(
		agentId: string,
		_worktreePath: string,
		commitCount = 0,
	): Promise<void> {
		const previousCount = this.agentCommitCounts.get(agentId) ?? 0;
		this.agentCommitCounts.set(agentId, commitCount);

		// Check if agent made progress
		if (commitCount <= previousCount) {
			// No new commits
			const iterations =
				(this.agentIterationsWithoutCommit.get(agentId) ?? 0) + 1;
			this.agentIterationsWithoutCommit.set(agentId, iterations);

			// Check if stuck
			if (iterations >= STUCK_AGENT_THRESHOLD) {
				this.paused = true;
				this.deps.eventEmitter.emit("stuckAgent", {
					agentId,
					iterationsWithoutCommit: iterations,
				});
			}
		} else {
			// Agent made progress, reset counter
			this.agentIterationsWithoutCommit.set(agentId, 0);
		}
	}

	/**
	 * Get the tracked commit count for an agent.
	 */
	getAgentCommitCount(agentId: string): number | undefined {
		return this.agentCommitCounts.get(agentId);
	}

	/**
	 * Increment the total tasks completed counter.
	 * Emits maxTasksReached when limit is hit.
	 */
	incrementTasksCompleted(): void {
		this.totalTasksCompleted++;

		if (this.totalTasksCompleted >= this.maxTotalTasks) {
			this.deps.eventEmitter.emit("maxTasksReached", {
				count: this.totalTasksCompleted,
			});
		}
	}

	/**
	 * Start the idle timer. Emits idleTimeout if no progress for idleTimeout ms.
	 */
	startIdleTimer(): void {
		if (this.idleTimeout === undefined) {
			return;
		}

		// Clear existing timer if any
		if (this.idleTimer) {
			clearTimeout(this.idleTimer);
		}

		this.idleTimer = setTimeout(() => {
			this.deps.eventEmitter.emit("idleTimeout");
		}, this.idleTimeout);
	}
}
