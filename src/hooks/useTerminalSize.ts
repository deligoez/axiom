import { useStdout } from "ink";
import { useCallback, useEffect, useState } from "react";

interface TerminalSize {
	width: number;
	height: number;
}

const DEFAULT_WIDTH = 80;
const DEFAULT_HEIGHT = 24;

export function useTerminalSize(): TerminalSize {
	const { stdout } = useStdout();

	const getSize = useCallback(
		(): TerminalSize => ({
			width: stdout.columns ?? DEFAULT_WIDTH,
			height: stdout.rows ?? DEFAULT_HEIGHT,
		}),
		[stdout],
	);

	const [size, setSize] = useState<TerminalSize>(getSize);

	useEffect(() => {
		const handleResize = () => {
			setSize(getSize());
		};

		stdout.on("resize", handleResize);

		return () => {
			stdout.off("resize", handleResize);
		};
	}, [stdout, getSize]);

	return size;
}
