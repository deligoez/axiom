export interface ParsedArgs {
	version: boolean;
	help: boolean;
	ci: boolean;
}

export function parseArgs(args: string[]): ParsedArgs {
	return {
		version: args.includes("--version") || args.includes("-v"),
		help: args.includes("--help") || args.includes("-h"),
		ci: args.includes("--ci"),
	};
}
