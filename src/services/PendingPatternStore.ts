import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { PatternSuggestion } from "../components/PatternReviewDialog.js";

interface StoredPattern {
	id: string;
	category: string;
	sourceTask: string;
	sourceAgent: string;
	content: string;
	createdAt: string;
	expiresAt: string;
}

const PENDING_PATTERNS_FILE = ".chorus/pending-patterns.json";
const DEFAULT_EXPIRY_DAYS = 7;

export class PendingPatternStore {
	private readonly filePath: string;

	constructor(projectDir: string) {
		this.filePath = path.join(projectDir, PENDING_PATTERNS_FILE);
	}

	/**
	 * Add a pattern to the pending queue
	 */
	async add(pattern: PatternSuggestion): Promise<void> {
		const patterns = await this.load();
		const storedPattern: StoredPattern = {
			...pattern,
			createdAt: pattern.createdAt.toISOString(),
			expiresAt: pattern.expiresAt.toISOString(),
		};
		patterns.push(storedPattern);
		await this.save(patterns);
	}

	/**
	 * Remove a pattern from the pending queue by ID
	 */
	async remove(patternId: string): Promise<void> {
		const patterns = await this.load();
		const filtered = patterns.filter((p) => p.id !== patternId);
		await this.save(filtered);
	}

	/**
	 * Get all pending patterns (excluding expired)
	 */
	async getPending(): Promise<PatternSuggestion[]> {
		const patterns = await this.load();
		const now = new Date();

		// Filter out expired patterns
		const valid = patterns.filter((p) => new Date(p.expiresAt) > now);

		// If we filtered any, save the clean list
		if (valid.length !== patterns.length) {
			await this.save(valid);
		}

		return valid.map((p) => ({
			...p,
			createdAt: new Date(p.createdAt),
			expiresAt: new Date(p.expiresAt),
		}));
	}

	/**
	 * Get count of pending patterns
	 */
	async getCount(): Promise<number> {
		const pending = await this.getPending();
		return pending.length;
	}

	/**
	 * Create a new pattern suggestion with default expiry
	 */
	static createSuggestion(
		id: string,
		category: string,
		sourceTask: string,
		sourceAgent: string,
		content: string,
	): PatternSuggestion {
		const now = new Date();
		const expiresAt = new Date(
			now.getTime() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
		);
		return {
			id,
			category,
			sourceTask,
			sourceAgent,
			content,
			createdAt: now,
			expiresAt,
		};
	}

	/**
	 * Load patterns from file
	 */
	private async load(): Promise<StoredPattern[]> {
		try {
			const content = await fs.readFile(this.filePath, "utf-8");
			return JSON.parse(content) as StoredPattern[];
		} catch {
			return [];
		}
	}

	/**
	 * Save patterns to file
	 */
	private async save(patterns: StoredPattern[]): Promise<void> {
		// Ensure directory exists
		const dir = path.dirname(this.filePath);
		try {
			await fs.access(dir);
		} catch {
			await fs.mkdir(dir, { recursive: true });
		}

		await fs.writeFile(this.filePath, JSON.stringify(patterns, null, 2));
	}
}
