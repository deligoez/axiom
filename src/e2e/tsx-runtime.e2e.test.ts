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

		// Assert
		expect(output).toContain("Usage:");
		expect(output).toContain("--version");
		expect(output).toContain("--help");
		expect(output).toContain("--mode");
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
		expect(output).toContain("Usage:");
	});
});
