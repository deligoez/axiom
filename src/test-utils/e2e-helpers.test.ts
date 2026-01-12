import { afterEach, describe, expect, it } from "vitest";
import {
	cleanup,
	getOutput,
	hasExited,
	renderApp,
	waitForExit,
	waitForText,
} from "./e2e-helpers.js";

describe("E2E Helpers", () => {
	afterEach(async () => {
		await cleanup();
	});

	describe("renderApp", () => {
		it("spawns process and shows output", async () => {
			// Arrange
			const args = ["--version"];

			// Act
			const result = await renderApp(args);

			// Assert
			await waitForText(result, "0.1.0", 5000);
			const output = getOutput(result);
			expect(output).toContain("0.1.0");
		});
	});

	describe("waitForText", () => {
		it("finds text in output", async () => {
			// Arrange
			const result = await renderApp(["--help"]);

			// Act & Assert
			await expect(
				waitForText(result, "Usage:", 5000),
			).resolves.toBeUndefined();
		});
	});

	describe("hasExited", () => {
		it("detects process exit", async () => {
			// Arrange
			const result = await renderApp(["--version"]);

			// Act - wait for exit using polling with timeout
			const exitCode = await waitForExit(result, 5000);

			// Assert
			expect(exitCode).toBe(0);
			const exitInfo = hasExited(result);
			expect(exitInfo).not.toBeNull();
			expect(exitInfo?.exitCode).toBe(0);
		});
	});
});
