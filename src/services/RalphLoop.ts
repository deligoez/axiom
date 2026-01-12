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
}

export interface LoopStatus {
	running: boolean;
	paused: boolean;
	tasksAssigned: number;
	tasksCompleted: number;
}

export class RalphLoop {
	private running = false;
	private paused = false;
	private tasksAssigned = 0;
	private tasksCompleted = 0;
	private stopResolve: (() => void) | null = null;
	private maxIterations: number;

	constructor(private deps: RalphLoopDeps) {
		this.maxIterations = deps.maxIterations ?? 3;

		// Listen for agent completions to track task completion
		this.deps.eventEmitter.on("agentCompleted", () => {
			this.tasksCompleted++;
			// If we're stopping and no agents are left, resolve the stop promise
			if (this.stopResolve && this.deps.slotManager.getInUse() === 0) {
				this.stopResolve();
			}
		});

		// Listen for task completion and queue merge
		this.deps.eventEmitter.on(
			"taskCompleted",
			(event: { taskId: string; worktreePath: string; branch?: string }) => {
				this.deps.mergeService.enqueue({
					taskId: event.taskId,
					worktree: event.worktreePath,
					branch: event.branch ?? `task/${event.taskId}`,
					priority: 2,
				});
			},
		);

		// Listen for NO_SIGNAL events
		this.deps.eventEmitter.on(
			"agentNoSignal",
			(event: { taskId: string; iteration: number }) => {
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
			},
		);

		// Listen for BLOCKED events
		this.deps.eventEmitter.on(
			"agentBlocked",
			(_event: { taskId: string; agentId: string }) => {
				// Release the slot but don't close the task
				this.deps.slotManager.release();
			},
		);
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
			// Check if we have available slots
			if (!this.deps.slotManager.hasAvailable()) {
				break;
			}

			// Try to acquire a slot
			const acquired = this.deps.slotManager.acquire();
			if (!acquired) {
				break;
			}

			// Assign the task
			await this.deps.orchestrator.assignTask({ taskId: task.id });
			this.tasksAssigned++;
		}

		// Check if all done
		const activeSlots = this.deps.slotManager.getInUse();
		if (sortedTasks.length === 0 && activeSlots === 0) {
			this.deps.eventEmitter.emit("allDone");
		}
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
}
