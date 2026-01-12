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
	getInProgressTasks(): Promise<TaskProviderTask[]>;
	closeTask(id: string, comment?: string): Promise<void>;
	getTaskStatus(id: string): Promise<string | null>;
	updateStatus(id: string, status: string): Promise<void>;
	getTaskLabels(id: string): Promise<string[]>;
	addLabel(id: string, label: string): Promise<void>;
	removeLabel(id: string, label: string): Promise<void>;
	addNote(id: string, note: string): Promise<void>;
	updateTask(id: string, field: string, value: string): Promise<void>;
	updateCustomField(id: string, key: string, value: string): Promise<void>;
}
