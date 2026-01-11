import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import type { AgentState, AgentStatus, ChorusState } from "../types/state.js";

export interface IterationRecord {
	number: number;
	startCommit: string;
}

export class DuplicateAgentError extends Error {
	constructor(id: string) {
		super(`Agent with ID ${id} already exists`);
		this.name = "DuplicateAgentError";
	}
}

export class AgentNotFoundError extends Error {
	constructor(id: string) {
		super(`Agent with ID ${id} not found`);
		this.name = "AgentNotFoundError";
	}
}

export class StateService {
	private statePath: string;
	private state: ChorusState | null = null;
	private iterations: Map<string, IterationRecord[]> = new Map();

	constructor(projectDir: string) {
		this.statePath = path.join(projectDir, ".chorus", "state.json");
	}

	init(): ChorusState {
		this.state = {
			version: "1.0",
			sessionId: crypto.randomUUID(),
			startedAt: Date.now(),
			mode: "semi-auto",
			paused: false,
			agents: {},
			mergeQueue: [],
			checkpoint: null,
			stats: {
				tasksCompleted: 0,
				tasksFailed: 0,
				mergesAuto: 0,
				mergesManual: 0,
				totalIterations: 0,
				totalRuntime: 0,
			},
		};
		return this.state;
	}

	load(): ChorusState | null {
		if (!fs.existsSync(this.statePath)) {
			return null;
		}

		const data = JSON.parse(fs.readFileSync(this.statePath, "utf-8"));
		if (!this.isValidState(data)) {
			throw new Error("Invalid state structure");
		}
		this.state = data;
		return this.state;
	}

	get(): ChorusState {
		if (!this.state) {
			throw new Error("State not initialized");
		}
		return this.state;
	}

	private isValidState(data: unknown): data is ChorusState {
		if (!data || typeof data !== "object") return false;
		const s = data as Record<string, unknown>;
		return !!(s.sessionId && s.startedAt && s.agents && s.stats);
	}

	// Agent CRUD operations
	addAgent(agent: AgentState): void {
		const state = this.get();
		if (state.agents[agent.id]) {
			throw new DuplicateAgentError(agent.id);
		}
		state.agents[agent.id] = agent;
		this.iterations.set(agent.id, []);
	}

	updateAgent(id: string, partial: Partial<AgentState>): void {
		const state = this.get();
		if (!state.agents[id]) {
			return; // Idempotent - no-op if not found
		}
		state.agents[id] = { ...state.agents[id], ...partial };
	}

	removeAgent(id: string): void {
		const state = this.get();
		delete state.agents[id];
		this.iterations.delete(id);
	}

	getAgent(id: string): AgentState | undefined {
		const state = this.get();
		return state.agents[id];
	}

	// Iteration management
	startIteration(id: string, startCommit: string): number {
		const agent = this.getAgent(id);
		if (!agent) {
			throw new AgentNotFoundError(id);
		}

		const agentIterations = this.iterations.get(id) ?? [];
		const newIteration = agentIterations.length + 1;

		agentIterations.push({
			number: newIteration,
			startCommit,
		});

		this.iterations.set(id, agentIterations);
		this.updateAgent(id, { iteration: newIteration });

		return newIteration;
	}

	getIterations(id: string): IterationRecord[] {
		return this.iterations.get(id) ?? [];
	}

	// Status updates
	setStatus(id: string, status: AgentStatus): void {
		this.updateAgent(id, { status });
	}

	getRunningAgents(): AgentState[] {
		const state = this.get();
		return Object.values(state.agents).filter((a) => a.status === "running");
	}
}
