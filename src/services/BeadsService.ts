import { EventEmitter } from "node:events";
import * as fs from "node:fs";
import * as path from "node:path";
import chokidar, { type FSWatcher } from "chokidar";
import type { Bead, BeadStatus } from "../types/bead.js";
import { parseBeadsJSONL } from "./BeadsParser.js";

type BeadsServiceEvents = {
	change: [beads: Bead[]];
	error: [error: Error];
};

export class BeadsService extends EventEmitter<BeadsServiceEvents> {
	private beadsPath: string;
	private watcher: FSWatcher | null = null;
	private cachedBeads: Bead[] = [];

	// Store handler references for cleanup
	private changeHandler: () => void;
	private addHandler: () => void;
	private errorHandler: (err: unknown) => void;

	constructor(projectDir: string) {
		super();
		this.beadsPath = path.join(projectDir, ".beads", "issues.jsonl");

		// Initialize handlers for cleanup
		this.changeHandler = () => {
			this.reload();
		};
		this.addHandler = () => {
			this.reload();
		};
		this.errorHandler = (err: unknown) => {
			this.emit("error", err instanceof Error ? err : new Error(String(err)));
		};
	}

	getBeadsPath(): string {
		return this.beadsPath;
	}

	getBeads(): Bead[] {
		if (!fs.existsSync(this.beadsPath)) {
			return [];
		}

		try {
			const content = fs.readFileSync(this.beadsPath, "utf-8");
			this.cachedBeads = parseBeadsJSONL(content);
			return this.cachedBeads;
		} catch {
			return [];
		}
	}

	getBead(id: string): Bead | undefined {
		const beads = this.getBeads();
		return beads.find((b) => b.id === id);
	}

	getBeadsByStatus(status: BeadStatus): Bead[] {
		return this.getBeads().filter((b) => b.status === status);
	}

	getBeadsSortedByPriority(): Bead[] {
		return this.getBeads().sort((a, b) => a.priority - b.priority);
	}

	reload(): void {
		try {
			const beads = this.getBeads();
			this.emit("change", beads);
		} catch (error) {
			this.emit(
				"error",
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	watch(): void {
		if (this.watcher) {
			return; // Already watching
		}

		this.watcher = chokidar.watch(this.beadsPath, {
			persistent: true,
			ignoreInitial: true,
			// Wait for file writes to finish before triggering events
			// This helps avoid race conditions when files are being written
			awaitWriteFinish: {
				stabilityThreshold: 50,
				pollInterval: 10,
			},
		});

		this.watcher.on("change", this.changeHandler);
		this.watcher.on("add", this.addHandler);
		this.watcher.on("error", this.errorHandler);
	}

	async stop(): Promise<void> {
		if (this.watcher) {
			// Explicitly remove handlers before closing
			this.watcher.off("change", this.changeHandler);
			this.watcher.off("add", this.addHandler);
			this.watcher.off("error", this.errorHandler);
			await this.watcher.close();
			this.watcher = null;
		}
	}
}
