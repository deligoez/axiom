import { describe, expect, it } from "vitest";
import { parseArgs } from "./cli.js";

describe("CLI", () => {
	it("parses empty args with default values", () => {
		const result = parseArgs([]);

		expect(result.version).toBe(false);
		expect(result.help).toBe(false);
	});

	it("parses --version flag", () => {
		const result = parseArgs(["--version"]);

		expect(result.version).toBe(true);
	});

	it("parses --help flag", () => {
		const result = parseArgs(["--help"]);

		expect(result.help).toBe(true);
	});

	it("parses -v short flag for version", () => {
		const result = parseArgs(["-v"]);

		expect(result.version).toBe(true);
	});

	it("parses -h short flag for help", () => {
		const result = parseArgs(["-h"]);

		expect(result.help).toBe(true);
	});

	it("shows help for unknown flags", () => {
		const result = parseArgs(["--unknown"]);

		expect(result.help).toBe(true);
	});

	it("shows help for positional arguments", () => {
		const result = parseArgs(["anything"]);

		expect(result.help).toBe(true);
	});
});
