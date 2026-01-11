/**
 * Learning scope determines workflow behavior:
 * - local: Only affects this task (no triggers)
 * - cross-cutting: Affects multiple features (triggers Plan Review)
 * - architectural: Fundamental design decision (triggers Plan Review + Alert)
 */
export type LearningScope = "local" | "cross-cutting" | "architectural";

/**
 * Agent type for source tracking
 */
export type AgentType = "claude" | "codex" | "opencode";

/**
 * Source information for a learning
 */
export interface LearningSource {
	taskId: string;
	agentType: AgentType;
	timestamp: Date;
}

/**
 * A captured learning from agent execution
 */
export interface Learning {
	id: string;
	content: string;
	scope: LearningScope;
	category: string;
	source: LearningSource;
	suggestPattern: boolean;
}

/**
 * Agent scratchpad for intermediate notes
 */
export interface Scratchpad {
	path: string;
	content: string;
	modifiedAt: Date;
}

/**
 * File containing learnings
 */
export interface LearningsFile {
	path: string;
	learnings: Learning[];
}

/**
 * Metadata for deduplication and review tracking
 */
export interface LearningsMeta {
	path: string;
	hashes: Set<string>;
	reviewed: Set<string>;
	lastUpdated: Date;
}
