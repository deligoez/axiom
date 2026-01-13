/**
 * Sage Analyzer Service
 *
 * Analyzes project structure, detects frameworks, and suggests quality commands.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ProjectStructure } from "../types/sage.js";

/** Standard source directories to scan for */
const SOURCE_DIRECTORIES = ["src", "lib", "source"];

/** Standard test directories to scan for */
const TEST_DIRECTORIES = ["tests", "test", "__tests__", "spec"];

export class SageAnalyzer {
	private projectDir: string;

	constructor(projectDir: string) {
		this.projectDir = projectDir;
	}

	/**
	 * Analyze the project structure.
	 * Scans for standard directories like src/, tests/, lib/, __tests__.
	 */
	analyzeStructure(): ProjectStructure {
		const sourceDirectories: string[] = [];
		const testDirectories: string[] = [];

		// Scan for source directories
		for (const dir of SOURCE_DIRECTORIES) {
			const dirPath = join(this.projectDir, dir);
			if (existsSync(dirPath)) {
				sourceDirectories.push(dir);
			}
		}

		// Scan for test directories
		for (const dir of TEST_DIRECTORIES) {
			const dirPath = join(this.projectDir, dir);
			if (existsSync(dirPath)) {
				testDirectories.push(dir);
			}
		}

		return {
			rootPath: this.projectDir,
			sourceDirectories,
			testDirectories,
			configFiles: [],
			packageManagers: [],
			entryPoints: [],
		};
	}
}
