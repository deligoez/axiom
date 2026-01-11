export type BeadStatus =
	| "open"
	| "in_progress"
	| "closed"
	| "blocked"
	| "tombstone";
export type BeadType = "task" | "bug" | "feature" | "epic";
export type BeadPriority = 0 | 1 | 2 | 3 | 4; // 0 = highest, 4 = lowest

export interface Bead {
	id: string; // Hash-based ID (e.g., "bd-a1b2")
	title: string;
	status: BeadStatus;
	priority: BeadPriority;
	type: BeadType;
	assignee?: string;
	description?: string;
	created: string; // ISO timestamp
	updated: string; // ISO timestamp
	closed?: string; // ISO timestamp when closed
	closedReason?: string;
	dependencies?: string[]; // IDs of blocking issues
	ephemeral?: boolean; // Temporary issues (wisps)
}

export interface BeadJSONL {
	id: string;
	title: string;
	status: string;
	priority: number;
	type: string;
	assignee?: string;
	description?: string;
	created: string;
	updated: string;
	closed?: string;
	closed_reason?: string;
	dependencies?: string[];
	ephemeral?: boolean;
}
