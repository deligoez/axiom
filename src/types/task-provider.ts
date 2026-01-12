/**
 * Common task interface used by both BeadsCLI and TaskStoreAdapter.
 */
export interface TaskProviderTask {
	id: string;
	title: string;
	description?: string;
	priority: number;
	status: string;
	labels: string[];
	dependencies: string[];
	custom?: {
		model?: string;
		agent?: string;
		acceptance_criteria?: string[];
	};
}

/**
 * Options for getting ready tasks.
 */
export interface GetReadyOptions {
	excludeLabels?: string[];
	includeLabels?: string[];
}

/**
 * Common interface for task providers (BeadsCLI, TaskStoreAdapter).
 * Allows gradual migration from BeadsCLI to native TaskStore.
 */
export interface TaskProvider {
	getTask(id: string): Promise<TaskProviderTask | null>;
	claimTask(id: string, assignee: string): Promise<void>;
	releaseTask(id: string): Promise<void>;
	getReadyTasks(options?: GetReadyOptions): Promise<TaskProviderTask[]>;
	closeTask(id: string, comment?: string): Promise<void>;
	getTaskStatus(id: string): Promise<string | null>;
}
