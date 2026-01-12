import type { EventEmitter } from "node:events";
import type { Orchestrator } from "./Orchestrator.js";
import type { SlotManager } from "./SlotManager.js";

export interface RalphLoopDeps {
	orchestrator: Orchestrator;
	slotManager: SlotManager;
	eventEmitter: EventEmitter;
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

	constructor(private deps: RalphLoopDeps) {
		// Listen for agent completions to track task completion
		this.deps.eventEmitter.on("agentCompleted", () => {
			this.tasksCompleted++;
			// If we're stopping and no agents are left, resolve the stop promise
			if (this.stopResolve && this.deps.slotManager.getInUse() === 0) {
				this.stopResolve();
			}
		});
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
}
