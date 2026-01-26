import type { Signal } from "./signal.js";

/**
 * Review mode determines how task completions are reviewed
 */
export type ReviewMode = "per-task" | "batch" | "auto-approve" | "skip";

/**
 * File change type
 */
export type FileChangeType = "added" | "modified" | "deleted";

/**
 * A single file change in a task completion
 */
export interface FileChange {
	path: string;
	type: FileChangeType;
	linesAdded: number;
	linesRemoved: number;
}

/**
 * Result of a single quality check run
 */
export interface QualityRunResult {
	name: string;
	passed: boolean;
	duration: number;
	error?: string;
}

/**
 * Label rule for determining review mode based on task labels
 */
export interface LabelRule {
	label: string;
	mode: ReviewMode;
}

/**
 * Auto-approve settings
 */
export interface AutoApproveSettings {
	enabled: boolean;
	maxIterations: number;
	requireQualityPass: boolean;
}

/**
 * Configuration for the review system
 */
export interface ReviewConfig {
	defaultMode: ReviewMode;
	autoApprove: AutoApproveSettings;
	labelRules: LabelRule[];
}

/**
 * Result of a completed task
 */
export interface TaskCompletionResult {
	taskId: string;
	agentId: string;
	iterations: number;
	duration: number;
	signal: Signal | null;
	quality: QualityRunResult[];
	changes: FileChange[];
}

/**
 * Type of feedback entry
 */
export type FeedbackType = "approve" | "redo" | "reject" | "comment";

/**
 * A single feedback entry in the history
 */
export interface FeedbackEntry {
	type: FeedbackType;
	message: string;
	timestamp: string;
	reviewer?: string;
}

/**
 * Feedback history for a task
 */
export interface TaskFeedback {
	taskId: string;
	history: FeedbackEntry[];
}
