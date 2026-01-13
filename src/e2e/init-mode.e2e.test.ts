/**
 * E2E tests for Init Mode with ConfigWizard keyboard navigation.
 * Tests the fix for ch-utha: ConfigWizard keyboard input handling.
 */
import { execSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	cleanupPty,
	Keys,
	type PtyTestResult,
	renderAppWithPty,
	sendKey,
} from "../test-utils/pty-helpers.js";

describe("E2E: Init Mode with ConfigWizard (PTY)", () => {
	let ptyResult: PtyTestResult | null = null;
	let projectDir: string;

	beforeEach(() => {
		// Create a fresh temp directory without .chorus for each test
		projectDir = join(tmpdir(), `chorus-init-test-${Date.now()}`);
		mkdirSync(projectDir, { recursive: true });

		// Initialize git repo (required for Init Mode)
		execSync("git init", { cwd: projectDir, stdio: "pipe" });
		execSync('git commit --allow-empty -m "init"', {
			cwd: projectDir,
			stdio: "pipe",
		});
	});

	afterEach(() => {
		if (ptyResult) {
			cleanupPty(ptyResult);
			ptyResult = null;
		}
		// Clean up temp directory
		try {
			rmSync(projectDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	it("Init Mode starts when .chorus directory does not exist", async () => {
		// Arrange & Act
		ptyResult = renderAppWithPty([], { cwd: projectDir });

		// Assert - should show Init Mode checking prerequisites
		await ptyResult.waitForText("Checking", 10000);
		const output = ptyResult.getCleanOutput();
		// Just verify "Checking" appears (prerequisites screen)
		expect(output).toContain("Checking");
	}, 15000);

	it("ConfigWizard shows Step 2/5 - Project Detection", async () => {
		// Arrange & Act
		ptyResult = renderAppWithPty([], { cwd: projectDir });

		// Assert - should eventually show Step 2/5
		await ptyResult.waitForText("Step 2/5", 15000);
		const output = ptyResult.getCleanOutput();
		expect(output).toContain("Project Detection");
	}, 20000);

	it("Enter key advances ConfigWizard to Step 3/5", async () => {
		// Arrange
		ptyResult = renderAppWithPty([], { cwd: projectDir });
		await ptyResult.waitForText("Step 2/5", 15000);

		// Act - Press Enter to advance
		await sendKey(ptyResult, Keys.ENTER, 500);

		// Assert - should advance to Step 3/5
		await ptyResult.waitForText("Step 3/5", 5000);
		const output = ptyResult.getCleanOutput();
		expect(output).toContain("Quality Commands");
	}, 25000);

	it("Multiple Enter presses advance through all wizard steps", async () => {
		// Arrange
		ptyResult = renderAppWithPty([], { cwd: projectDir });
		await ptyResult.waitForText("Step 2/5", 15000);

		// Act - Press Enter twice to reach Step 4/5
		await sendKey(ptyResult, Keys.ENTER, 500);
		await ptyResult.waitForText("Step 3/5", 5000);
		await sendKey(ptyResult, Keys.ENTER, 500);

		// Assert - should advance to Step 4/5 (validation rules)
		await ptyResult.waitForText("Step 4/5", 5000);
		const output = ptyResult.getCleanOutput();
		expect(output).toMatch(/validation|rules/i);
	}, 30000);

	it("Completing wizard calls onComplete (transitions past Step 4/5)", async () => {
		// Arrange
		ptyResult = renderAppWithPty([], { cwd: projectDir });
		await ptyResult.waitForText("Step 2/5", 15000);

		// Act - Press Enter three times to complete wizard
		await sendKey(ptyResult, Keys.ENTER, 500);
		await ptyResult.waitForText("Step 3/5", 5000);
		await sendKey(ptyResult, Keys.ENTER, 500);
		await ptyResult.waitForText("Step 4/5", 5000);

		// Final Enter should trigger onComplete callback
		await sendKey(ptyResult, Keys.ENTER, 500);

		// Assert - Wait a moment for transition
		await new Promise((resolve) => setTimeout(resolve, 1000));
		const output = ptyResult.getCleanOutput();

		// Should either show Step 5/5 or transition away from wizard
		// The wizard has 4 internal steps mapped to Steps 2-4/5 + Step 5/5 (creating project)
		// OR it might transition to a completion state
		expect(output.includes("Step 5") || !output.includes("Step 4/5")).toBe(
			true,
		);
	}, 35000);
});
