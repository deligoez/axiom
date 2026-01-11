import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import type { ChorusState } from "../types/state.js";

export class StateService {
	private statePath: string;
	private state: ChorusState | null = null;

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
}
