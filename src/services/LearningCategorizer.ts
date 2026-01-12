export type LearningScope = "local" | "cross-cutting" | "architectural";

export interface CategorizationResult {
	scope: LearningScope;
	confidence: "explicit" | "heuristic" | "default";
	matchedPattern?: string;
}

// Cross-cutting patterns - indicate changes needed across multiple components
const CROSS_CUTTING_PATTERNS = [
	"\\ball\\b",
	"\\bevery\\b",
	"\\balways\\b",
	"\\bglobal\\b",
	"\\beverywhere\\b",
	"\\buniversal\\b",
	"\\bacross\\s+the\\s+codebase\\b",
];

// Architectural patterns - indicate high-level design decisions
const ARCHITECTURAL_PATTERNS = [
	"\\barchitecture\\b",
	"\\bdesign\\s+decision\\b",
	"\\bsystem-wide\\b",
	"\\bfundamental\\b",
	"\\bcore\\s+pattern\\b",
	"\\bstructural\\b",
	"\\bparadigm\\b",
];

export class LearningCategorizer {
	private readonly crossCuttingRegex: RegExp;
	private readonly architecturalRegex: RegExp;

	constructor() {
		// Case-insensitive pattern matching
		this.crossCuttingRegex = new RegExp(CROSS_CUTTING_PATTERNS.join("|"), "gi");
		this.architecturalRegex = new RegExp(
			ARCHITECTURAL_PATTERNS.join("|"),
			"gi",
		);
	}

	/**
	 * Categorize learning using heuristics.
	 * Only called when F40.detectScope() returned default 'local'.
	 */
	categorize(text: string): CategorizationResult {
		if (!text || text.trim() === "") {
			return { scope: "local", confidence: "default" };
		}

		// Check architectural first (higher priority)
		const architecturalMatches = this.getArchitecturalMatches(text);
		if (architecturalMatches.length > 0) {
			return {
				scope: "architectural",
				confidence: "heuristic",
				matchedPattern: architecturalMatches[0],
			};
		}

		// Check cross-cutting
		const crossCuttingMatches = this.getCrossCuttingMatches(text);
		if (crossCuttingMatches.length > 0) {
			return {
				scope: "cross-cutting",
				confidence: "heuristic",
				matchedPattern: crossCuttingMatches[0],
			};
		}

		// No heuristic match - return default local
		return { scope: "local", confidence: "default" };
	}

	/**
	 * Check if text contains cross-cutting indicators
	 */
	hasCrossCuttingIndicators(text: string): boolean {
		// Reset regex lastIndex for global pattern
		this.crossCuttingRegex.lastIndex = 0;
		return this.crossCuttingRegex.test(text);
	}

	/**
	 * Check if text contains architectural indicators
	 */
	hasArchitecturalIndicators(text: string): boolean {
		// Reset regex lastIndex for global pattern
		this.architecturalRegex.lastIndex = 0;
		return this.architecturalRegex.test(text);
	}

	/**
	 * Get all matched patterns for debugging/logging
	 */
	getMatchedPatterns(text: string): string[] {
		const crossCutting = this.getCrossCuttingMatches(text);
		const architectural = this.getArchitecturalMatches(text);
		return [...crossCutting, ...architectural];
	}

	/**
	 * Get architectural pattern matches
	 */
	private getArchitecturalMatches(text: string): string[] {
		this.architecturalRegex.lastIndex = 0;
		const allMatches = text.match(this.architecturalRegex);
		return allMatches ? allMatches.map((m) => m.toLowerCase()) : [];
	}

	/**
	 * Get cross-cutting pattern matches
	 */
	private getCrossCuttingMatches(text: string): string[] {
		this.crossCuttingRegex.lastIndex = 0;
		const allMatches = text.match(this.crossCuttingRegex);
		return allMatches ? allMatches.map((m) => m.toLowerCase()) : [];
	}
}
