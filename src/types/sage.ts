/**
 * Sage Type Definitions
 *
 * Types for the Sage analyzer service that detects project structure,
 * frameworks, and suggests quality commands.
 */

import type { ProjectType } from "./config.js";

/**
 * Type of framework detected (test, build, lint, format, etc.)
 */
export type FrameworkType = "test" | "build" | "lint" | "format" | "bundler";

/**
 * Information about a detected framework in the project.
 */
export interface DetectedFramework {
	/** Framework name (e.g., "vitest", "eslint", "webpack") */
	name: string;
	/** Type of framework */
	type: FrameworkType;
	/** Detected version (if available) */
	version?: string;
	/** Configuration file that revealed this framework */
	configFile?: string;
	/** Confidence level of detection (0-1) */
	confidence: number;
}

/**
 * Structure information about the codebase.
 */
export interface ProjectStructure {
	/** Root path of the project */
	rootPath: string;
	/** Detected source directories (e.g., ["src", "lib"]) */
	sourceDirectories: string[];
	/** Detected test directories (e.g., ["tests", "src/__tests__"]) */
	testDirectories: string[];
	/** Configuration files found (e.g., ["package.json", "tsconfig.json"]) */
	configFiles: string[];
	/** Package managers detected (e.g., ["npm", "pnpm"]) */
	packageManagers: string[];
	/** Entry points if detected (e.g., ["src/index.ts"]) */
	entryPoints: string[];
}

/**
 * A suggested quality command based on detected frameworks.
 */
export interface QualityCommandSuggestion {
	/** Command name (e.g., "test", "lint") */
	name: string;
	/** Full command to run (e.g., "npm test", "npx eslint .") */
	command: string;
	/** Framework that suggested this command */
	source: string;
	/** Confidence level of suggestion (0-1) */
	confidence: number;
	/** Whether this command is required for quality checks */
	required: boolean;
	/** Suggested order in quality pipeline */
	order: number;
}

/**
 * Complete result from Sage analysis.
 */
export interface SageAnalysisResult {
	/** Detected project type */
	projectType: ProjectType;
	/** Codebase structure information */
	projectStructure: ProjectStructure;
	/** Detected frameworks */
	detectedFrameworks: DetectedFramework[];
	/** Suggested quality commands */
	suggestedQualityCommands: QualityCommandSuggestion[];
	/** Overall confidence of analysis (0-1) */
	confidence: number;
	/** Timestamp of analysis */
	analyzedAt: string;
}
