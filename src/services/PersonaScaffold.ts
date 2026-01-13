/**
 * Persona Scaffold Service
 *
 * Creates the directory structure and default files for all personas
 * during project initialization.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PERSONAS, type PersonaName } from "../types/persona.js";

/**
 * Service that creates the .chorus/agents/ directory structure
 * with default prompt, rules, and skills for each persona.
 */
export class PersonaScaffold {
	private projectDir: string;

	constructor(projectDir: string) {
		this.projectDir = projectDir;
	}

	/**
	 * Create the full persona directory structure.
	 * Does not overwrite existing files.
	 */
	scaffold(): void {
		const agentsDir = join(this.projectDir, ".chorus", "agents");

		// Create agents directory
		if (!existsSync(agentsDir)) {
			mkdirSync(agentsDir, { recursive: true });
		}

		// Create structure for each persona
		for (const [name] of Object.entries(PERSONAS)) {
			this.scaffoldPersona(name as PersonaName, agentsDir);
		}
	}

	/**
	 * Create directory structure for a single persona.
	 */
	private scaffoldPersona(name: PersonaName, agentsDir: string): void {
		const persona = PERSONAS[name];
		const personaDir = join(agentsDir, name);

		// Create persona directory
		if (!existsSync(personaDir)) {
			mkdirSync(personaDir, { recursive: true });
		}

		// Create skills directory
		const skillsDir = join(personaDir, "skills");
		if (!existsSync(skillsDir)) {
			mkdirSync(skillsDir, { recursive: true });
		}

		// Create rules.md
		const rulesPath = join(personaDir, "rules.md");
		if (!existsSync(rulesPath)) {
			writeFileSync(rulesPath, this.generateDefaultRules(name, persona));
		}

		// Create prompt.md for AI-powered personas
		if (persona.powerSource === "claude") {
			const promptPath = join(personaDir, "prompt.md");
			if (!existsSync(promptPath)) {
				writeFileSync(promptPath, this.generateDefaultPrompt(name, persona));
			}
		}

		// Create config.json for heuristic personas
		if (persona.powerSource === "heuristic") {
			const configPath = join(personaDir, "config.json");
			if (!existsSync(configPath)) {
				writeFileSync(
					configPath,
					JSON.stringify(this.generateDefaultConfig(name, persona), null, 2),
				);
			}
		}
	}

	/**
	 * Generate default prompt content for an AI-powered persona.
	 */
	private generateDefaultPrompt(
		_name: PersonaName,
		persona: (typeof PERSONAS)[PersonaName],
	): string {
		return `# ${persona.displayName}

You are **${persona.displayName}**, an AI agent in the Chorus multi-agent system.

## Role

${persona.description}

## Responsibilities

- Act as the ${persona.role} for the project
- Follow the rules defined in rules.md
- Use available skills when appropriate
- Communicate clearly with other agents

## Guidelines

1. Be precise and thorough in your work
2. Ask for clarification when requirements are unclear
3. Report progress and blockers promptly
4. Follow project coding standards
`;
	}

	/**
	 * Generate default rules content for a persona.
	 */
	private generateDefaultRules(
		_name: PersonaName,
		persona: (typeof PERSONAS)[PersonaName],
	): string {
		return `# ${persona.displayName} Rules

## Core Rules

1. Always follow the project's coding standards
2. Write clean, maintainable code
3. Include tests for new functionality
4. Document significant changes

## ${persona.role.charAt(0).toUpperCase() + persona.role.slice(1)} Specific Rules

Add persona-specific rules here.
`;
	}

	/**
	 * Generate default config for a heuristic persona.
	 */
	private generateDefaultConfig(
		_name: PersonaName,
		persona: (typeof PERSONAS)[PersonaName],
	): object {
		return {
			name: persona.name,
			displayName: persona.displayName,
			role: persona.role,
			enabled: true,
			settings: {},
		};
	}
}
