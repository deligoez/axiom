export interface Task {
	id: string;
	deps: string[];
}

export interface DependencyError {
	type: "circular" | "missing";
	taskId: string;
	cyclePath?: string[];
	missingDep?: string;
}

export interface DependencyResult {
	valid: boolean;
	errors: DependencyError[];
}

export class DependencyChecker {
	private taskMap: Map<string, Task> = new Map();
	private dependentsMap: Map<string, string[]> = new Map();

	/**
	 * Check tasks for dependency issues (cycles, missing deps)
	 */
	check(tasks: Task[]): DependencyResult {
		this.buildGraph(tasks);
		const errors: DependencyError[] = [];

		// Check for missing dependencies
		for (const task of tasks) {
			for (const depId of task.deps) {
				if (!this.taskMap.has(depId)) {
					errors.push({
						type: "missing",
						taskId: task.id,
						missingDep: depId,
					});
				}
			}
		}

		// Check for circular dependencies
		const cycleError = this.detectCycle(tasks);
		if (cycleError) {
			errors.push(cycleError);
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Return tasks in execution order (dependencies first)
	 */
	topologicalSort(tasks: Task[]): string[] {
		this.buildGraph(tasks);

		const result: string[] = [];
		const visited = new Set<string>();
		const visiting = new Set<string>();

		const visit = (taskId: string): void => {
			if (visited.has(taskId)) return;
			if (visiting.has(taskId)) return; // Cycle detected, skip

			visiting.add(taskId);
			const task = this.taskMap.get(taskId);
			if (task) {
				for (const depId of task.deps) {
					visit(depId);
				}
			}
			visiting.delete(taskId);
			visited.add(taskId);
			result.push(taskId);
		};

		for (const task of tasks) {
			visit(task.id);
		}

		return result;
	}

	/**
	 * Get tasks that directly depend on given task
	 */
	getDependents(taskId: string): string[] {
		return this.dependentsMap.get(taskId) || [];
	}

	/**
	 * Get tasks that block the given task (its dependencies)
	 */
	getBlockers(taskId: string): string[] {
		const task = this.taskMap.get(taskId);
		if (!task) return [];
		return [...task.deps];
	}

	/**
	 * Check if a task can start given completed tasks
	 */
	canStart(taskId: string, completedIds: string[]): boolean {
		const task = this.taskMap.get(taskId);
		if (!task) return false;

		const completedSet = new Set(completedIds);
		return task.deps.every((depId) => completedSet.has(depId));
	}

	/**
	 * Build internal graph structures
	 */
	private buildGraph(tasks: Task[]): void {
		this.taskMap.clear();
		this.dependentsMap.clear();

		// Build task map
		for (const task of tasks) {
			this.taskMap.set(task.id, task);
		}

		// Build dependents map (reverse dependency lookup)
		for (const task of tasks) {
			for (const depId of task.deps) {
				const dependents = this.dependentsMap.get(depId) ?? [];
				dependents.push(task.id);
				this.dependentsMap.set(depId, dependents);
			}
		}
	}

	/**
	 * Detect circular dependencies using DFS
	 */
	private detectCycle(tasks: Task[]): DependencyError | null {
		const visited = new Set<string>();
		const path: string[] = [];

		const visit = (taskId: string): DependencyError | null => {
			if (path.includes(taskId)) {
				// Found cycle - extract the cycle path
				const cycleStart = path.indexOf(taskId);
				const cyclePath = [...path.slice(cycleStart), taskId];
				return {
					type: "circular",
					taskId,
					cyclePath,
				};
			}

			if (visited.has(taskId)) return null;

			path.push(taskId);
			const task = this.taskMap.get(taskId);
			if (task) {
				for (const depId of task.deps) {
					if (this.taskMap.has(depId)) {
						const error = visit(depId);
						if (error) return error;
					}
				}
			}
			path.pop();
			visited.add(taskId);
			return null;
		};

		for (const task of tasks) {
			const error = visit(task.id);
			if (error) return error;
		}

		return null;
	}
}
