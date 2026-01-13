/**
 * Rules Validator Functions
 *
 * Validates rule file contents and format.
 * Returns detailed error messages for invalid content.
 */

/**
 * Result of validating a single rule file
 */
export interface ValidationResult {
	valid: boolean;
	errors: string[];
}

/**
 * Result of validating all rule files
 */
export interface AllValidationResult {
	valid: boolean;
	signalTypes: ValidationResult;
	learningFormat: ValidationResult;
	commitFormat: ValidationResult;
	completionProtocol: ValidationResult;
}

/**
 * Input for validating all rule files
 */
export interface RuleFilesInput {
	signalTypes: string;
	learningFormat: string;
	commitFormat: string;
	completionProtocol: string;
}

/**
 * Parse markdown into sections (## headings)
 */
function parseSections(
	content: string,
): Array<{ name: string; content: string }> {
	const sections: Array<{ name: string; content: string }> = [];
	const lines = content.split("\n");
	let currentSection: { name: string; content: string } | null = null;

	for (const line of lines) {
		const match = line.match(/^## (.+)$/);
		if (match) {
			if (currentSection) {
				sections.push(currentSection);
			}
			currentSection = { name: match[1], content: "" };
		} else if (currentSection) {
			currentSection.content += `${line}\n`;
		}
	}

	if (currentSection) {
		sections.push(currentSection);
	}

	return sections;
}

/**
 * Validate a section has required fields
 */
function validateSection(
	sectionName: string,
	content: string,
	requiredFields: string[],
): string[] {
	const errors: string[] = [];

	for (const field of requiredFields) {
		const regex = new RegExp(`- \\*\\*${field}:\\*\\*`, "i");
		if (!regex.test(content)) {
			errors.push(`Section "${sectionName}" missing required field: ${field}`);
		}
	}

	return errors;
}

/**
 * Validate signal-types.md content
 */
export function validateSignalTypes(content: string): ValidationResult {
	const errors: string[] = [];
	const sections = parseSections(content);

	if (sections.length === 0) {
		errors.push("No signal type sections found (expected ## headings)");
		return { valid: false, errors };
	}

	for (const section of sections) {
		const sectionErrors = validateSection(section.name, section.content, [
			"Description",
			"Payload Required",
			"Example",
		]);
		errors.push(...sectionErrors);
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * Validate learning-format.md content
 */
export function validateLearningFormat(content: string): ValidationResult {
	const errors: string[] = [];
	const sections = parseSections(content);

	if (sections.length === 0) {
		errors.push("No learning format sections found (expected ## headings)");
		return { valid: false, errors };
	}

	for (const section of sections) {
		const sectionErrors = validateSection(section.name, section.content, [
			"Description",
			"Category Prefix",
			"Triggers Plan Review",
			"Triggers Alert",
			"Example",
		]);
		errors.push(...sectionErrors);
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * Validate commit-format.md content
 */
export function validateCommitFormat(content: string): ValidationResult {
	const errors: string[] = [];
	const sections = parseSections(content);

	if (sections.length === 0) {
		errors.push("No commit format sections found (expected ## headings)");
		return { valid: false, errors };
	}

	for (const section of sections) {
		const sectionErrors = validateSection(section.name, section.content, [
			"Description",
			"Scope Required",
			"Breaking Change Marker",
			"Format",
			"Example",
		]);
		errors.push(...sectionErrors);
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * Validate completion-protocol.md content
 */
export function validateCompletionProtocol(content: string): ValidationResult {
	const errors: string[] = [];
	const sections = parseSections(content);

	if (sections.length === 0) {
		errors.push("No completion protocol sections found (expected ## headings)");
		return { valid: false, errors };
	}

	for (const section of sections) {
		const sectionErrors = validateSection(section.name, section.content, [
			"Description",
			"Required",
			"Verification Method",
			"Error Message",
		]);
		errors.push(...sectionErrors);
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * Validate all rule files
 */
export function validateAllRules(files: RuleFilesInput): AllValidationResult {
	const signalTypes = validateSignalTypes(files.signalTypes);
	const learningFormat = validateLearningFormat(files.learningFormat);
	const commitFormat = validateCommitFormat(files.commitFormat);
	const completionProtocol = validateCompletionProtocol(
		files.completionProtocol,
	);

	return {
		valid:
			signalTypes.valid &&
			learningFormat.valid &&
			commitFormat.valid &&
			completionProtocol.valid,
		signalTypes,
		learningFormat,
		commitFormat,
		completionProtocol,
	};
}
