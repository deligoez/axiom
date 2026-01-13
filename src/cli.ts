export interface ParsedArgs {
	version: boolean;
	help: boolean;
	command?: "init" | "plan";
}

const KNOWN_FLAGS = ["--version", "-v", "--help", "-h"];
const KNOWN_COMMANDS = ["init", "plan"];

export function parseArgs(args: string[]): ParsedArgs {
	// Parse command (first positional argument)
	let command: ParsedArgs["command"];
	const positional = args.filter((arg) => !arg.startsWith("-"));
	if (positional[0] === "init") {
		command = "init";
	} else if (positional[0] === "plan") {
		command = "plan";
	}

	// Unknown command → show help
	if (positional[0] && !KNOWN_COMMANDS.includes(positional[0])) {
		return { version: false, help: true };
	}

	// Check for unknown flags → show help
	const flags = args.filter((arg) => arg.startsWith("-"));
	for (const flag of flags) {
		if (!KNOWN_FLAGS.includes(flag)) {
			return { version: false, help: true };
		}
	}

	return {
		version: args.includes("--version") || args.includes("-v"),
		help: args.includes("--help") || args.includes("-h"),
		command,
	};
}
