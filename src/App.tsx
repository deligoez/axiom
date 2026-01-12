import { existsSync } from "node:fs";
import { join } from "node:path";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChorusMachine } from "./hooks/useChorusMachine.js";
import { ImplementationMode } from "./modes/ImplementationMode.js";
import { InitMode } from "./modes/InitMode.js";
import { PlanningMode } from "./modes/PlanningMode.js";
import { ReviewLoop } from "./modes/ReviewLoop.js";
import { BeadsService } from "./services/BeadsService.js";
import { PlanningState } from "./services/PlanningState.js";
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

	// Create BeadsService instance (memoized to avoid recreating on every render)
	const beadsService = useMemo(
		() => new BeadsService(projectRoot),
		[projectRoot],
	);

	// Load and watch beads (converted to TaskProviderTask format)
	const [tasks, setTasks] = useState<TaskProviderTask[]>([]);

	useEffect(() => {
		// Helper to convert Bead to TaskProviderTask
		const convertBeadToTask = (
			bead: ReturnType<typeof beadsService.getBeads>[number],
		): TaskProviderTask => ({
			id: bead.id,
			title: bead.title,
			description: bead.description,
			priority: bead.priority,
			status: bead.status,
			labels: [],
			dependencies: bead.dependencies ?? [],
			custom: bead.assignee ? { agent: bead.assignee } : undefined,
		});

		// Initial load
		setTasks(beadsService.getBeads().map(convertBeadToTask));

		// Watch for changes
		beadsService.on("change", (newBeads) => {
			setTasks(newBeads.map(convertBeadToTask));
		});

		beadsService.watch();

		return () => {
			beadsService.stop();
		};
	}, [beadsService]);

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
