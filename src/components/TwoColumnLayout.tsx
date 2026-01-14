import { Box, Text, useInput } from "ink";
import React, { useState } from "react";

// Note: In node-pty spawned processes, stdin.isTTY may be false even with a PTY.
// Check both stdin and stdout for TTY support.
const getIsTTY = () => Boolean(process.stdin?.isTTY || process.stdout?.isTTY);

export interface TwoColumnLayoutProps {
	left: React.ReactNode;
	right: React.ReactNode;
	leftWidth?: number;
	rightWidth?: number;
	separator?: boolean;
	onToggleFocus?: (focused: "left" | "right") => void;
}

export function TwoColumnLayout({
	left,
	right,
	leftWidth = 30,
	rightWidth = 70,
	separator = true,
	onToggleFocus,
}: TwoColumnLayoutProps): React.ReactElement {
	const [focus, setFocus] = useState<"left" | "right">("left");

	useInput(
		(_input, key) => {
			if (key.tab) {
				const newFocus = focus === "left" ? "right" : "left";
				setFocus(newFocus);
				onToggleFocus?.(newFocus);
			}
		},
		{ isActive: getIsTTY() },
	);

	const leftBorderColor = focus === "left" ? "cyan" : "gray";
	const rightBorderColor = focus === "right" ? "cyan" : "gray";

	return (
		<Box flexDirection="row" flexGrow={1}>
			<Box
				flexBasis={`${leftWidth}%`}
				borderStyle="single"
				borderColor={leftBorderColor}
				flexDirection="column"
			>
				{left}
			</Box>
			{separator && (
				<Box>
					<Text color="gray">│</Text>
				</Box>
			)}
			<Box
				flexBasis={`${rightWidth}%`}
				borderStyle="single"
				borderColor={rightBorderColor}
				flexDirection="column"
			>
				{right}
			</Box>
		</Box>
	);
}
