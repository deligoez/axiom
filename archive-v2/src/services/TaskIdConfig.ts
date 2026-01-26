import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Task ID configuration.
 */
export interface TaskIdConfig {
	prefix: string;
	format: "simple" | "padded";
	paddingWidth?: number;
}

/**
 * Generate a prefix suggestion from project name.
 *
 * Rules:
 * - Single word: take first 2 letters
 * - Multi-word (hyphenated): take first letter of each word
 * - Always lowercase
 */
export function suggestPrefix(projectName: string): string {
	const normalized = projectName.toLowerCase().trim();

	// Check for hyphenated/underscore separated words
	const words = normalized.split(/[-_]+/);

	if (words.length > 1) {
		// Multi-word: take first letter of each word
		return words.map((w) => w.charAt(0)).join("");
	}

	// Single word: take first 2 letters (or less if short)
	return normalized.slice(0, 2);
}

/**
 * Get default configuration.
 */
export function getDefaultConfig(): TaskIdConfig {
	return {
		prefix: "ch",
		format: "simple",
	};
}

/**
 * Save configuration to .chorus/config.json.
 */
export function saveConfig(projectDir: string, config: TaskIdConfig): void {
	const chorusDir = join(projectDir, ".chorus");
	mkdirSync(chorusDir, { recursive: true });

	const configPath = join(chorusDir, "config.json");
	writeFileSync(configPath, JSON.stringify(config, null, "\t"), "utf-8");
}

/**
 * Load configuration from .chorus/config.json.
 * Returns default config if file doesn't exist.
 */
export function loadConfig(projectDir: string): TaskIdConfig {
	const configPath = join(projectDir, ".chorus", "config.json");

	if (!existsSync(configPath)) {
		return getDefaultConfig();
	}

	const content = readFileSync(configPath, "utf-8");
	return JSON.parse(content) as TaskIdConfig;
}
