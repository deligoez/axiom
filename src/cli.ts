export interface ParsedArgs {
	version: boolean;
	help: boolean;
}

export function parseArgs(args: string[]): ParsedArgs {
	return {
		version: args.includes("--version") || args.includes("-v"),
		help: args.includes("--help") || args.includes("-h"),
	};
}
