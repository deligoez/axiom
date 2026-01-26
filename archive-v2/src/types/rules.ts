/**
 * Shared Rules Type Definitions
 *
 * Defines the rules/formats that agents should follow for signals,
 * learnings, commits, and task completion protocols.
 */

// Re-export LearningScope from learning.ts for convenience
export type { LearningScope } from "./learning.js";
// Re-export SignalType from signal.ts for convenience
export type { SignalType } from "./signal.js";

/**
 * Rule for how agents should emit signals.
 * Defines format requirements and validation rules.
 */
export interface SignalRule {
	/** Signal type this rule applies to */
	type: import("./signal.js").SignalType;
	/** Description of when to use this signal */
	description: string;
	/** Whether a payload is required */
	payloadRequired: boolean;
	/** Payload format description (if applicable) */
	payloadFormat?: string;
	/** Example usage */
	example: string;
}

/**
 * Rule for how agents should emit learnings.
 * Defines format and categorization requirements.
 */
export interface LearningRule {
	/** Learning scope this rule applies to */
	scope: import("./learning.js").LearningScope;
	/** Description of this learning type */
	description: string;
	/** Category prefix to use */
	categoryPrefix: string;
	/** Whether this type triggers plan review */
	triggersPlanReview: boolean;
	/** Whether this type triggers alerts */
	triggersAlert: boolean;
	/** Example learning */
	example: string;
}

/**
 * Rule for commit message format.
 * Defines conventional commit requirements.
 */
export interface CommitRule {
	/** Commit type (feat, fix, chore, etc.) */
	type: string;
	/** Description of when to use this type */
	description: string;
	/** Whether scope is required */
	scopeRequired: boolean;
	/** Whether breaking changes require ! suffix */
	breakingChangeMarker: boolean;
	/** Format template */
	format: string;
	/** Example commit message */
	example: string;
}

/**
 * Rule for task completion protocol.
 * Defines what constitutes valid completion.
 */
export interface CompletionRule {
	/** Rule identifier */
	id: string;
	/** Human-readable rule description */
	description: string;
	/** Whether this rule is required for completion */
	required: boolean;
	/** How to verify this rule is satisfied */
	verificationMethod: "signal" | "file" | "test" | "manual";
	/** Error message when rule is violated */
	errorMessage: string;
}

/**
 * Combined shared rules configuration.
 * Defines all agent behavior rules in one structure.
 */
export interface SharedRules {
	/** Version of the rules schema */
	version: string;
	/** Signal emission rules */
	signals: SignalRule[];
	/** Learning emission rules */
	learnings: LearningRule[];
	/** Commit message rules */
	commits: CommitRule[];
	/** Task completion rules */
	completion: CompletionRule[];
}
