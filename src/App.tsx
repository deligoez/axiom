import { existsSync } from "node:fs";
import { join } from "node:path";
import type React from "react";
import { useRef } from "react";
import { useChorusMachine } from "./hooks/useChorusMachine.js";
import { ImplementationMode } from "./modes/ImplementationMode.js";
import { InitMode } from "./modes/InitMode.js";
import { PlanningMode } from "./modes/PlanningMode.js";
import { ReviewLoop } from "./modes/ReviewLoop.js";
import { PlanningState } from "./services/PlanningState.js";

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
		return <ImplementationMode />;
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
