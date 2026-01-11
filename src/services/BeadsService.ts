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

	constructor(projectDir: string) {
		super();
		this.beadsPath = path.join(projectDir, ".beads", "issues.jsonl");
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
		});

		this.watcher.on("change", () => {
			this.reload();
		});

		this.watcher.on("add", () => {
			this.reload();
		});

		this.watcher.on("error", (err: unknown) => {
			this.emit("error", err instanceof Error ? err : new Error(String(err)));
		});
	}

	async stop(): Promise<void> {
		if (this.watcher) {
			await this.watcher.close();
			this.watcher = null;
		}
	}
}
