import { describe, expect, it } from "vitest";
import { parse } from "./parser.js";

describe("CLI Parser", () => {
	describe("basic flags", () => {
		it("returns CLIOptions object with default values", () => {
			// Arrange & Act
			const result = parse([]);

			// Assert
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.options.command).toBe("run");
				expect(result.options.mode).toBe("semi-auto");
				expect(result.options.showHelp).toBe(false);
				expect(result.options.showVersion).toBe(false);
			}
		});

		it("--autopilot flag sets mode to autopilot", () => {
			// Arrange & Act
			const result = parse(["--autopilot"]);

			// Assert
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.options.mode).toBe("autopilot");
			}
		});

		it("--mode <value> sets mode to specified value", () => {
			// Arrange & Act
			const result = parse(["--mode", "autopilot"]);

			// Assert
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.options.mode).toBe("autopilot");
			}
		});

		it("--mode validates value is semi-auto or autopilot", () => {
			// Arrange & Act
			const result = parse(["--mode", "invalid"]);

			// Assert
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toContain("Invalid mode");
			}
		});

		it("--help sets showHelp to true", () => {
			// Arrange & Act
			const result = parse(["--help"]);

			// Assert
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.options.showHelp).toBe(true);
			}
		});

		it("--version sets showVersion to true", () => {
			// Arrange & Act
			const result = parse(["--version"]);

			// Assert
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.options.showVersion).toBe(true);
			}
		});

		it("--config <path> sets configPath", () => {
			// Arrange & Act
			const result = parse(["--config", "/path/to/config.json"]);

			// Assert
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.options.configPath).toBe("/path/to/config.json");
			}
		});

		it("default mode is semi-auto when no flags", () => {
			// Arrange & Act
			const result = parse([]);

			// Assert
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.options.mode).toBe("semi-auto");
			}
		});
	});

	describe("subcommands", () => {
		it("init subcommand sets command to init", () => {
			// Arrange & Act
			const result = parse(["init"]);

			// Assert
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.options.command).toBe("init");
			}
		});

		it("plan subcommand sets command to plan", () => {
			// Arrange & Act
			const result = parse(["plan"]);

			// Assert
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.options.command).toBe("plan");
			}
		});

		it("no subcommand sets command to run", () => {
			// Arrange & Act
			const result = parse([]);

			// Assert
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.options.command).toBe("run");
			}
		});
	});

	describe("init options", () => {
		it("--yes sets nonInteractive to true", () => {
			// Arrange & Act
			const result = parse(["init", "--yes"]);

			// Assert
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.options.nonInteractive).toBe(true);
			}
		});

		it("-y short flag sets nonInteractive to true", () => {
			// Arrange & Act
			const result = parse(["init", "-y"]);

			// Assert
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.options.nonInteractive).toBe(true);
			}
		});

		it("--max-agents <n> sets maxAgents", () => {
			// Arrange & Act
			const result = parse(["init", "--max-agents", "5"]);

			// Assert
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.options.maxAgents).toBe(5);
			}
		});

		it("--prefix <str> sets taskIdPrefix", () => {
			// Arrange & Act
			const result = parse(["init", "--prefix", "myapp-"]);

			// Assert
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.options.taskIdPrefix).toBe("myapp-");
			}
		});

		it("init options only valid with init subcommand", () => {
			// Arrange & Act
			const result = parse(["--yes"]);

			// Assert
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toContain("only valid with");
			}
		});
	});

	describe("error handling", () => {
		it("invalid arguments return error", () => {
			// Arrange & Act
			const result = parse(["--unknown"]);

			// Assert
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toContain("Unknown argument");
			}
		});

		it("invalid --mode value returns error", () => {
			// Arrange & Act
			const result = parse(["--mode", "broken"]);

			// Assert
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toContain("Invalid mode");
			}
		});

		it("--max-agents validates positive integer", () => {
			// Arrange & Act
			const result = parse(["init", "--max-agents", "-1"]);

			// Assert
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toContain("positive integer");
			}
		});
	});
});
