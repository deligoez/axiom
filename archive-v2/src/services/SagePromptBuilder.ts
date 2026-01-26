/**
 * Sage Prompt Builder Service
 *
 * Builds prompts for Sage to analyze ambiguous cases via Claude.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SageAnalysisResult } from "../types/sage.js";

/** Default Sage persona if prompt.md is missing */
const DEFAULT_SAGE_PERSONA = `You are Sage, the project analyzer.
Your role is to analyze codebase structure and suggest appropriate configurations.
Be precise and provide structured JSON responses.`;

export class SagePromptBuilder {
	private projectDir: string;

	constructor(projectDir: string) {
		this.projectDir = projectDir;
	}

	/**
	 * Build a prompt for Claude to analyze unclear project patterns.
	 * Includes partial analysis results and asks for clarification.
	 */
	buildAnalysisPrompt(partialResult: Partial<SageAnalysisResult>): string {
		const sections: string[] = [];

		// Load Sage persona
		const persona = this.loadSagePersona();
		sections.push(persona);
		sections.push("");

		// Add context section
		sections.push("## Project Analysis Context");
		sections.push("");

		// Include structure summary
		if (partialResult.projectStructure) {
			sections.push("### Detected Structure");
			const struct = partialResult.projectStructure;

			if (struct.sourceDirectories.length > 0) {
				sections.push(
					`- Source directories: ${struct.sourceDirectories.join(", ")}`,
				);
			}
			if (struct.testDirectories.length > 0) {
				sections.push(
					`- Test directories: ${struct.testDirectories.join(", ")}`,
				);
			}
			if (struct.configFiles.length > 0) {
				sections.push(`- Config files: ${struct.configFiles.join(", ")}`);
			}
			if (struct.packageManagers.length > 0) {
				sections.push(
					`- Package managers: ${struct.packageManagers.join(", ")}`,
				);
			}
			if (struct.entryPoints.length > 0) {
				sections.push(`- Entry points: ${struct.entryPoints.join(", ")}`);
			}
			sections.push("");
		}

		// Include detected frameworks
		if (
			partialResult.detectedFrameworks &&
			partialResult.detectedFrameworks.length > 0
		) {
			sections.push("### Detected Frameworks");
			for (const fw of partialResult.detectedFrameworks) {
				sections.push(`- ${fw.name} (${fw.type}): confidence ${fw.confidence}`);
			}
			sections.push("");
		}

		// Add questions for unclear patterns
		sections.push("## Questions");
		sections.push("");

		if (partialResult.projectType === "unknown" || !partialResult.projectType) {
			sections.push(
				"1. What type of project is this? (cli, library, app, web)",
			);
		}

		if (
			!partialResult.detectedFrameworks ||
			partialResult.detectedFrameworks.length === 0
		) {
			sections.push(
				"2. Which testing framework should be used for this project?",
			);
		}

		if (
			partialResult.confidence !== undefined &&
			partialResult.confidence < 0.7
		) {
			sections.push(
				"3. What patterns or conventions does this codebase follow?",
			);
			sections.push(
				"4. Are there any specific build or quality commands to run?",
			);
		}

		sections.push("");

		// Add response format instructions
		sections.push("## Response Format");
		sections.push("");
		sections.push(
			"Please respond with a JSON object containing the following fields:",
		);
		sections.push("```json");
		sections.push("{");
		sections.push('  "projectType": "cli" | "library" | "app" | "web",');
		sections.push('  "testFramework": "vitest" | "jest" | "mocha" | "none",');
		sections.push('  "qualityCommands": [');
		sections.push(
			'    { "name": "test", "command": "npm test", "required": true }',
		);
		sections.push("  ],");
		sections.push('  "confidence": 0.0-1.0,');
		sections.push('  "reasoning": "Brief explanation"');
		sections.push("}");
		sections.push("```");

		return sections.join("\n");
	}

	/**
	 * Load the Sage persona from .chorus/agents/sage/prompt.md.
	 * Falls back to default if not found.
	 */
	private loadSagePersona(): string {
		const personaPath = join(
			this.projectDir,
			".chorus",
			"agents",
			"sage",
			"prompt.md",
		);

		if (existsSync(personaPath)) {
			try {
				return readFileSync(personaPath, "utf-8");
			} catch {
				return DEFAULT_SAGE_PERSONA;
			}
		}

		return DEFAULT_SAGE_PERSONA;
	}
}
