import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { QualityCommandRunner } from "../services/QualityCommandRunner.js";

describe("E2E: QualityCommandRunner", () => {
	let tempDir: string;
	let runner: QualityCommandRunner;

	beforeEach(() => {
		// Create a fresh temp directory for each test
		tempDir = join(
			tmpdir(),
			`chorus-qcr-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		);
		mkdirSync(tempDir, { recursive: true });
		runner = new QualityCommandRunner(tempDir);
	});

	afterEach(() => {
		// Clean up temp directory
		try {
			rmSync(tempDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	// Basic command execution tests

	it("runs real echo command and captures output", async () => {
		// Act
		const result = await runner.run('echo "hello world"');

		// Assert
		expect(result.success).toBe(true);
		expect(result.exitCode).toBe(0);
		expect(result.output.trim()).toBe("hello world");
	});

	it("returns correct exit code for passing command", async () => {
		// Act
		const result = await runner.run("true");

		// Assert
		expect(result.success).toBe(true);
		expect(result.exitCode).toBe(0);
	});

	it("returns correct exit code for failing command", async () => {
		// Act
		const result = await runner.run("false");

		// Assert
		expect(result.success).toBe(false);
		expect(result.exitCode).toBe(1);
	});

	it("runs command in correct working directory", async () => {
		// Arrange
		const testFile = "test-marker.txt";
		writeFileSync(join(tempDir, testFile), "marker content");

		// Act
		const result = await runner.run(`cat ${testFile}`);

		// Assert
		expect(result.success).toBe(true);
		expect(result.output.trim()).toBe("marker content");
	});

	it("respects custom cwd parameter", async () => {
		// Arrange
		const subDir = join(tempDir, "subdir");
		mkdirSync(subDir, { recursive: true });
		writeFileSync(join(subDir, "subfile.txt"), "subdir content");

		// Act
		const result = await runner.run("cat subfile.txt", subDir);

		// Assert
		expect(result.success).toBe(true);
		expect(result.output.trim()).toBe("subdir content");
	});

	it("captures stderr in output", async () => {
		// Act
		const result = await runner.run('echo "error message" >&2');

		// Assert
		expect(result.output).toContain("error message");
	});

	// Timeout tests

	it("handles timeout correctly", async () => {
		// Act - run sleep for 5 seconds but timeout after 100ms
		const result = await runner.runWithTimeout("sleep 5", undefined, 100);

		// Assert
		expect(result.success).toBe(false);
		expect(result.exitCode).toBe(124); // timeout exit code
	});

	it("completes command before timeout", async () => {
		// Act - run quick command with long timeout
		const result = await runner.runWithTimeout("echo quick", undefined, 5000);

		// Assert
		expect(result.success).toBe(true);
		expect(result.output.trim()).toBe("quick");
	});
});
