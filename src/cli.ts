export interface ParsedArgs {
	version: boolean;
	help: boolean;
	ci: boolean;
	command?: "init" | "plan";
	mode?: "semi-auto" | "autopilot";
}

export function parseArgs(args: string[]): ParsedArgs {
	// Parse command (first positional argument)
	let command: ParsedArgs["command"];
	const positional = args.filter((arg) => !arg.startsWith("-"));
	if (positional[0] === "init") {
		command = "init";
	} else if (positional[0] === "plan") {
		command = "plan";
	}

	// Parse --mode flag
	let mode: ParsedArgs["mode"];
	const modeIndex = args.indexOf("--mode");
	if (modeIndex !== -1 && args[modeIndex + 1]) {
		const modeValue = args[modeIndex + 1];
		if (modeValue === "semi-auto" || modeValue === "autopilot") {
			mode = modeValue;
		}
	}

	return {
		version: args.includes("--version") || args.includes("-v"),
		help: args.includes("--help") || args.includes("-h"),
		ci: args.includes("--ci"),
		command,
		mode,
	};
}
