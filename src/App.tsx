import { existsSync } from "node:fs";
import { join } from "node:path";
// biome-ignore lint/style/useImportType: React must be in scope for tsx JSX runtime (not a type import)
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useChorusMachine } from "./hooks/useChorusMachine.js";
import { ImplementationMode } from "./modes/ImplementationMode.js";
import { InitMode } from "./modes/InitMode.js";
import { PlanningMode } from "./modes/PlanningMode.js";
import { ReviewLoop } from "./modes/ReviewLoop.js";
import { PlanningState } from "./services/PlanningState.js";
import { TaskStore } from "./services/TaskStore.js";
import type { Task, TaskStatus } from "./types/task.js";
import type { TaskProviderTask } from "./types/task-provider.js";

/** UI status format expected by TaskPanel */
type UIStatus =
	| "open"
	| "in_progress"
	| "closed"
	| "blocked"
	| "reviewing"
	| "failed";

/**
 * Map TaskStore statuses to UI statuses.
 * TaskStore uses: todo, doing, done, stuck, review, failed
 * UI expects: open, in_progress, closed, blocked, reviewing, failed
 */
function mapStatusToUI(status: TaskStatus): UIStatus {
	switch (status) {
		case "todo":
			return "open";
		case "doing":
			return "in_progress";
		case "done":
			return "closed";
		case "stuck":
			return "blocked";
		case "review":
			return "reviewing";
		case "failed":
			return "failed";
		default:
			return "open";
	}
}

export interface AppProps {
	projectRoot: string;
}

/**
 * App Router - XState-based mode selection and routing
 *
 * Reads from ChorusMachine state to determine which mode to render.
 * Does NOT manage routing state directly - all transitions happen via machine events.
 */
export function App({ projectRoot }: AppProps): React.ReactElement {
	const { snapshot, send } = useChorusMachine({
		config: { projectRoot },
	});

	// Create TaskStore instance (memoized to avoid recreating on every render)
	const taskStore = useMemo(() => new TaskStore(projectRoot), [projectRoot]);

	// Load and watch tasks (converted to TaskProviderTask format)
	const [tasks, setTasks] = useState<TaskProviderTask[]>([]);

	useEffect(() => {
		// Helper to convert Task to TaskProviderTask
		const convertToTaskProviderTask = (task: Task): TaskProviderTask => ({
			id: task.id,
			title: task.title,
			description: task.description,
			priority: 1, // TaskStore doesn't have priority, default to P1
			status: mapStatusToUI(task.status),
			labels: task.tags,
			dependencies: task.dependencies,
			custom: {
				model: task.model,
				agent: task.assignee,
				acceptance_criteria: task.acceptanceCriteria,
			},
		});

		// Store handler reference for cleanup
		const changeHandler = (newTasks: Task[]) => {
			setTasks(newTasks.map(convertToTaskProviderTask));
		};

		// Initial load (async)
		const initializeStore = async () => {
			await taskStore.load();
			setTasks(taskStore.list().map(convertToTaskProviderTask));

			// Watch for changes
			taskStore.on("change", changeHandler);

			// Start watching file for external changes
			await taskStore.watch();
		};

		initializeStore();

		return () => {
			// Remove listener before stopping
			taskStore.off("change", changeHandler);
			taskStore.stop();
		};
	}, [taskStore]);

	// Track if initialization has run (ref persists across renders)
	const hasInitialized = useRef(false);

	// Initialize state synchronously on first render
	// This runs during render to work with ink-testing-library which doesn't flush effects
	if (!hasInitialized.current) {
		hasInitialized.current = true;

		// Check if .chorus/ exists
		const chorusDir = join(projectRoot, ".chorus");
		if (!existsSync(chorusDir)) {
			send({ type: "INIT_REQUIRED" });
		} else {
			// Try to restore from planning-state.json
			const planningState = new PlanningState(projectRoot);
			const savedState = planningState.load();

			if (savedState) {
				send({ type: "RESTORE_STATE", state: savedState });
			} else {
				// Default to planning if no saved state
				send({ type: "FORCE_PLANNING" });
			}
		}
	}

	// Route based on machine state
	if (snapshot.matches({ app: "init" })) {
		return (
			<InitMode
				projectDir={projectRoot}
				onComplete={() =>
					send({ type: "CONFIG_COMPLETE", config: { projectRoot } })
				}
			/>
		);
	}

	if (snapshot.matches({ app: "planning" })) {
		return (
			<PlanningMode onModeSwitch={(mode) => send({ type: "SET_MODE", mode })} />
		);
	}

	if (snapshot.matches({ app: "review" })) {
		return (
			<ReviewLoop
				tasks={[]}
				validator={{
					validateAll: () => ({
						tasks: [],
						valid: true,
						errors: [],
						warnings: [],
						suggestions: [],
						getFixableTasks: () => [],
						applyAllFixes: () => [],
						getCounts: () => ({ errors: 0, warnings: 0, suggestions: 0 }),
					}),
				}}
				planningState={{ save: () => {} }}
				maxIterations={5}
				onEvent={(e) => send(e as Parameters<typeof send>[0])}
			/>
		);
	}

	if (snapshot.matches({ app: "implementation" })) {
		return (
			<ImplementationMode
				mode="semi-auto"
				tasks={tasks}
				agents={[]}
				maxAgents={4}
				onPlanningMode={() => send({ type: "FORCE_PLANNING" })}
				onToggleMode={() =>
					send({
						type: "SET_MODE",
						mode: "autopilot",
					})
				}
				onExit={() => process.exit(0)}
			/>
		);
	}

	// Fallback - should not reach here
	return (
		<InitMode
			projectDir={projectRoot}
			onComplete={() =>
				send({ type: "CONFIG_COMPLETE", config: { projectRoot } })
			}
		/>
	);
}
