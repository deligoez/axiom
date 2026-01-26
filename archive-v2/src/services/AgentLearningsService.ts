/**
 * Agent Learnings Service
 *
 * Manages per-agent learnings (distinct from global project learnings).
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { PersonaName } from "../types/persona.js";

/**
 * Learnings organized by category.
 */
export type AgentLearnings = Record<string, string[]>;

/**
 * Service to manage per-agent learnings.
 */
export class AgentLearningsService {
	private projectDir: string;
	/** Hash set for deduplication per persona */
	private seenHashes: Map<string, Set<string>> = new Map();

	constructor(projectDir: string) {
		this.projectDir = projectDir;
	}

	/**
	 * Get the learnings file path for a persona.
	 */
	private getLearningsPath(persona: PersonaName | string): string {
		return join(this.projectDir, ".chorus", "agents", persona, "learnings.md");
	}

	/**
	 * Normalize text for deduplication.
	 */
	private normalize(text: string): string {
		return text.toLowerCase().trim();
	}

	/**
	 * Compute SHA-256 hash of normalized text.
	 */
	private hash(text: string): string {
		return createHash("sha256").update(this.normalize(text)).digest("hex");
	}

	/**
	 * Get or create hash set for a persona.
	 */
	private getHashSet(persona: string): Set<string> {
		const existing = this.seenHashes.get(persona);
		if (existing) {
			return existing;
		}
		const newSet = new Set<string>();
		this.seenHashes.set(persona, newSet);
		return newSet;
	}

	/**
	 * Load learnings for a persona.
	 * Returns empty object if file doesn't exist.
	 */
	load(persona: PersonaName | string): AgentLearnings {
		const learningsPath = this.getLearningsPath(persona);

		if (!existsSync(learningsPath)) {
			return {};
		}

		try {
			const content = readFileSync(learningsPath, "utf-8");
			return this.parseLearnings(persona, content);
		} catch {
			return {};
		}
	}

	/**
	 * Parse learnings markdown into structured format.
	 */
	private parseLearnings(persona: string, content: string): AgentLearnings {
		const learnings: AgentLearnings = {};
		const hashSet = this.getHashSet(persona);

		let currentCategory = "";
		const lines = content.split("\n");

		for (const line of lines) {
			// Category header: ## Category Name
			const categoryMatch = line.match(/^## (.+)$/);
			if (categoryMatch) {
				currentCategory = categoryMatch[1];
				if (!learnings[currentCategory]) {
					learnings[currentCategory] = [];
				}
				continue;
			}

			// Learning item: - [date] text
			const learningMatch = line.match(/^- \[[\d-]+\] (.+)$/);
			if (learningMatch && currentCategory) {
				const learningText = learningMatch[1];
				const learningHash = this.hash(learningText);

				// Add to hash set for deduplication
				hashSet.add(learningHash);
				learnings[currentCategory].push(line);
			}
		}

		return learnings;
	}

	/**
	 * Add a learning for a persona.
	 * Deduplicates based on content hash.
	 */
	add(persona: PersonaName | string, category: string, learning: string): void {
		// Check for duplicate
		const learningHash = this.hash(learning);
		const hashSet = this.getHashSet(persona);

		// Load existing to populate hash set if not already done
		const existing = this.load(persona);

		if (hashSet.has(learningHash)) {
			return; // Duplicate, skip
		}

		// Mark as seen
		hashSet.add(learningHash);

		// Build new content
		const date = new Date().toISOString().split("T")[0];
		const learningLine = `- [${date}] ${learning}`;

		// Add to existing or create new category
		if (!existing[category]) {
			existing[category] = [];
		}
		existing[category].push(learningLine);

		// Write back
		this.writeLearnings(persona, existing);
	}

	/**
	 * Write learnings to file.
	 */
	private writeLearnings(
		persona: PersonaName | string,
		learnings: AgentLearnings,
	): void {
		const learningsPath = this.getLearningsPath(persona);
		const learningsDir = dirname(learningsPath);

		if (!existsSync(learningsDir)) {
			mkdirSync(learningsDir, { recursive: true });
		}

		// Build markdown content
		const personaCapitalized =
			persona.charAt(0).toUpperCase() + persona.slice(1);
		const lines = [`# ${personaCapitalized}'s Learnings`, ""];

		for (const [category, items] of Object.entries(learnings)) {
			lines.push(`## ${category}`);
			for (const item of items) {
				lines.push(item);
			}
			lines.push("");
		}

		writeFileSync(learningsPath, lines.join("\n"));
	}

	/**
	 * Get learnings for a specific category.
	 */
	getByCategory(persona: PersonaName | string, category: string): string[] {
		const learnings = this.load(persona);
		return learnings[category] || [];
	}
}
