import { Box, Text } from "ink";
import React from "react";
import { ShortcutCategory } from "./ShortcutCategory.js";

interface HelpPanelProps {
	visible: boolean;
}

// Only show implemented shortcuts
// Unimplemented features removed per ch-6dg1

const NAVIGATION = [
	{ key: "j/↓", description: "Move down" },
	{ key: "k/↑", description: "Move up" },
	{ key: "Tab", description: "Switch panels" },
];

const MODE_CONTROL = [
	{ key: "m", description: "Toggle mode" },
	{ key: "p", description: "Planning mode" },
];

const VIEW = [{ key: "L", description: "View learnings" }];

const GENERAL = [
	{ key: "?", description: "Toggle help" },
	{ key: "i", description: "Intervention menu" },
	{ key: "q", description: "Quit" },
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
				</Box>

				{/* Right column */}
				<Box flexDirection="column" gap={1}>
					<ShortcutCategory title="VIEW" shortcuts={VIEW} />
					<ShortcutCategory title="GENERAL" shortcuts={GENERAL} />
				</Box>
			</Box>

			<Box justifyContent="center" marginTop={1}>
				<Text dimColor>Press ? to close</Text>
			</Box>
		</Box>
	);
}
