export type ConflictType = "SIMPLE" | "MEDIUM" | "COMPLEX";
export type ResolutionStrategy = "auto" | "rebase" | "agent" | "human";

export interface LineRange {
	startLine: number;
	endLine: number;
}

export interface ConflictInfo {
	file: string;
	ourChanges?: LineRange;
	theirChanges?: LineRange;
	hasSemanticConflict?: boolean;
}

export interface FileClassification {
	file: string;
	type: ConflictType;
}

export interface AnalysisResult {
	files: FileClassification[];
	overallType: ConflictType;
}

// Files that can be auto-resolved
const SIMPLE_FILES = new Set([
	".beads/issues.jsonl",
	"package-lock.json",
	"yarn.lock",
	"pnpm-lock.yaml",
	".agent/learnings.md",
]);

// Patterns for simple files
const SIMPLE_PATTERNS = [/\.generated\./, /\.min\.(js|css)$/, /\.lock$/];

export class ConflictClassifier {
	classifyFile(file: string, conflictInfo?: ConflictInfo): ConflictType {
		// Check for auto-resolvable files
		if (SIMPLE_FILES.has(file)) {
			return "SIMPLE";
		}

		// Check patterns
		for (const pattern of SIMPLE_PATTERNS) {
			if (pattern.test(file)) {
				return "SIMPLE";
			}
		}

		// If no conflict info, default to MEDIUM
		if (!conflictInfo) {
			return "MEDIUM";
		}

		// Check for semantic conflicts
		if (conflictInfo.hasSemanticConflict) {
			return "COMPLEX";
		}

		// Check for overlapping line ranges
		if (conflictInfo.ourChanges && conflictInfo.theirChanges) {
			if (this.hasOverlap(conflictInfo.ourChanges, conflictInfo.theirChanges)) {
				return "COMPLEX";
			}
		}

		// Different sections = MEDIUM
		return "MEDIUM";
	}

	analyze(files: string[], conflictInfos?: ConflictInfo[]): AnalysisResult {
		const classifications: FileClassification[] = files.map((file, index) => {
			const info = conflictInfos?.[index];
			return {
				file,
				type: this.classifyFile(file, info),
			};
		});

		// Overall type is worst-case
		const overallType = this.getOverallType(classifications);

		return {
			files: classifications,
			overallType,
		};
	}

	getSuggestedStrategy(
		type: ConflictType,
		agentFailed = false,
	): ResolutionStrategy {
		if (type === "SIMPLE") {
			return "auto";
		}

		if (type === "MEDIUM") {
			return "rebase";
		}

		// COMPLEX
		if (agentFailed) {
			return "human";
		}
		return "agent";
	}

	getOverallType(classifications: FileClassification[]): ConflictType {
		const types = classifications.map((c) => c.type);

		if (types.includes("COMPLEX")) {
			return "COMPLEX";
		}
		if (types.includes("MEDIUM")) {
			return "MEDIUM";
		}
		return "SIMPLE";
	}

	isAutoResolvable(type: ConflictType): boolean {
		return type === "SIMPLE";
	}

	private hasOverlap(range1: LineRange, range2: LineRange): boolean {
		// Check if ranges overlap
		return (
			range1.startLine <= range2.endLine && range2.startLine <= range1.endLine
		);
	}
}
