/**
 * Task types for Native TaskStore.
 * Replaces Bead types with casual, everyday status names.
 */

// ─────────────────────────────────────────────────────────
// Status & Type Enums
// ─────────────────────────────────────────────────────────

/**
 * Task status - casual, everyday names.
 * These are hardcoded - Chorus has specific lifecycle needs.
 */
export type TaskStatus =
	| "todo" // Yapılacak - Ready to work
	| "doing" // Yapılıyor - Agent working on it
	| "done" // Tamam - Completed successfully
	| "stuck" // Takıldı - Has unmet dependencies
	| "later" // Sonra - Deferred, not for now
	| "failed" // Başarısız - Agent couldn't complete
	| "review"; // İnceleniyor - Awaiting human review

/**
 * Task type - optional, defaults to 'task'.
 * Kept for familiarity but rarely used in practice.
 */
export type TaskType = "task" | "bug" | "feature" | "chore";

// ─────────────────────────────────────────────────────────
// Execution Stats
// ─────────────────────────────────────────────────────────

/**
 * Execution statistics - what happened when agent worked on task.
 */
export interface TaskExecution {
	// Timing
	startedAt?: string; // When first claimed
	completedAt?: string; // When done
	durationMs?: number; // completedAt - startedAt

	// Iteration tracking
	iterations: number; // Ralph loop iterations
	retryCount: number; // How many times restarted after crash/failure

	// Worktree context (task-based, not agent-based)
	worktree?: string; // .worktrees/claude-ch-xxx
	branch?: string; // agent/claude/ch-xxx

	// Results
	finalCommit?: string; // Last commit hash
	testsPassed?: number; // Tests passed at completion
	testsTotal?: number; // Total tests
	qualityPassed?: boolean; // npm run quality passed

	// Code changes
	codeChanges?: {
		filesChanged: number;
		linesAdded: number;
		linesRemoved: number;
	};

	// Failure tracking
	lastError?: string; // Error message if failed
	failedAt?: string; // When it failed

	// Signals received from agent
	signals?: string[]; // ['PROGRESS:50', 'COMPLETE']
}

// ─────────────────────────────────────────────────────────
// Main Task Interface
// ─────────────────────────────────────────────────────────

/**
 * Task - the main work unit in TaskStore.
 */
export interface Task {
	// ─────────────────────────────────────────────────────────
	// Identity
	// ─────────────────────────────────────────────────────────
	id: string; // Sequential: "ch-1", "ch-2", etc.
	title: string;
	description?: string; // Markdown - what to do (prose)

	// ─────────────────────────────────────────────────────────
	// Classification (simplified - NO priority)
	// ─────────────────────────────────────────────────────────
	status: TaskStatus;
	type: TaskType; // Defaults to 'task'
	tags: string[]; // ["m12-tui", "critical", "refactor"]

	// ─────────────────────────────────────────────────────────
	// Dependencies
	// ─────────────────────────────────────────────────────────
	dependencies: string[]; // IDs of blocking tasks

	// ─────────────────────────────────────────────────────────
	// Agent Configuration (flat, not under custom)
	// ─────────────────────────────────────────────────────────
	assignee?: string; // Agent ID when claimed
	model?: string; // "opus-4.5", "sonnet" - override default
	acceptanceCriteria?: string[]; // Structured list for agent verification

	// ─────────────────────────────────────────────────────────
	// Timestamps (core)
	// ─────────────────────────────────────────────────────────
	createdAt: string; // ISO 8601
	updatedAt: string; // ISO 8601

	// ─────────────────────────────────────────────────────────
	// Execution Stats (Chorus tracks agent work)
	// ─────────────────────────────────────────────────────────
	execution?: TaskExecution;

	// ─────────────────────────────────────────────────────────
	// Review Summary (in-task, detail in separate file)
	// ─────────────────────────────────────────────────────────
	reviewCount: number;
	lastReviewedAt?: string;
	reviewResult?: "approved" | "rejected" | "revision";

	// ─────────────────────────────────────────────────────────
	// Learning Summary (in-task, detail in separate file)
	// ─────────────────────────────────────────────────────────
	learningsCount: number;
	hasLearnings: boolean;

	// ─────────────────────────────────────────────────────────
	// Optimistic Locking
	// ─────────────────────────────────────────────────────────
	version: number; // Incremented on every update, starts at 1
}

// ─────────────────────────────────────────────────────────
// JSONL Storage Format
// ─────────────────────────────────────────────────────────

/**
 * Storage format - snake_case for JSONL file.
 * Converted to/from Task interface when reading/writing.
 */
export interface TaskJSONL {
	id: string;
	title: string;
	description?: string;
	status: string;
	type: string;
	tags?: string[];
	dependencies?: string[];
	assignee?: string;
	model?: string;
	acceptance_criteria?: string[];
	created_at: string;
	updated_at: string;
	execution?: {
		started_at?: string;
		completed_at?: string;
		duration_ms?: number;
		iterations: number;
		retry_count: number;
		worktree?: string;
		branch?: string;
		final_commit?: string;
		tests_passed?: number;
		tests_total?: number;
		quality_passed?: boolean;
		code_changes?: {
			files_changed: number;
			lines_added: number;
			lines_removed: number;
		};
		last_error?: string;
		failed_at?: string;
		signals?: string[];
	};
	review_count: number;
	last_reviewed_at?: string;
	review_result?: string;
	learnings_count: number;
	has_learnings: boolean;
	version: number;
}

// ─────────────────────────────────────────────────────────
// Computed Properties (not stored)
// ─────────────────────────────────────────────────────────

/**
 * Task with computed properties - calculated at query time.
 */
export interface TaskWithComputed extends Task {
	isBlocked: boolean; // Has unmet dependencies
	isReady: boolean; // status=todo AND no unmet deps
	dependents: string[]; // Tasks that depend on this one
	blockedBy: string[]; // Unmet dependency IDs
}

// ─────────────────────────────────────────────────────────
// Input Types for TaskStore
// ─────────────────────────────────────────────────────────

/**
 * Input for creating a new task.
 */
export interface CreateTaskInput {
	title: string;
	description?: string;
	type?: TaskType; // Defaults to 'task'
	tags?: string[];
	dependencies?: string[];
	model?: string;
	acceptanceCriteria?: string[];
}

/**
 * Input for updating an existing task.
 */
export interface UpdateTaskInput {
	title?: string;
	description?: string;
	status?: TaskStatus;
	type?: TaskType;
	tags?: string[];
	dependencies?: string[];
	assignee?: string;
	model?: string;
	acceptanceCriteria?: string[];
}

/**
 * Filters for querying tasks.
 */
export interface TaskFilters {
	status?: TaskStatus | TaskStatus[];
	type?: TaskType | TaskType[];
	tags?: string[]; // Match ANY of these tags
	excludeTags?: string[]; // Exclude if ANY of these tags
	assignee?: string;
}

/**
 * Context for intelligent task selection.
 */
export interface TaskSelectionContext {
	lastCompletedTaskId?: string; // For series continuation
	preferredTags?: string[]; // Optional tag preferences
	excludeIds?: string[]; // Tasks to skip (for parallel agents)
}
