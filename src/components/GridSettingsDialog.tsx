import { Box, Text, useInput } from "ink";
import type React from "react";
import { useState } from "react";

// Check if stdin supports raw mode (safe check)
// Using a getter to allow test mocking
const getIsTTY = () => Boolean(process.stdin?.isTTY);

export type GridLayout = "auto" | "1x1" | "2x2" | "2x3" | "1x4";

const LAYOUTS: GridLayout[] = ["auto", "1x1", "2x2", "2x3", "1x4"];

export interface GridSettingsDialogProps {
	isOpen: boolean;
	currentLayout: GridLayout;
	onSelect: (layout: GridLayout) => void;
	onCancel: () => void;
}

/**
 * GridSettingsDialog - Dialog for configuring agent grid layout
 *
 * Shows layout options: auto, 1x1, 2x2, 2x3, 1x4
 * - Arrow keys to navigate
 * - Enter to select
 * - Escape or 'g' to cancel (toggle behavior)
 */
export function GridSettingsDialog({
	isOpen,
	currentLayout,
	onSelect,
	onCancel,
}: GridSettingsDialogProps): React.ReactElement | null {
	const [selectedIndex, setSelectedIndex] = useState(
		LAYOUTS.indexOf(currentLayout),
	);

	useInput(
		(input, key) => {
			if (!isOpen) return;

			// Toggle: 'g' closes if open
			if (input === "g") {
				onCancel();
				return;
			}

			// Cancel on Escape
			if (key.escape) {
				onCancel();
				return;
			}

			// Select on Enter
			if (key.return) {
				onSelect(LAYOUTS[selectedIndex]);
				return;
			}

			// Navigate up
			if (key.upArrow) {
				setSelectedIndex((prev) => Math.max(0, prev - 1));
				return;
			}

			// Navigate down
			if (key.downArrow) {
				setSelectedIndex((prev) => Math.min(LAYOUTS.length - 1, prev + 1));
				return;
			}
		},
		{ isActive: getIsTTY() && isOpen },
	);

	if (!isOpen) {
		return null;
	}

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor="cyan"
			paddingX={2}
			paddingY={1}
		>
			<Text bold color="cyan">
				Grid Layout
			</Text>

			<Box marginTop={1} flexDirection="column">
				{LAYOUTS.map((layout, index) => {
					const isSelected = index === selectedIndex;
					const isCurrent = layout === currentLayout;

					return (
						<Box key={layout} gap={1}>
							<Text color={isSelected ? "cyan" : undefined}>
								{isSelected ? ">" : " "}
							</Text>
							<Text
								bold={isSelected}
								color={isSelected ? "cyan" : undefined}
								inverse={isCurrent}
							>
								{layout}
							</Text>
							{isCurrent && <Text dimColor> (current)</Text>}
						</Box>
					);
				})}
			</Box>

			<Box marginTop={1}>
				<Text dimColor>
					<Text bold>↑↓</Text> navigate <Text bold>Enter</Text> select{" "}
					<Text bold>g</Text>/<Text bold>Esc</Text> close
				</Text>
			</Box>
		</Box>
	);
}
