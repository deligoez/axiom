/**
 * Persona Manager Service
 *
 * Loads and caches persona files (prompts, rules, skills) from the
 * .chorus/agents/ directory structure.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { PersonaName } from "../types/persona.js";

/**
 * A skill loaded from a persona's skills directory.
 */
export interface Skill {
	/** Skill name (filename without extension) */
	name: string;
	/** Skill content (markdown) */
	content: string;
}

/**
 * Service to load and cache persona configuration files.
 */
export class PersonaManager {
	private projectDir: string;
	private promptCache: Map<string, string | null> = new Map();
	private rulesCache: Map<string, string | null> = new Map();
	private skillsCache: Map<string, Skill[]> = new Map();

	constructor(projectDir: string) {
		this.projectDir = projectDir;
	}

	/**
	 * Load prompt.md for a persona.
	 *
	 * @param persona - Persona name
	 * @returns Prompt content, or null if file doesn't exist
	 */
	loadPrompt(persona: PersonaName | string): string | null {
		if (this.promptCache.has(persona)) {
			return this.promptCache.get(persona) ?? null;
		}

		const promptPath = join(
			this.projectDir,
			".chorus",
			"agents",
			persona,
			"prompt.md",
		);

		let content: string | null = null;
		if (existsSync(promptPath)) {
			content = readFileSync(promptPath, "utf-8");
		}

		this.promptCache.set(persona, content);
		return content;
	}

	/**
	 * Load rules.md for a persona.
	 *
	 * @param persona - Persona name
	 * @returns Rules content, or null if file doesn't exist
	 */
	loadRules(persona: PersonaName | string): string | null {
		if (this.rulesCache.has(persona)) {
			return this.rulesCache.get(persona) ?? null;
		}

		const rulesPath = join(
			this.projectDir,
			".chorus",
			"agents",
			persona,
			"rules.md",
		);

		let content: string | null = null;
		if (existsSync(rulesPath)) {
			content = readFileSync(rulesPath, "utf-8");
		}

		this.rulesCache.set(persona, content);
		return content;
	}

	/**
	 * Load all skills from a persona's skills directory.
	 *
	 * @param persona - Persona name
	 * @returns Array of skills, or empty array if directory doesn't exist
	 */
	loadSkills(persona: PersonaName | string): Skill[] {
		if (this.skillsCache.has(persona)) {
			return this.skillsCache.get(persona) ?? [];
		}

		const skillsDir = join(
			this.projectDir,
			".chorus",
			"agents",
			persona,
			"skills",
		);

		const skills: Skill[] = [];

		if (existsSync(skillsDir)) {
			const files = readdirSync(skillsDir);
			for (const file of files) {
				if (file.endsWith(".md")) {
					const skillPath = join(skillsDir, file);
					const content = readFileSync(skillPath, "utf-8");
					const name = file.replace(/\.md$/, "");
					skills.push({ name, content });
				}
			}
		}

		this.skillsCache.set(persona, skills);
		return skills;
	}

	/**
	 * Clear all caches, forcing files to be re-read on next load.
	 */
	clearCache(): void {
		this.promptCache.clear();
		this.rulesCache.clear();
		this.skillsCache.clear();
	}
}
