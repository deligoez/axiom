import { describe, expect, it } from "vitest";
import type { QualityCommand } from "../types/config.js";
import { QualityCommandRunner } from "./QualityCommandRunner.js";

describe("QualityCommandRunner", () => {
	// Single Command Execution tests (7)
	it("Constructor stores projectDir", () => {
		// Arrange & Act
		const runner = new QualityCommandRunner("/tmp/project");

		// Assert
		expect(runner.getProjectDir()).toBe("/tmp/project");
	});

	it("run() executes single command via shell and returns result", async () => {
		// Arrange
		const runner = new QualityCommandRunner("/tmp");

		// Act
		const result = await runner.run("echo hello");

		// Assert
		expect(result.output).toContain("hello");
		expect(result.name).toBe("echo hello");
	});

	it("run() returns success=true for exit code 0", async () => {
		// Arrange
		const runner = new QualityCommandRunner("/tmp");

		// Act
		const result = await runner.run("true");

		// Assert
		expect(result.success).toBe(true);
		expect(result.exitCode).toBe(0);
	});

	it("run() returns success=false for non-zero exit code", async () => {
		// Arrange
		const runner = new QualityCommandRunner("/tmp");

		// Act
		const result = await runner.run("false");

		// Assert
		expect(result.success).toBe(false);
		expect(result.exitCode).not.toBe(0);
	});

	it("run() captures stdout and stderr in output", async () => {
		// Arrange
		const runner = new QualityCommandRunner("/tmp");

		// Act
		const result = await runner.run("echo stdout && echo stderr >&2");

		// Assert
		expect(result.output).toContain("stdout");
		expect(result.output).toContain("stderr");
	});

	it("run() tracks execution duration in milliseconds", async () => {
		// Arrange
		const runner = new QualityCommandRunner("/tmp");

		// Act
		const result = await runner.run("sleep 0.1");

		// Assert
		expect(result.duration).toBeGreaterThan(50);
		expect(result.duration).toBeLessThan(2000);
	});

	it("runWithTimeout() kills process and returns exit code 124 on timeout", async () => {
		// Arrange
		const runner = new QualityCommandRunner("/tmp");

		// Act
		const result = await runner.runWithTimeout("sleep 10", undefined, 100);

		// Assert
		expect(result.success).toBe(false);
		expect(result.exitCode).toBe(124);
	});

	// Multiple Quality Commands tests (6)
	it("runQualityCommands() executes all commands in order", async () => {
		// Arrange
		const runner = new QualityCommandRunner("/tmp");
		const commands: QualityCommand[] = [
			{ name: "test1", command: "echo first", required: true, order: 1 },
			{ name: "test2", command: "echo second", required: true, order: 2 },
		];

		// Act
		const result = await runner.runQualityCommands(commands);

		// Assert
		expect(result.results).toHaveLength(2);
		expect(result.results[0].output).toContain("first");
		expect(result.results[1].output).toContain("second");
	});

	it("runQualityCommands() returns per-command results", async () => {
		// Arrange
		const runner = new QualityCommandRunner("/tmp");
		const commands: QualityCommand[] = [
			{ name: "echo-cmd", command: "echo test", required: true, order: 1 },
		];

		// Act
		const result = await runner.runQualityCommands(commands);

		// Assert
		expect(result.results[0].name).toBe("echo-cmd");
		expect(result.results[0].success).toBe(true);
		expect(result.results[0].duration).toBeGreaterThanOrEqual(0);
	});

	it("runQualityCommands() stops on first required failure", async () => {
		// Arrange
		const runner = new QualityCommandRunner("/tmp");
		const commands: QualityCommand[] = [
			{ name: "pass", command: "true", required: true, order: 1 },
			{ name: "fail", command: "false", required: true, order: 2 },
			{ name: "never", command: "echo never", required: true, order: 3 },
		];

		// Act
		const result = await runner.runQualityCommands(commands);

		// Assert
		expect(result.results).toHaveLength(2);
		expect(result.firstFailure).toBe("fail");
	});

	it("runQualityCommands() continues on optional failure", async () => {
		// Arrange
		const runner = new QualityCommandRunner("/tmp");
		const commands: QualityCommand[] = [
			{ name: "pass", command: "true", required: true, order: 1 },
			{ name: "optional-fail", command: "false", required: false, order: 2 },
			{ name: "last", command: "echo last", required: true, order: 3 },
		];

		// Act
		const result = await runner.runQualityCommands(commands);

		// Assert
		expect(result.results).toHaveLength(3);
		expect(result.results[2].output).toContain("last");
	});

	it("runRequiredOnly() executes only required commands", async () => {
		// Arrange
		const runner = new QualityCommandRunner("/tmp");
		const commands: QualityCommand[] = [
			{ name: "required1", command: "echo req1", required: true, order: 1 },
			{ name: "optional", command: "echo opt", required: false, order: 2 },
			{ name: "required2", command: "echo req2", required: true, order: 3 },
		];

		// Act
		const result = await runner.runRequiredOnly(commands);

		// Assert
		expect(result.results).toHaveLength(2);
		expect(result.results[0].name).toBe("required1");
		expect(result.results[1].name).toBe("required2");
	});

	it("runQualityCommands() returns aggregated allPassed result", async () => {
		// Arrange
		const runner = new QualityCommandRunner("/tmp");
		const passingCommands: QualityCommand[] = [
			{ name: "pass1", command: "true", required: true, order: 1 },
			{ name: "pass2", command: "true", required: true, order: 2 },
		];
		const failingCommands: QualityCommand[] = [
			{ name: "pass", command: "true", required: true, order: 1 },
			{ name: "fail", command: "false", required: true, order: 2 },
		];

		// Act
		const passResult = await runner.runQualityCommands(passingCommands);
		const failResult = await runner.runQualityCommands(failingCommands);

		// Assert
		expect(passResult.allPassed).toBe(true);
		expect(failResult.allPassed).toBe(false);
	});
});
