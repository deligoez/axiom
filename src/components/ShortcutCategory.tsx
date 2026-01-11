import { Box, Text } from "ink";
import type React from "react";

export interface Shortcut {
	key: string;
	description: string;
}

export interface ShortcutCategoryProps {
	title: string;
	shortcuts: Shortcut[];
}

const KEY_WIDTH = 8;

export function ShortcutCategory({
	title,
	shortcuts,
}: ShortcutCategoryProps): React.ReactElement {
	return (
		<Box flexDirection="column">
			<Text bold>{title}</Text>
			{shortcuts.map((shortcut) => (
				<Box key={shortcut.key}>
					<Box width={KEY_WIDTH}>
						<Text>{shortcut.key}</Text>
					</Box>
					<Text dimColor>{shortcut.description}</Text>
				</Box>
			))}
		</Box>
	);
}
