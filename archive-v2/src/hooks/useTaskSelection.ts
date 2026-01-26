import { useInput } from "ink";
import { useCallback, useState } from "react";
import type { TaskProviderTask } from "../types/task-provider.js";

const getIsTTY = () => Boolean(process.stdin?.isTTY);

export interface UseTaskSelectionOptions {
	tasks: TaskProviderTask[];
	deferredTasks?: TaskProviderTask[];
	hasRunningAgents?: boolean;
	onSpawnAgent?: (taskId: string) => void;
	isActive?: boolean;
}

export interface UseTaskSelectionResult {
	/** Selected task ID or null */
	selectedTaskId: string | null;
	/** Select a specific task by ID */
	selectTask: (id: string) => void;
	/** Select next task (cycles at end) */
	selectNext: () => void;
	/** Select previous task (cycles at start) */
	selectPrevious: () => void;
	/** Whether assignment is allowed */
	canAssign: boolean;
	/** Assign the selected task to an agent */
	assignSelected: () => void;
}

/**
 * useTaskSelection - Task navigation and selection hook
 *
 * Provides:
 * - Task selection state
 * - j/k navigation through tasks
 * - Enter to assign selected task
 * - Wrapping navigation at list boundaries
 */
export function useTaskSelection({
	tasks,
	deferredTasks = [],
	hasRunningAgents = false,
	onSpawnAgent,
	isActive = true,
}: UseTaskSelectionOptions): UseTaskSelectionResult {
	const [selectedIndex, setSelectedIndex] = useState<number>(-1);

	const selectedTaskId =
		selectedIndex >= 0 && selectedIndex < tasks.length
			? tasks[selectedIndex].id
			: null;

	const selectTask = useCallback(
		(id: string) => {
			const index = tasks.findIndex((t) => t.id === id);
			if (index >= 0) {
				setSelectedIndex(index);
			}
		},
		[tasks],
	);

	const selectNext = useCallback(() => {
		if (tasks.length === 0) return;
		setSelectedIndex((current) => {
			if (current === -1) return 0;
			return (current + 1) % tasks.length;
		});
	}, [tasks.length]);

	const selectPrevious = useCallback(() => {
		if (tasks.length === 0) return;
		setSelectedIndex((current) => {
			if (current === -1) return tasks.length - 1;
			return (current - 1 + tasks.length) % tasks.length;
		});
	}, [tasks.length]);

	// Can assign when: has selected task, not running agents, task not deferred
	const canAssign =
		selectedTaskId !== null &&
		!hasRunningAgents &&
		!deferredTasks.some((t) => t.id === selectedTaskId);

	const assignSelected = useCallback(() => {
		if (!canAssign || !selectedTaskId) return;
		onSpawnAgent?.(selectedTaskId);
	}, [canAssign, selectedTaskId, onSpawnAgent]);

	// Handle keyboard input
	useInput(
		(input, key) => {
			if (input === "j") {
				selectNext();
			} else if (input === "k") {
				selectPrevious();
			} else if (key.return && canAssign) {
				assignSelected();
			}
		},
		{ isActive: isActive && getIsTTY() },
	);

	return {
		selectedTaskId,
		selectTask,
		selectNext,
		selectPrevious,
		canAssign,
		assignSelected,
	};
}
