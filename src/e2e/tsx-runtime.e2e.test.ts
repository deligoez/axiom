/**
 * E2E: TSX Runtime Compatibility
 *
 * Tests that the CLI entry point works correctly when executed via tsx.
 * This catches issues like missing React imports that break JSX at runtime.
 */

import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("E2E: TSX Runtime Compatibility", () => {
	it("tsx src/index.tsx --version outputs version without error", () => {
		// Arrange & Act
		const output = execSync("npx tsx src/index.tsx --version", {
			encoding: "utf-8",
			timeout: 10000,
		});

		// Assert
		expect(output.trim()).toBe("0.1.0");
	});

	it("tsx src/index.tsx --help outputs help without error", () => {
		// Arrange & Act
		const output = execSync("npx tsx src/index.tsx --help", {
			encoding: "utf-8",
			timeout: 10000,
		});

		// Assert - check help format
		expect(output).toContain("Chorus v0.1.0");
		expect(output).toContain("USAGE");
		expect(output).toContain("OPTIONS");
		expect(output).toContain("EXAMPLES");
		expect(output).toContain("DOCUMENTATION");
	});

	it("tsx src/index.tsx -v short flag works", () => {
		// Arrange & Act
		const output = execSync("npx tsx src/index.tsx -v", {
			encoding: "utf-8",
			timeout: 10000,
		});

		// Assert
		expect(output.trim()).toBe("0.1.0");
	});

	it("tsx src/index.tsx -h short flag works", () => {
		// Arrange & Act
		const output = execSync("npx tsx src/index.tsx -h", {
			encoding: "utf-8",
			timeout: 10000,
		});

		// Assert
		expect(output).toContain("USAGE");
		expect(output).toContain("Chorus v0.1.0");
	});

	it("tsx src/index.tsx --unknown-flag shows help", () => {
		// Arrange & Act
		const output = execSync("npx tsx src/index.tsx --abc", {
			encoding: "utf-8",
			timeout: 10000,
		});

		// Assert - should show help output
		expect(output).toContain("USAGE");
		expect(output).toContain("OPTIONS");
	});

	it("tsx src/index.tsx with unknown command shows help", () => {
		// Arrange & Act
		const output = execSync("npx tsx src/index.tsx foobar", {
			encoding: "utf-8",
			timeout: 10000,
		});

		// Assert - should show help output
		expect(output).toContain("USAGE");
		expect(output).toContain("OPTIONS");
	});
});
