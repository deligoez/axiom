import { Box, Text } from "ink";
import React from "react";

export interface EmptySlotProps {
	width?: number;
}

export function EmptySlot({ width = 20 }: EmptySlotProps): React.ReactElement {
	return (
		<Box
			borderStyle="single"
			borderColor="gray"
			width={width}
			justifyContent="center"
			alignItems="center"
			paddingY={1}
		>
			<Text dimColor>[empty slot]</Text>
		</Box>
	);
}
