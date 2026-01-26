import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type {
	AgentType,
	AppendResult,
	DeduplicationConfig,
	DuplicateCheck,
	Learning,
	LearningsMeta,
	SimilarityResult,
} from "../types/learning.js";
import type { AgentLogger } from "./AgentLogger.js";

/**
 * Echo persona constants for logging.
 */
const ECHO_PERSONA = "echo" as const;
const ECHO_INSTANCE_ID = "echo";

const DEFAULT_DEDUP: DeduplicationConfig = {
	algorithm: "similarity",
	threshold: 0.85,
	action: "skip",
};

export interface LearningStoreConfig {
	dedupConfig?: Partial<DeduplicationConfig>;
	/** Optional AgentLogger for Echo persona logging */
	agentLogger?: AgentLogger;
}

export class LearningStore {
	private repoPath: string;
	readonly dedupConfig: DeduplicationConfig;
	readonly learningsPath: string;
	readonly metaPath: string;
	private readonly agentLogger?: AgentLogger;

	constructor(
		repoPath = ".",
		config: Partial<DeduplicationConfig> | LearningStoreConfig = {},
	) {
		this.repoPath = repoPath;

		// Handle both old API (dedupConfig directly) and new API (config object)
		if ("agentLogger" in config || "dedupConfig" in config) {
			// New API: LearningStoreConfig
			const storeConfig = config as LearningStoreConfig;
			this.dedupConfig = { ...DEFAULT_DEDUP, ...storeConfig.dedupConfig };
			this.agentLogger = storeConfig.agentLogger;
		} else {
			// Old API: Partial<DeduplicationConfig> directly
			this.dedupConfig = { ...DEFAULT_DEDUP, ...config };
			this.agentLogger = undefined;
		}
		this.learningsPath = path.join(
			repoPath,
			".claude",
			"rules",
			"learnings.md",
		);
		this.metaPath = path.join(
			repoPath,
			".claude",
			"rules",
			"learnings-meta.json",
		);
	}

	/**
	 * Log a message as Echo persona.
	 */
	private log(level: "info" | "debug", message: string): void {
		if (this.agentLogger) {
			this.agentLogger.log({
				persona: ECHO_PERSONA,
				instanceId: ECHO_INSTANCE_ID,
				level,
				message,
			});
		}
	}

	async append(learnings: Learning[]): Promise<AppendResult> {
		await this.ensureExists();

		const result: AppendResult = {
			added: [],
			skipped: [],
			merged: [],
		};

		// Read existing content
		let existingContent = "";
		try {
			existingContent = await fs.readFile(this.learningsPath, "utf-8");
		} catch {
			existingContent = "# Project Learnings\n\n";
		}

		// Load metadata
		const meta = await this.loadMeta();

		// Process each learning
		const newLearnings: Learning[] = [];
		for (const learning of learnings) {
			const dupCheck = await this.isDuplicate(learning);
			if (dupCheck.isDuplicate) {
				result.skipped.push(learning);
			} else {
				newLearnings.push(learning);
				result.added.push(learning);
				// Add hash to metadata
				const hash = this.calculateHash(learning.content);
				meta.hashes.add(hash);
			}
		}

		// Append new learnings
		if (newLearnings.length > 0) {
			let newContent = existingContent;
			for (const learning of newLearnings) {
				newContent += this.formatLearning(learning);
				// Log Echo persona storage
				this.log(
					"info",
					`[echo] Stored learning to learnings.md (scope: ${learning.scope})`,
				);
			}
			await fs.writeFile(this.learningsPath, newContent, "utf-8");
		}

		// Save updated metadata
		meta.lastUpdated = new Date();
		await this.saveMeta(meta);

		return result;
	}

	async commit(taskId: string, agentType: AgentType): Promise<void> {
		const message = `learn: extract from ${taskId} (${agentType})`;
		const learningsRelPath = path.relative(this.repoPath, this.learningsPath);
		const metaRelPath = path.relative(this.repoPath, this.metaPath);

		await execAsync(`git add "${learningsRelPath}" "${metaRelPath}"`, {
			cwd: this.repoPath,
		});
		await execAsync(`git commit -m "${message}"`, {
			cwd: this.repoPath,
		});
	}

	async readAll(): Promise<Learning[]> {
		try {
			const content = await fs.readFile(this.learningsPath, "utf-8");
			return this.parseLearnings(content);
		} catch (error) {
			// File not existing is expected for new projects
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
				console.warn("Failed to read learnings file:", error);
			}
			return [];
		}
	}

	async getByCategory(category: string): Promise<Learning[]> {
		const all = await this.readAll();
		return all.filter((l) => l.category === category);
	}

	async getByScope(scope: Learning["scope"]): Promise<Learning[]> {
		const all = await this.readAll();
		return all.filter((l) => l.scope === scope);
	}

	async isDuplicate(learning: Learning): Promise<DuplicateCheck> {
		const hash = this.calculateHash(learning.content);
		const meta = await this.loadMeta();

		// Check exact hash match
		if (meta.hashes.has(hash)) {
			return {
				isDuplicate: true,
				reason: "exact",
			};
		}

		// Check similarity if algorithm is set to similarity
		if (this.dedupConfig.algorithm === "similarity") {
			const existing = await this.readAll();
			const similarResult = await this.checkSimilarity(
				learning.content,
				existing,
			);
			if (
				similarResult &&
				similarResult.similarity >= this.dedupConfig.threshold
			) {
				return {
					isDuplicate: true,
					reason: "similar",
					similarTo: similarResult.learningId,
					similarity: similarResult.similarity,
				};
			}
		}

		return { isDuplicate: false };
	}

	calculateHash(content: string): string {
		const normalized = content.toLowerCase().trim();
		return crypto.createHash("sha256").update(normalized).digest("hex");
	}

	async checkSimilarity(
		content: string,
		existing: Learning[],
	): Promise<SimilarityResult | null> {
		const contentTokens = this.tokenize(content);

		let maxSimilarity = 0;
		let mostSimilarId = "";

		for (const learning of existing) {
			const existingTokens = this.tokenize(learning.content);
			const similarity = this.jaccardSimilarity(contentTokens, existingTokens);

			if (similarity > maxSimilarity) {
				maxSimilarity = similarity;
				mostSimilarId = learning.id;
			}
		}

		if (maxSimilarity > 0) {
			return {
				learningId: mostSimilarId,
				similarity: maxSimilarity,
			};
		}

		return null;
	}

	async loadMeta(): Promise<LearningsMeta> {
		try {
			const content = await fs.readFile(this.metaPath, "utf-8");
			const data = JSON.parse(content);
			return {
				path: this.metaPath,
				hashes: new Set(data.hashes || []),
				reviewed: new Set(data.reviewed || []),
				lastUpdated: data.lastUpdated ? new Date(data.lastUpdated) : new Date(),
			};
		} catch (error) {
			// File not existing is expected for new projects
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
				console.warn("Failed to load learnings metadata:", error);
			}
			return {
				path: this.metaPath,
				hashes: new Set(),
				reviewed: new Set(),
				lastUpdated: new Date(),
			};
		}
	}

	async saveMeta(meta: LearningsMeta): Promise<void> {
		const data = {
			hashes: [...meta.hashes],
			reviewed: [...meta.reviewed],
			lastUpdated: meta.lastUpdated.toISOString(),
		};
		await fs.writeFile(this.metaPath, JSON.stringify(data, null, 2), "utf-8");
	}

	async markReviewed(learningId: string, _reviewer: string): Promise<void> {
		const meta = await this.loadMeta();
		meta.reviewed.add(learningId);
		await this.saveMeta(meta);
	}

	async getUnreviewed(): Promise<Learning[]> {
		const meta = await this.loadMeta();
		const all = await this.readAll();
		return all.filter((l) => !meta.reviewed.has(l.id));
	}

	async ensureExists(): Promise<void> {
		const dir = path.dirname(this.learningsPath);
		try {
			await fs.access(dir);
		} catch {
			await fs.mkdir(dir, { recursive: true });
			// Create empty files
			await fs.writeFile(
				this.learningsPath,
				"# Project Learnings\n\n",
				"utf-8",
			);
			await fs.writeFile(
				this.metaPath,
				JSON.stringify(
					{ hashes: [], reviewed: [], lastUpdated: null },
					null,
					2,
				),
				"utf-8",
			);
		}
	}

	private formatLearning(learning: Learning): string {
		const scopePrefix = `[${learning.scope.toUpperCase()}]`;
		const timestamp = learning.source.timestamp.toISOString().split("T")[0];
		return `\n- ${scopePrefix} ${learning.content}\n  <!-- id: ${learning.id}, source: ${learning.source.taskId} (${timestamp}, ${learning.source.agentType}) -->\n`;
	}

	private parseLearnings(content: string): Learning[] {
		const learnings: Learning[] = [];
		const bulletRegex = /^- \[(LOCAL|CROSS-CUTTING|ARCHITECTURAL)\] (.+)$/gim;
		const idRegex = /<!-- id: ([^,\s]+)/;

		let match: RegExpExecArray | null;
		const lines = content.split("\n");

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			match = bulletRegex.exec(line);
			if (match) {
				const scope = match[1].toLowerCase() as Learning["scope"];
				const learningContent = match[2];

				// Look for id comment on next line
				let id: string = crypto.randomUUID();
				if (i + 1 < lines.length) {
					const nextLine = lines[i + 1];
					const idMatch = idRegex.exec(nextLine);
					if (idMatch) {
						id = idMatch[1];
					}
				}

				learnings.push({
					id,
					content: learningContent,
					scope: scope === "cross-cutting" ? "cross-cutting" : scope,
					category: "general",
					source: {
						taskId: "unknown",
						agentType: "claude",
						timestamp: new Date(),
					},
					suggestPattern: false,
				});
			}
		}

		return learnings;
	}

	private tokenize(text: string): Set<string> {
		const normalized = text.toLowerCase();
		const words = normalized.match(/\b\w+\b/g) || [];
		// Remove common stop words for better similarity matching
		const stopWords = new Set([
			"the",
			"a",
			"an",
			"and",
			"or",
			"but",
			"in",
			"on",
			"at",
			"to",
			"for",
			"of",
			"is",
			"are",
			"was",
			"were",
		]);
		return new Set(words.filter((w) => !stopWords.has(w)));
	}

	private jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
		const intersection = new Set([...set1].filter((x) => set2.has(x)));
		const union = new Set([...set1, ...set2]);

		if (union.size === 0) return 0;
		return intersection.size / union.size;
	}
}
