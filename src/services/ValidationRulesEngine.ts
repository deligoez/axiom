export interface Task {
	id: string;
	title: string;
	description?: string;
	acceptanceCriteria?: string[];
	files?: string[];
}

export interface ValidationError {
	rule: string;
	message: string;
	field?: string;
}

export interface ValidationResult {
	errors: ValidationError[];
	warnings: ValidationError[];
	suggestions: string[];
}

export interface ValidationRulesConfig {
	maxAcceptanceCriteria: number;
	maxDescriptionLength: number;
	maxContextSize: number;
	requireTestFile?: boolean;
	enforceNaming?: string;
	forbiddenWords?: string[];
}

export interface Fix {
	field: "title" | "description";
	replacement: string;
}

// Vague words that indicate non-testable criteria
const VAGUE_WORDS = [
	"correctly",
	"properly",
	"appropriately",
	"works",
	"handles",
	"good",
	"nice",
	"better",
	"improved",
];

// Action verbs for detecting multiple responsibilities
const ACTION_VERBS = [
	"create",
	"update",
	"delete",
	"add",
	"remove",
	"build",
	"implement",
	"fix",
	"refactor",
	"validate",
	"submit",
	"fetch",
	"process",
	"transform",
	"configure",
	"setup",
	"initialize",
	"render",
	"display",
	"show",
];

/**
 * ValidationRulesEngine validates tasks against configurable rules
 */
export class ValidationRulesEngine {
	private readonly config: ValidationRulesConfig;

	constructor(config: ValidationRulesConfig) {
		this.config = config;
	}

	/**
	 * Validate a task against all rules
	 */
	validate(task: Task): ValidationResult {
		const errors: ValidationError[] = [];
		const warnings: ValidationError[] = [];
		const suggestions: string[] = [];

		// Built-in rules (always run)
		this.checkAtomic(task, warnings);
		this.checkTestable(task, warnings);
		this.checkRightSized(task, errors);
		this.checkDescriptionLength(task, errors);
		this.checkContextFit(task, warnings);

		// Configurable rules
		if (this.config.enforceNaming) {
			this.checkNamingPattern(task, errors);
		}

		if (this.config.forbiddenWords && this.config.forbiddenWords.length > 0) {
			this.checkForbiddenWords(task, warnings);
		}

		if (this.config.requireTestFile) {
			this.checkTestFileReference(task, errors);
		}

		return { errors, warnings, suggestions };
	}

	/**
	 * Suggest a fix for a validation error
	 */
	suggestFix(error: ValidationError): string {
		switch (error.rule) {
			case "atomic":
				return "Consider breaking this task into smaller, single-responsibility tasks";
			case "testable":
				return "Replace vague language with specific, measurable criteria";
			case "right-sized":
				return "Reduce the number of acceptance criteria or split into subtasks";
			case "description-length":
				return "Shorten the description or extract details to acceptance criteria";
			case "context-fit":
				return "Consider splitting into smaller tasks that fit within context limits";
			case "naming-pattern":
				return `Rename task to match pattern: ${this.config.enforceNaming}`;
			case "forbidden-words":
				return "Remove or replace the forbidden words";
			case "require-test-file":
				return "Add a test file reference (e.g., 'tests/feature.test.ts')";
			default:
				return "Review and fix the issue manually";
		}
	}

	/**
	 * Check if an error can be automatically fixed
	 */
	canAutoFix(error: ValidationError): boolean {
		// Most validation errors require human judgment
		return error.rule === "description-length";
	}

	/**
	 * Apply a fix to a task
	 */
	applyFix(task: Task, fix: Fix): Task {
		return {
			...task,
			[fix.field]: fix.replacement,
		};
	}

	/**
	 * Check for multiple responsibilities (atomic rule)
	 */
	private checkAtomic(task: Task, warnings: ValidationError[]): void {
		const text = `${task.title} ${task.description ?? ""}`.toLowerCase();
		const foundVerbs = ACTION_VERBS.filter((verb) => text.includes(verb));

		// Multiple distinct action verbs suggest multiple responsibilities
		if (foundVerbs.length > 2) {
			warnings.push({
				rule: "atomic",
				message: `Task may have multiple responsibilities (found actions: ${foundVerbs.join(", ")})`,
				field: "title",
			});
		}

		// Check for "and" connecting actions
		const andPattern = /\b(create|add|update|delete|build)\s+.*?\s+and\s+/i;
		if (andPattern.test(task.title)) {
			warnings.push({
				rule: "atomic",
				message:
					"Task title suggests multiple responsibilities connected by 'and'",
				field: "title",
			});
		}
	}

	/**
	 * Check for vague, non-testable language
	 */
	private checkTestable(task: Task, warnings: ValidationError[]): void {
		const text = `${task.title} ${task.description ?? ""}`.toLowerCase();

		for (const vague of VAGUE_WORDS) {
			if (text.includes(vague)) {
				warnings.push({
					rule: "testable",
					message: `Task contains vague language ("${vague}") that is not testable`,
					field: "description",
				});
				break; // Only report once
			}
		}
	}

	/**
	 * Check acceptance criteria count
	 */
	private checkRightSized(task: Task, errors: ValidationError[]): void {
		const criteriaCount = task.acceptanceCriteria?.length ?? 0;

		if (criteriaCount > this.config.maxAcceptanceCriteria) {
			errors.push({
				rule: "right-sized",
				message: `Too many acceptance criteria (${criteriaCount} > ${this.config.maxAcceptanceCriteria})`,
				field: "acceptanceCriteria",
			});
		}
	}

	/**
	 * Check description length
	 */
	private checkDescriptionLength(task: Task, errors: ValidationError[]): void {
		const descLength = task.description?.length ?? 0;

		if (descLength > this.config.maxDescriptionLength) {
			errors.push({
				rule: "description-length",
				message: `Description is too long (${descLength} > ${this.config.maxDescriptionLength} chars)`,
				field: "description",
			});
		}
	}

	/**
	 * Check if task fits within context window
	 */
	private checkContextFit(task: Task, warnings: ValidationError[]): void {
		// Estimate total size: title + description + criteria + some overhead
		const titleSize = task.title.length;
		const descSize = task.description?.length ?? 0;
		const criteriaSize = (task.acceptanceCriteria ?? []).join("\n").length;
		const totalSize = titleSize + descSize + criteriaSize;

		if (totalSize > this.config.maxContextSize) {
			warnings.push({
				rule: "context-fit",
				message: `Task size (${totalSize}) may exceed context window limit (${this.config.maxContextSize})`,
				field: "description",
			});
		}
	}

	/**
	 * Check naming pattern
	 */
	private checkNamingPattern(task: Task, errors: ValidationError[]): void {
		if (!this.config.enforceNaming) return;

		const pattern = new RegExp(this.config.enforceNaming);
		if (!pattern.test(task.title)) {
			errors.push({
				rule: "naming-pattern",
				message: `Task title does not match required pattern: ${this.config.enforceNaming}`,
				field: "title",
			});
		}
	}

	/**
	 * Check for forbidden words
	 */
	private checkForbiddenWords(task: Task, warnings: ValidationError[]): void {
		const text = `${task.title} ${task.description ?? ""}`.toLowerCase();
		const found: string[] = [];

		for (const word of this.config.forbiddenWords ?? []) {
			if (text.includes(word.toLowerCase())) {
				found.push(word);
			}
		}

		if (found.length > 0) {
			warnings.push({
				rule: "forbidden-words",
				message: `Task contains forbidden words: ${found.join(", ")}`,
				field: "description",
			});
		}
	}

	/**
	 * Check for test file reference
	 */
	private checkTestFileReference(task: Task, errors: ValidationError[]): void {
		const text = `${task.title} ${task.description ?? ""} ${(task.files ?? []).join(" ")}`;
		const hasTestRef = /\.(test|spec)\.(ts|tsx|js|jsx)/.test(text);

		if (!hasTestRef) {
			errors.push({
				rule: "require-test-file",
				message: "Task does not reference a test file (required by config)",
				field: "files",
			});
		}
	}
}
