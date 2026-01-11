import { useInput } from "ink";

export type ModalType =
	| "help"
	| "intervention"
	| "logs"
	| "learnings"
	| "gridSettings"
	| "confirm"
	| null;

export type FocusedPanel = "left" | "right" | "taskPanel" | "agentGrid";

export type TaskStatus =
	| "pending"
	| "in_progress"
	| "completed"
	| "failed"
	| null;

export interface KeyContext {
	focusedPanel: FocusedPanel;
	selectedTaskId: string | null;
	selectedAgentId: string | null;
	modalOpen: ModalType;
	isPaused: boolean;
	currentMode: "semi-auto" | "autopilot";
	taskStatus: TaskStatus;
}

export interface KeyHandler {
	keys: string[];
	condition: (ctx: KeyContext, key: string) => boolean;
	handler: (ctx: KeyContext, key: string) => void;
	priority: number;
}

/**
 * Normalize key input to a consistent string representation
 */
function normalizeKey(input: string, key: { escape?: boolean }): string {
	if (key.escape) {
		return "escape";
	}
	return input;
}

/**
 * Central keyboard router that coordinates all keyboard handlers
 * and prevents conflicts by routing keys based on priority and context.
 *
 * @param handlers - Array of key handlers to route to
 * @param context - Current keyboard context (focus, modal state, etc.)
 */
export function useKeyboardRouter(
	handlers: KeyHandler[],
	context: KeyContext,
): void {
	useInput((input, key) => {
		const pressedKey = normalizeKey(input, key);

		// Sort handlers by priority (highest first)
		const sorted = [...handlers].sort((a, b) => b.priority - a.priority);

		// Find first matching handler
		for (const h of sorted) {
			if (h.keys.includes(pressedKey) && h.condition(context, pressedKey)) {
				h.handler(context, pressedKey);
				return; // Only one handler runs per keypress
			}
		}
	});
}
