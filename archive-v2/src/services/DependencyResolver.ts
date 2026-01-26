import type { TaskProvider } from "../types/task-provider.js";

export interface DependencyStatus {
	satisfied: boolean;
	pending: string[];
	inProgress: string[];
	failed: string[];
}

export class DependencyResolver {
	constructor(private taskProvider: TaskProvider) {}

	async check(taskId: string): Promise<DependencyStatus> {
		const task = await this.taskProvider.getTask(taskId);
		if (!task) {
			return {
				satisfied: false,
				pending: [],
				inProgress: [],
				failed: [taskId],
			};
		}

		const dependencies = task.dependencies || [];
		if (dependencies.length === 0) {
			return {
				satisfied: true,
				pending: [],
				inProgress: [],
				failed: [],
			};
		}

		const pending: string[] = [];
		const inProgress: string[] = [];
		const failed: string[] = [];

		for (const depId of dependencies) {
			const dep = await this.taskProvider.getTask(depId);
			if (!dep) {
				failed.push(depId);
			} else if (dep.status === "closed") {
				// satisfied - do nothing
			} else if (dep.status === "in_progress") {
				inProgress.push(depId);
			} else {
				pending.push(depId);
			}
		}

		const satisfied =
			pending.length === 0 && inProgress.length === 0 && failed.length === 0;

		return {
			satisfied,
			pending,
			inProgress,
			failed,
		};
	}

	async getDependencies(taskId: string): Promise<string[]> {
		const task = await this.taskProvider.getTask(taskId);
		if (!task) {
			return [];
		}
		return task.dependencies || [];
	}

	async isDependencySatisfied(depId: string): Promise<boolean> {
		const dep = await this.taskProvider.getTask(depId);
		if (!dep) {
			return false;
		}
		return dep.status === "closed";
	}

	async getDependents(taskId: string): Promise<string[]> {
		const allTasks = await this.taskProvider.getReadyTasks({});
		const dependents: string[] = [];

		for (const task of allTasks) {
			if (task.dependencies?.includes(taskId)) {
				dependents.push(task.id);
			}
		}

		return dependents;
	}

	async hasCircularDependency(taskId: string): Promise<boolean> {
		const visited = new Set<string>();
		return this.detectCycle(taskId, visited, taskId);
	}

	private async detectCycle(
		currentId: string,
		visited: Set<string>,
		originalId: string,
	): Promise<boolean> {
		if (visited.has(currentId)) {
			return currentId === originalId;
		}

		visited.add(currentId);

		const task = await this.taskProvider.getTask(currentId);
		if (!task || !task.dependencies || task.dependencies.length === 0) {
			return false;
		}

		for (const depId of task.dependencies) {
			if (depId === originalId) {
				return true;
			}
			const hasCycle = await this.detectCycle(depId, visited, originalId);
			if (hasCycle) {
				return true;
			}
		}

		return false;
	}
}
