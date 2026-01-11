export type Command = "run" | "init" | "plan";
export type Mode = "semi-auto" | "autopilot";

export interface CLIOptions {
	command: Command;
	mode: Mode;
	showHelp: boolean;
	showVersion: boolean;
	configPath?: string;
	// Init-specific options
	nonInteractive: boolean;
	maxAgents?: number;
	taskIdPrefix?: string;
}

export interface ParseResult {
	success: true;
	options: CLIOptions;
}

export interface ParseError {
	success: false;
	error: string;
}

export type ParseOutput = ParseResult | ParseError;

const VALID_MODES: Mode[] = ["semi-auto", "autopilot"];
const SUBCOMMANDS: Command[] = ["init", "plan"];

export function parse(args: string[]): ParseOutput {
	const options: CLIOptions = {
		command: "run",
		mode: "semi-auto",
		showHelp: false,
		showVersion: false,
		nonInteractive: false,
	};

	let i = 0;

	// Check for subcommand first
	if (args.length > 0 && SUBCOMMANDS.includes(args[0] as Command)) {
		options.command = args[0] as Command;
		i = 1;
	}

	while (i < args.length) {
		const arg = args[i];

		if (arg === "--help" || arg === "-h") {
			options.showHelp = true;
			i++;
			continue;
		}

		if (arg === "--version" || arg === "-V") {
			options.showVersion = true;
			i++;
			continue;
		}

		if (arg === "--autopilot") {
			options.mode = "autopilot";
			i++;
			continue;
		}

		if (arg === "--mode") {
			const value = args[i + 1];
			if (!value || value.startsWith("-")) {
				return {
					success: false,
					error: "--mode requires a value (semi-auto or autopilot)",
				};
			}
			if (!VALID_MODES.includes(value as Mode)) {
				return {
					success: false,
					error: `Invalid mode '${value}'. Must be 'semi-auto' or 'autopilot'`,
				};
			}
			options.mode = value as Mode;
			i += 2;
			continue;
		}

		if (arg === "--config") {
			const value = args[i + 1];
			if (!value || value.startsWith("-")) {
				return {
					success: false,
					error: "--config requires a path",
				};
			}
			options.configPath = value;
			i += 2;
			continue;
		}

		// Init-specific options
		if (arg === "--yes" || arg === "-y") {
			if (options.command !== "init") {
				return {
					success: false,
					error: "--yes is only valid with the 'init' command",
				};
			}
			options.nonInteractive = true;
			i++;
			continue;
		}

		if (arg === "--max-agents") {
			if (options.command !== "init") {
				return {
					success: false,
					error: "--max-agents is only valid with the 'init' command",
				};
			}
			const value = args[i + 1];
			if (!value || value.startsWith("-")) {
				return {
					success: false,
					error: "--max-agents requires a positive integer",
				};
			}
			const num = Number.parseInt(value, 10);
			if (Number.isNaN(num) || num <= 0) {
				return {
					success: false,
					error: "--max-agents must be a positive integer",
				};
			}
			options.maxAgents = num;
			i += 2;
			continue;
		}

		if (arg === "--prefix") {
			if (options.command !== "init") {
				return {
					success: false,
					error: "--prefix is only valid with the 'init' command",
				};
			}
			const value = args[i + 1];
			if (!value || value.startsWith("-")) {
				return {
					success: false,
					error: "--prefix requires a string value",
				};
			}
			options.taskIdPrefix = value;
			i += 2;
			continue;
		}

		// Unknown argument
		return {
			success: false,
			error: `Unknown argument: ${arg}`,
		};
	}

	return { success: true, options };
}
