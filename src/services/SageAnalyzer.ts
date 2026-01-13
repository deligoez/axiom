/**
 * Sage Analyzer Service
 *
 * Analyzes project structure, detects frameworks, and suggests quality commands.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ProjectStructure } from "../types/sage.js";

/** Config files to scan for */
const CONFIG_FILES = [
	"tsconfig.json",
	"biome.json",
	".eslintrc",
	".eslintrc.js",
	".eslintrc.json",
	".prettierrc",
];

/** Result from analyzing package.json */
export interface PackageJsonInfo {
	name?: string;
	scripts?: Record<string, string>;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
}

/** Result from analyzing config files */
export interface ConfigAnalysisResult {
	configFiles: string[];
	tsconfigStrict?: boolean;
}

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

	/**
	 * Analyze package.json file.
	 * Returns parsed info or null if missing.
	 */
	analyzePackageJson(): PackageJsonInfo | null {
		const packagePath = join(this.projectDir, "package.json");

		if (!existsSync(packagePath)) {
			return null;
		}

		try {
			const content = readFileSync(packagePath, "utf-8");
			const pkg = JSON.parse(content);

			return {
				name: pkg.name,
				scripts: pkg.scripts,
				dependencies: pkg.dependencies,
				devDependencies: pkg.devDependencies,
			};
		} catch {
			return null;
		}
	}

	/**
	 * Analyze README.md file.
	 * Returns first 500 chars or null if missing.
	 */
	analyzeReadme(): string | null {
		// Try different README filenames
		const readmeNames = ["README.md", "readme.md", "README", "Readme.md"];

		for (const name of readmeNames) {
			const readmePath = join(this.projectDir, name);
			if (existsSync(readmePath)) {
				try {
					const content = readFileSync(readmePath, "utf-8");
					return content.substring(0, 500);
				} catch {
					return null;
				}
			}
		}

		return null;
	}

	/**
	 * Analyze config files in the project.
	 * Detects tsconfig.json, biome.json, .eslintrc, etc.
	 */
	analyzeConfigs(): ConfigAnalysisResult {
		const configFiles: string[] = [];
		let tsconfigStrict: boolean | undefined;

		// Scan for config files
		for (const configFile of CONFIG_FILES) {
			const configPath = join(this.projectDir, configFile);
			if (existsSync(configPath)) {
				configFiles.push(configFile);

				// Extract strict mode from tsconfig
				if (configFile === "tsconfig.json") {
					try {
						const content = readFileSync(configPath, "utf-8");
						const tsconfig = JSON.parse(content);
						tsconfigStrict = tsconfig?.compilerOptions?.strict === true;
					} catch {
						// Ignore parse errors
					}
				}
			}
		}

		return {
			configFiles,
			tsconfigStrict,
		};
	}
}
