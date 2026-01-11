import { Text } from "ink";
import type React from "react";

export interface ModeIndicatorProps {
	mode: "semi-auto" | "autopilot" | string | undefined;
}

export function ModeIndicator({
	mode,
}: ModeIndicatorProps): React.ReactElement {
	const normalizedMode = normalizeMode(mode);
	const dotColor = getDotColor(normalizedMode);
	const displayText = getDisplayText(normalizedMode);

	return (
		<Text>
			{displayText} <Text color={dotColor}>●</Text>
		</Text>
	);
}

function normalizeMode(
	mode: string | undefined,
): "semi-auto" | "autopilot" | "unknown" {
	if (mode === "semi-auto" || mode === "autopilot") {
		return mode;
	}
	return "unknown";
}

function getDotColor(
	mode: "semi-auto" | "autopilot" | "unknown",
): "green" | "yellow" | "gray" {
	switch (mode) {
		case "semi-auto":
			return "green";
		case "autopilot":
			return "yellow";
		default:
			return "gray";
	}
}

function getDisplayText(mode: "semi-auto" | "autopilot" | "unknown"): string {
	return mode;
}
