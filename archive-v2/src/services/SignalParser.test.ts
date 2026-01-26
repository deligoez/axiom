import { describe, expect, it } from "vitest";
import { SignalParser } from "./SignalParser.js";

describe("SignalParser", () => {
	const parser = new SignalParser();

	it("parse() returns COMPLETE signal", () => {
		// Arrange
		const output = "Task completed successfully.\n<chorus>COMPLETE</chorus>";

		// Act
		const result = parser.parse(output);

		// Assert
		expect(result.hasSignal).toBe(true);
		expect(result.signal?.type).toBe("COMPLETE");
		expect(result.signal?.payload).toBeNull();
	});

	it("parse() returns BLOCKED with reason", () => {
		// Arrange
		const output = "<chorus>BLOCKED:Missing dependency ch-xyz</chorus>";

		// Act
		const result = parser.parse(output);

		// Assert
		expect(result.hasSignal).toBe(true);
		expect(result.signal?.type).toBe("BLOCKED");
		expect(result.signal?.payload).toBe("Missing dependency ch-xyz");
	});

	it("parse() returns NEEDS_HELP with question", () => {
		// Arrange
		const output =
			"Working on the task...\n<chorus>NEEDS_HELP:Which API version to use?</chorus>";

		// Act
		const result = parser.parse(output);

		// Assert
		expect(result.hasSignal).toBe(true);
		expect(result.signal?.type).toBe("NEEDS_HELP");
		expect(result.signal?.payload).toBe("Which API version to use?");
	});

	it("parse() returns PROGRESS with percentage", () => {
		// Arrange
		const output = "<chorus>PROGRESS:75</chorus>\nContinuing work...";

		// Act
		const result = parser.parse(output);

		// Assert
		expect(result.hasSignal).toBe(true);
		expect(result.signal?.type).toBe("PROGRESS");
		expect(result.signal?.payload).toBe("75");
	});

	it("parse() returns null for no signal", () => {
		// Arrange
		const output = "Just regular output without any signals";

		// Act
		const result = parser.parse(output);

		// Assert
		expect(result.hasSignal).toBe(false);
		expect(result.signal).toBeNull();
	});

	it("parse() finds signal in middle of output", () => {
		// Arrange
		const output =
			"Starting work...\n<chorus>PROGRESS:50</chorus>\nMore work...\n<chorus>COMPLETE</chorus>\nDone!";

		// Act
		const result = parser.parse(output);

		// Assert
		expect(result.hasSignal).toBe(true);
		expect(result.signal?.type).toBe("PROGRESS");
		expect(result.signal?.payload).toBe("50");
	});

	it("parseAll() finds multiple signals", () => {
		// Arrange
		const output =
			"<chorus>PROGRESS:25</chorus>\nWorking...\n<chorus>PROGRESS:75</chorus>\n<chorus>COMPLETE</chorus>";

		// Act
		const signals = parser.parseAll(output);

		// Assert
		expect(signals).toHaveLength(3);
		expect(signals[0].type).toBe("PROGRESS");
		expect(signals[0].payload).toBe("25");
		expect(signals[1].type).toBe("PROGRESS");
		expect(signals[1].payload).toBe("75");
		expect(signals[2].type).toBe("COMPLETE");
	});

	it("parseAll() returns empty for no signals", () => {
		// Arrange
		const output = "No signals here";

		// Act
		const signals = parser.parseAll(output);

		// Assert
		expect(signals).toEqual([]);
	});

	it("isComplete() returns true for COMPLETE", () => {
		// Arrange
		const output = "Work done\n<chorus>COMPLETE</chorus>";

		// Act & Assert
		expect(parser.isComplete(output)).toBe(true);
		expect(parser.isComplete("no signal")).toBe(false);
	});

	it("getProgress() clamps value to 0-100", () => {
		// Arrange & Act & Assert
		expect(parser.getProgress("<chorus>PROGRESS:50</chorus>")).toBe(50);
		expect(parser.getProgress("<chorus>PROGRESS:150</chorus>")).toBe(100);
		expect(parser.getProgress("<chorus>PROGRESS:-10</chorus>")).toBe(0);
		expect(parser.getProgress("<chorus>PROGRESS:invalid</chorus>")).toBeNull();
		expect(parser.getProgress("no progress")).toBeNull();
	});
});
