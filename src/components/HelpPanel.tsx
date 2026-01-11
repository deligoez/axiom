import { Box, Text } from "ink";

interface Shortcut {
	key: string;
	description: string;
}

const shortcuts: Shortcut[] = [
	{ key: "q", description: "Quit" },
	{ key: "s", description: "Spawn new agent" },
	{ key: "j", description: "Select next agent" },
	{ key: "k", description: "Select previous agent" },
	{ key: "?", description: "Toggle this help" },
];

interface HelpPanelProps {
	visible: boolean;
}

const WIDTH = 32;

function row(text: string): string {
	return ` ${text} `.padEnd(WIDTH).slice(0, WIDTH);
}

export default function HelpPanel({ visible }: HelpPanelProps) {
	if (!visible) return null;

	const lines = [
		row(""),
		row("Keyboard Shortcuts"),
		row(""),
		...shortcuts.map((s) => row(`${s.key.padEnd(4)}${s.description}`)),
		row(""),
		row("Press ? to close"),
		row(""),
	];

	return (
		<Box flexDirection="column" borderStyle="round" borderColor="yellow">
			{lines.map((line, i) => (
				<Text key={`help-${i}-${line.trim()}`}>{line}</Text>
			))}
		</Box>
	);
}
