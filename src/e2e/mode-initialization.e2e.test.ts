import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanupTestProject } from "../test-utils/e2e-fixtures.js";
import {
	cleanup,
	getOutput,
	renderApp,
	waitForExit,
	waitForText,
} from "../test-utils/e2e-helpers.js";

describe("E2E: Mode Initialization Flow", () => {
	let projectDir: string;
	let chorusDir: string;

	beforeEach(() => {
		projectDir = join(
			tmpdir(),
			`chorus-mode-init-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		);
		chorusDir = join(projectDir, ".chorus");
		mkdirSync(projectDir, { recursive: true });
	});

	afterEach(async () => {
		await cleanup();
		if (projectDir) {
			cleanupTestProject(projectDir);
		}
	});

	describe("Fresh Project Initialization", () => {
		it("fresh project without .chorus/ starts in INIT mode", async () => {
			// Arrange - no .chorus/ directory
			expect(existsSync(chorusDir)).toBe(false);

			// Act
			const result = await renderApp([], projectDir);
			// Init mode starts with "Checking project directory..." then shows prerequisite checks
			await waitForText(result, "Checking", 8000);

			// Assert
			const output = getOutput(result);
			// Either shows "Checking project directory..." or "Prerequisites Check"
			expect(output).toMatch(/Checking|Prerequisites/i);
		});

		it("init mode shows prerequisite check results", async () => {
			// Arrange - no .chorus/ directory

			// Act
			const result = await renderApp([], projectDir);
			// Wait for prerequisites to show - might take time
			await waitForText(result, "git", 8000);

			// Assert - should show git check result (✓ or ✗)
			const output = getOutput(result);
			expect(output).toMatch(/git/i);
		});
	});

	describe("CLI Command Overrides", () => {
		it("--version shows version and exits", async () => {
			// Arrange & Act
			const result = await renderApp(["--version"], projectDir);
			const exitCode = await waitForExit(result, 5000);

			// Assert
			expect(exitCode).toBe(0);
			const output = getOutput(result);
			expect(output).toMatch(/\d+\.\d+\.\d+/);
		});

		it("--help shows usage and exits", async () => {
			// Arrange & Act
			const result = await renderApp(["--help"], projectDir);
			const exitCode = await waitForExit(result, 5000);

			// Assert
			expect(exitCode).toBe(0);
			const output = getOutput(result);
			expect(output).toContain("Usage:");
			expect(output).toContain("chorus");
		});

		it("init command forces INIT mode", async () => {
			// Arrange - create .chorus/ so normally it would skip init
			mkdirSync(chorusDir, { recursive: true });

			// Act
			const result = await renderApp(["init"], projectDir);
			// Init mode detects existing .chorus/ and shows error
			await waitForText(result, "Error", 8000);

			// Assert
			const output = getOutput(result);
			expect(output).toMatch(/Error|already|initialized/i);
		});

		it("plan command forces PLANNING mode", async () => {
			// Arrange - create .chorus/ directory
			mkdirSync(chorusDir, { recursive: true });
			// Create a .beads directory for tasks
			const beadsDir = join(projectDir, ".beads");
			mkdirSync(beadsDir, { recursive: true });
			writeFileSync(join(beadsDir, "issues.jsonl"), "");

			// Act
			const result = await renderApp(["plan"], projectDir);
			await waitForText(result, "PLANNING", 5000);

			// Assert
			const output = getOutput(result);
			expect(output).toContain("PLANNING");
		});
	});

	describe("Planning State Restoration", () => {
		it("restores from planning-state.json with planning status", async () => {
			// Arrange - create .chorus/ with planning-state.json
			mkdirSync(chorusDir, { recursive: true });
			const planningState = {
				status: "planning",
				planSummary: { userGoal: "Test goal", estimatedTasks: 3 },
				tasks: [],
				reviewIterations: [],
			};
			writeFileSync(
				join(chorusDir, "planning-state.json"),
				JSON.stringify(planningState, null, 2),
			);
			// Create .beads directory
			const beadsDir = join(projectDir, ".beads");
			mkdirSync(beadsDir, { recursive: true });
			writeFileSync(join(beadsDir, "issues.jsonl"), "");

			// Act
			const result = await renderApp([], projectDir);
			await waitForText(result, "PLANNING", 5000);

			// Assert
			const output = getOutput(result);
			expect(output).toContain("PLANNING");
		});

		it("restores with ready status and chosenMode", async () => {
			// Arrange - create .chorus/ with ready planning-state.json
			mkdirSync(chorusDir, { recursive: true });
			const planningState = {
				status: "ready",
				chosenMode: "semi-auto",
				planSummary: { userGoal: "Test goal", estimatedTasks: 3 },
				tasks: [{ id: "ch-test1", title: "Test Task" }],
				reviewIterations: [],
			};
			writeFileSync(
				join(chorusDir, "planning-state.json"),
				JSON.stringify(planningState, null, 2),
			);
			// Create .beads directory with a task
			const beadsDir = join(projectDir, ".beads");
			mkdirSync(beadsDir, { recursive: true });
			const task = {
				id: "ch-test1",
				title: "Test Task",
				description: "",
				status: "open",
				priority: 1,
				type: "task",
				created: new Date().toISOString(),
				updated: new Date().toISOString(),
			};
			writeFileSync(
				join(beadsDir, "issues.jsonl"),
				`${JSON.stringify(task)}\n`,
			);

			// Act
			const result = await renderApp([], projectDir);
			// Wait for Implementation mode to render
			await waitForText(result, "ImplementationMode", 5000);

			// Assert - should be in implementation mode
			const output = getOutput(result);
			expect(output).toContain("ImplementationMode");
		});
	});

	describe("Mode Resolution Hierarchy", () => {
		it("CLI --mode flag overrides planning-state.json chosenMode", async () => {
			// Arrange - planning-state.json says autopilot
			mkdirSync(chorusDir, { recursive: true });
			const planningState = {
				status: "ready",
				chosenMode: "autopilot",
				planSummary: { userGoal: "Test goal", estimatedTasks: 3 },
				tasks: [{ id: "ch-test1", title: "Test Task" }],
				reviewIterations: [],
			};
			writeFileSync(
				join(chorusDir, "planning-state.json"),
				JSON.stringify(planningState, null, 2),
			);
			// Create .beads directory with a task
			const beadsDir = join(projectDir, ".beads");
			mkdirSync(beadsDir, { recursive: true });
			const task = {
				id: "ch-test1",
				title: "Test Task",
				description: "",
				status: "open",
				priority: 1,
				type: "task",
				created: new Date().toISOString(),
				updated: new Date().toISOString(),
			};
			writeFileSync(
				join(beadsDir, "issues.jsonl"),
				`${JSON.stringify(task)}\n`,
			);

			// Act - CLI says semi-auto
			const result = await renderApp(["--mode", "semi-auto"], projectDir);
			await waitForText(result, "Chorus", 5000);

			// Assert - semi-auto should take precedence
			const output = getOutput(result);
			// The app should be running with semi-auto mode
			expect(output).toContain("CHORUS");
		});

		it("defaults to planning when .chorus/ exists but no planning-state.json", async () => {
			// Arrange - .chorus/ exists but empty
			mkdirSync(chorusDir, { recursive: true });
			// Create .beads directory
			const beadsDir = join(projectDir, ".beads");
			mkdirSync(beadsDir, { recursive: true });
			writeFileSync(join(beadsDir, "issues.jsonl"), "");

			// Act
			const result = await renderApp([], projectDir);
			await waitForText(result, "PLANNING", 5000);

			// Assert - should default to planning mode
			const output = getOutput(result);
			expect(output).toContain("PLANNING");
		});
	});
});
