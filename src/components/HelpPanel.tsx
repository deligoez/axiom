import { Box, Text } from "ink";
import type React from "react";
import { ShortcutCategory } from "./ShortcutCategory.js";

interface HelpPanelProps {
	visible: boolean;
}

const NAVIGATION = [
	{ key: "j/↓", description: "Move down" },
	{ key: "k/↑", description: "Move up" },
	{ key: "Tab", description: "Switch panels" },
	{ key: "1-9", description: "Quick select" },
];

const AGENT_CONTROL = [
	{ key: "s", description: "Spawn agent" },
	{ key: "x", description: "Stop agent" },
	{ key: "r", description: "Redirect agent" },
	{ key: "Enter", description: "Assign task" },
];

const MODE_CONTROL = [
	{ key: "m", description: "Toggle mode" },
	{ key: "Space", description: "Pause/resume" },
	{ key: "a", description: "Start autopilot" },
];

const TASK_MANAGEMENT = [
	{ key: "n", description: "New task" },
	{ key: "e", description: "Edit task" },
	{ key: "b", description: "Block task" },
	{ key: "d", description: "Mark done" },
];

const VIEW = [
	{ key: "f", description: "Fullscreen agent" },
	{ key: "g", description: "Grid settings" },
	{ key: "l", description: "View logs" },
	{ key: "L", description: "View learnings" },
];

const RECOVERY = [
	{ key: "R", description: "Rollback menu" },
	{ key: "c", description: "Create checkpoint" },
	{ key: "u", description: "Undo last action" },
];

const PLANNING_LEARNING = [
	{ key: "P", description: "Plan more tasks" },
	{ key: "Shift+P", description: "Force plan" },
	{ key: "Ctrl+L", description: "Review learnings" },
	{ key: "Shift+L", description: "Force review" },
];

const GENERAL = [
	{ key: "?", description: "Toggle help" },
	{ key: "i", description: "Intervention menu" },
	{ key: "q", description: "Quit" },
	{ key: "M", description: "Merge queue view" },
];

export default function HelpPanel({
	visible,
}: HelpPanelProps): React.ReactElement | null {
	if (!visible) return null;

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor="yellow"
			paddingX={1}
		>
			<Box justifyContent="center" marginBottom={1}>
				<Text bold>KEYBOARD SHORTCUTS</Text>
			</Box>

			<Box flexDirection="row" gap={4}>
				{/* Left column */}
				<Box flexDirection="column" gap={1}>
					<ShortcutCategory title="NAVIGATION" shortcuts={NAVIGATION} />
					<ShortcutCategory title="MODE CONTROL" shortcuts={MODE_CONTROL} />
					<ShortcutCategory title="VIEW" shortcuts={VIEW} />
					<ShortcutCategory
						title="PLANNING & LEARNING"
						shortcuts={PLANNING_LEARNING}
					/>
				</Box>

				{/* Right column */}
				<Box flexDirection="column" gap={1}>
					<ShortcutCategory title="AGENT CONTROL" shortcuts={AGENT_CONTROL} />
					<ShortcutCategory
						title="TASK MANAGEMENT"
						shortcuts={TASK_MANAGEMENT}
					/>
					<ShortcutCategory title="RECOVERY" shortcuts={RECOVERY} />
					<ShortcutCategory title="GENERAL" shortcuts={GENERAL} />
				</Box>
			</Box>

			<Box justifyContent="center" marginTop={1}>
				<Text dimColor>Press ? to close</Text>
			</Box>
		</Box>
	);
}
