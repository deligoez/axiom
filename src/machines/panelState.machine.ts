import { setup } from "xstate";

// ============================================================================
// Types
// ============================================================================

export type PanelStateEvent =
	| { type: "OPEN_INTERVENTION" }
	| { type: "OPEN_HELP" }
	| { type: "OPEN_EXIT_CONFIRM" }
	| { type: "CLOSE_PANEL" };

// ============================================================================
// Machine
// ============================================================================

/**
 * Panel state machine for ImplementationMode UI.
 *
 * Manages which panel/modal is currently visible.
 * Only one panel can be open at a time (mutually exclusive states).
 */
export const panelStateMachine = setup({
	types: {
		events: {} as PanelStateEvent,
	},
}).createMachine({
	id: "panelState",
	initial: "none",
	states: {
		none: {
			on: {
				OPEN_INTERVENTION: { target: "intervention" },
				OPEN_HELP: { target: "help" },
				OPEN_EXIT_CONFIRM: { target: "exitConfirm" },
			},
		},
		intervention: {
			on: {
				CLOSE_PANEL: { target: "none" },
			},
		},
		help: {
			on: {
				CLOSE_PANEL: { target: "none" },
			},
		},
		exitConfirm: {
			on: {
				CLOSE_PANEL: { target: "none" },
			},
		},
	},
});
