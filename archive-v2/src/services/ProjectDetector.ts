import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

export type ProjectType = "node" | "php" | "python" | "go" | "rust" | "unknown";

export interface QualityCommand {
	name: string;
	command: string;
	required?: boolean;
	order?: number;
}

const CONFIG_FILES: Record<string, ProjectType> = {
	"package.json": "node",
	"composer.json": "php",
	"pyproject.toml": "python",
	"requirements.txt": "python",
	"go.mod": "go",
	"Cargo.toml": "rust",
};

const DEFAULT_QUALITY_COMMANDS: Record<ProjectType, QualityCommand[]> = {
	node: [
		{ name: "test", command: "npm test", required: true, order: 1 },
		{
			name: "typecheck",
			command: "npm run typecheck",
			required: false,
			order: 2,
		},
		{ name: "lint", command: "npm run lint", required: false, order: 3 },
	],
	php: [
		{ name: "test", command: "vendor/bin/phpunit", required: true, order: 1 },
		{ name: "lint", command: "vendor/bin/phpcs", required: false, order: 2 },
	],
	python: [
		{ name: "test", command: "pytest", required: true, order: 1 },
		{ name: "lint", command: "ruff check .", required: false, order: 2 },
		{ name: "typecheck", command: "mypy .", required: false, order: 3 },
	],
	go: [
		{ name: "test", command: "go test ./...", required: true, order: 1 },
		{ name: "lint", command: "golangci-lint run", required: false, order: 2 },
	],
	rust: [
		{ name: "test", command: "cargo test", required: true, order: 1 },
		{ name: "lint", command: "cargo clippy", required: false, order: 2 },
	],
	unknown: [
		{
			name: "test",
			command: "echo 'No test command configured'",
			required: false,
			order: 1,
		},
	],
};

export class ProjectDetector {
	constructor(private readonly projectDir: string) {}

	/**
	 * Detect project type from configuration files
	 */
	detect(): ProjectType {
		// Check in order of priority
		const checkOrder: (keyof typeof CONFIG_FILES)[] = [
			"package.json",
			"composer.json",
			"pyproject.toml",
			"requirements.txt",
			"go.mod",
			"Cargo.toml",
		];

		for (const file of checkOrder) {
			if (existsSync(join(this.projectDir, file))) {
				return CONFIG_FILES[file];
			}
		}

		return "unknown";
	}

	/**
	 * Suggest quality commands for a project type
	 */
	suggestQualityCommands(type: ProjectType): QualityCommand[] {
		return DEFAULT_QUALITY_COMMANDS[type] || DEFAULT_QUALITY_COMMANDS.unknown;
	}

	/**
	 * Get project name from configuration file or directory
	 */
	getProjectName(): string {
		// Try package.json first
		const packageJsonPath = join(this.projectDir, "package.json");
		if (existsSync(packageJsonPath)) {
			try {
				const content = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
				if (content.name) {
					return content.name;
				}
			} catch {
				// Ignore parse errors
			}
		}

		// Try composer.json
		const composerJsonPath = join(this.projectDir, "composer.json");
		if (existsSync(composerJsonPath)) {
			try {
				const content = JSON.parse(readFileSync(composerJsonPath, "utf-8"));
				if (content.name) {
					return content.name;
				}
			} catch {
				// Ignore parse errors
			}
		}

		// Fall back to directory name
		return basename(this.projectDir);
	}
}
