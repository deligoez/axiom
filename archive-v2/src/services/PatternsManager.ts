import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export interface Patterns {
	[category: string]: string[];
}

export class PatternsManager {
	private readonly filePath: string;

	constructor(projectDir: string) {
		this.filePath = join(projectDir, ".chorus", "PATTERNS.md");
	}

	/**
	 * Read patterns from PATTERNS.md file
	 */
	read(): Patterns {
		if (!existsSync(this.filePath)) {
			return {};
		}

		const content = readFileSync(this.filePath, "utf-8");
		return this.parse(content);
	}

	/**
	 * Write patterns to PATTERNS.md file
	 */
	write(patterns: Patterns): void {
		const content = this.serialize(patterns);

		// Ensure directory exists
		const dir = dirname(this.filePath);
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}

		writeFileSync(this.filePath, content);
	}

	/**
	 * Add a pattern to a category
	 */
	addPattern(category: string, pattern: string): void {
		const patterns = this.read();

		if (!patterns[category]) {
			patterns[category] = [];
		}

		patterns[category].push(pattern);
		this.write(patterns);
	}

	/**
	 * Get patterns for a specific category
	 */
	getPatternsByCategory(category: string): string[] {
		const patterns = this.read();
		return patterns[category] || [];
	}

	/**
	 * Parse markdown content into patterns object
	 */
	private parse(content: string): Patterns {
		const patterns: Patterns = {};
		let currentCategory: string | null = null;

		const lines = content.split("\n");
		for (const line of lines) {
			// Match ## Category headers
			const categoryMatch = line.match(/^## (.+)$/);
			if (categoryMatch) {
				currentCategory = categoryMatch[1];
				patterns[currentCategory] = [];
				continue;
			}

			// Match - bullet points
			const bulletMatch = line.match(/^- (.+)$/);
			if (bulletMatch && currentCategory) {
				patterns[currentCategory].push(bulletMatch[1]);
			}
		}

		return patterns;
	}

	/**
	 * Serialize patterns object to markdown
	 */
	private serialize(patterns: Patterns): string {
		const lines: string[] = ["# Patterns", ""];

		for (const [category, items] of Object.entries(patterns)) {
			lines.push(`## ${category}`);
			for (const item of items) {
				lines.push(`- ${item}`);
			}
			lines.push("");
		}

		return lines.join("\n");
	}
}
