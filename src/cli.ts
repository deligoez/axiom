export interface ParsedArgs {
	version: boolean;
	help: boolean;
}

const KNOWN_FLAGS = ["--version", "-v", "--help", "-h"];

export function parseArgs(args: string[]): ParsedArgs {
	// Any positional argument (non-flag) → show help
	const positional = args.filter((arg) => !arg.startsWith("-"));
	if (positional.length > 0) {
		return { version: false, help: true };
	}

	// Unknown flags → show help
	const flags = args.filter((arg) => arg.startsWith("-"));
	for (const flag of flags) {
		if (!KNOWN_FLAGS.includes(flag)) {
			return { version: false, help: true };
		}
	}

	return {
		version: args.includes("--version") || args.includes("-v"),
		help: args.includes("--help") || args.includes("-h"),
	};
}
