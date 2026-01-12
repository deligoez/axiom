import type {
	DependencyChecker,
	Task as DepTask,
} from "./DependencyChecker.js";
import type { SessionLogger } from "./SessionLogger.js";
import type {
	Fix,
	Task,
	ValidationError,
	ValidationRulesEngine,
} from "./ValidationRulesEngine.js";

// Extended task type that combines both interfaces
export interface ValidatorTask extends Task {
	deps: string[];
}

export interface BatchValidationResult {
	tasks: ValidatorTask[];
	valid: boolean;
	errors: ValidationError[];
	warnings: ValidationError[];
	suggestions: string[];
	getFixableTasks: () => ValidatorTask[];
	applyAllFixes: () => ValidatorTask[];
	getCounts: () => { errors: number; warnings: number; suggestions: number };
}

interface TaskValidationData {
	task: ValidatorTask;
	errors: ValidationError[];
	warnings: ValidationError[];
	suggestions: string[];
	fixableErrors: ValidationError[];
}

export interface TaskValidatorOptions {
	rulesEngine: ValidationRulesEngine;
	depChecker: DependencyChecker;
	sessionLogger: SessionLogger;
}

/**
 * TaskValidator validates a batch of tasks using rules engine and dependency checker
 */
export class TaskValidator {
	private readonly rulesEngine: ValidationRulesEngine;
	private readonly depChecker: DependencyChecker;
	private readonly sessionLogger: SessionLogger;

	constructor(options: TaskValidatorOptions) {
		this.rulesEngine = options.rulesEngine;
		this.depChecker = options.depChecker;
		this.sessionLogger = options.sessionLogger;
	}

	/**
	 * Validate all tasks and return aggregated results
	 */
	validateAll(tasks: ValidatorTask[]): BatchValidationResult {
		const taskValidations: TaskValidationData[] = [];
		const allErrors: ValidationError[] = [];
		const allWarnings: ValidationError[] = [];
		const allSuggestions: string[] = [];

		// Run ValidationRulesEngine on each task
		for (const task of tasks) {
			const result = this.rulesEngine.validate(task);

			// Find fixable errors
			const fixableErrors = result.errors.filter((error) =>
				this.rulesEngine.canAutoFix(error),
			);

			taskValidations.push({
				task,
				errors: result.errors,
				warnings: result.warnings,
				suggestions: result.suggestions,
				fixableErrors,
			});

			allErrors.push(...result.errors);
			allWarnings.push(...result.warnings);
			allSuggestions.push(...result.suggestions);
		}

		// Run DependencyChecker on all tasks
		const depTasks: DepTask[] = tasks.map((t) => ({ id: t.id, deps: t.deps }));
		const depResult = this.depChecker.check(depTasks);

		// Convert dependency errors to ValidationErrors
		for (const depError of depResult.errors) {
			const validationError: ValidationError = {
				rule: `dependency-${depError.type}`,
				message:
					depError.type === "circular"
						? `Circular dependency detected: ${depError.cyclePath?.join(" -> ")}`
						: `Missing dependency: ${depError.missingDep}`,
				field: "deps",
			};
			allErrors.push(validationError);
		}

		// Check overall validity
		const valid = allErrors.length === 0;

		// Log validation results
		this.sessionLogger.log({
			mode: "planning",
			eventType: "validation_complete",
			details: {
				taskCount: tasks.length,
				valid,
				errorCount: allErrors.length,
				warningCount: allWarnings.length,
			},
		});

		// Create result object with methods
		const result: BatchValidationResult = {
			tasks,
			valid,
			errors: allErrors,
			warnings: allWarnings,
			suggestions: allSuggestions,

			getFixableTasks: () => {
				return taskValidations
					.filter((tv) => tv.fixableErrors.length > 0)
					.map((tv) => tv.task);
			},

			applyAllFixes: () => {
				const fixedTasks: ValidatorTask[] = [];

				for (const tv of taskValidations) {
					if (tv.fixableErrors.length > 0) {
						let fixedTask = { ...tv.task };

						for (const error of tv.fixableErrors) {
							// Generate a fix for the error
							const fix: Fix = {
								field:
									(error.field as "title" | "description") ?? "description",
								replacement: this.generateFixReplacement(fixedTask, error),
							};
							fixedTask = this.rulesEngine.applyFix(
								fixedTask,
								fix,
							) as ValidatorTask;
						}

						fixedTasks.push(fixedTask);
					}
				}

				return fixedTasks;
			},

			getCounts: () => ({
				errors: allErrors.length,
				warnings: allWarnings.length,
				suggestions: allSuggestions.length,
			}),
		};

		return result;
	}

	/**
	 * Generate replacement text for auto-fix
	 */
	private generateFixReplacement(
		task: ValidatorTask,
		error: ValidationError,
	): string {
		// For description-length errors, truncate the description
		if (error.rule === "description-length" && task.description) {
			return task.description.slice(0, 500) + "...";
		}

		// Default: return original
		return (error.field === "title" ? task.title : task.description) ?? "";
	}
}
