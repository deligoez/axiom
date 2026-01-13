import { existsSync } from "node:fs";
import { join } from "node:path";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChorusMachine } from "./hooks/useChorusMachine.js";
import { ImplementationMode } from "./modes/ImplementationMode.js";
import { InitMode } from "./modes/InitMode.js";
import { PlanningMode } from "./modes/PlanningMode.js";
import { ReviewLoop } from "./modes/ReviewLoop.js";
import { PlanningState } from "./services/PlanningState.js";
import { TaskStore } from "./services/TaskStore.js";
import type { Task } from "./types/task.js";
import type { TaskProviderTask } from "./types/task-provider.js";

export interface CliArgs {
	command?: "init" | "plan";
	mode?: "semi-auto" | "autopilot";
}

export interface AppProps {
	projectRoot: string;
	cliArgs?: CliArgs;
}

/**
 * App Router - XState-based mode selection and routing
 *
 * Reads from ChorusMachine state to determine which mode to render.
 * Does NOT manage routing state directly - all transitions happen via machine events.
 */
export function App({ projectRoot, cliArgs }: AppProps): React.ReactElement {
	const { snapshot, send } = useChorusMachine({
		config: { projectRoot },
	});

	// Track if initialization has run (ref persists across renders)
	const hasInitialized = useRef(false);

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
			status: task.status,
			labels: task.tags,
			dependencies: task.dependencies,
			custom: {
				model: task.model,
				agent: task.assignee,
				acceptance_criteria: task.acceptanceCriteria,
			},
		});

		// Initial load (async)
		const initializeStore = async () => {
			await taskStore.load();
			setTasks(taskStore.list().map(convertToTaskProviderTask));

			// Watch for changes
			taskStore.on("change", (newTasks: Task[]) => {
				setTasks(newTasks.map(convertToTaskProviderTask));
			});

			// Start watching file for external changes
			await taskStore.watch();
		};

		initializeStore();

		return () => {
			taskStore.stop();
		};
	}, [taskStore]);

	// Handle CLI overrides and state restoration on first render (synchronous)
	if (!hasInitialized.current) {
		hasInitialized.current = true;

		// CLI command takes precedence
		if (cliArgs?.command === "init") {
			send({ type: "FORCE_INIT" });
		} else if (cliArgs?.command === "plan") {
			send({ type: "FORCE_PLANNING" });
		} else if (cliArgs?.mode) {
			// CLI mode flag
			send({ type: "SET_MODE", mode: cliArgs.mode });
		} else {
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
	}

	// Route based on machine state
	// If --mode was explicitly passed via CLI, skip directly to implementation
	// (don't wait for state machine update, which happens asynchronously)
	if (snapshot.matches({ app: "init" }) && !cliArgs?.mode) {
		return (
			<InitMode
				projectDir={projectRoot}
				onComplete={() =>
					send({ type: "CONFIG_COMPLETE", config: { projectRoot } })
				}
			/>
		);
	}

	if (snapshot.matches({ app: "planning" }) && !cliArgs?.mode) {
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

	if (snapshot.matches({ app: "implementation" }) || cliArgs?.mode) {
		return (
			<ImplementationMode
				mode={cliArgs?.mode ?? "semi-auto"}
				tasks={tasks}
				agents={[]}
				maxAgents={4}
				onPlanningMode={() => send({ type: "FORCE_PLANNING" })}
				onToggleMode={() =>
					send({
						type: "SET_MODE",
						mode: cliArgs?.mode === "autopilot" ? "semi-auto" : "autopilot",
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
