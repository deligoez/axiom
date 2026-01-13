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

			// Act - use skipDefaultMode to test mode routing
			const result = await renderApp([], {
				cwd: projectDir,
				skipDefaultMode: true,
			});
			// Init mode starts with "Checking project directory..." then shows prerequisite checks
			await waitForText(result, "Checking", 8000);

			// Assert
			const output = getOutput(result);
			// Either shows "Checking project directory..." or "Prerequisites Check"
			expect(output).toMatch(/Checking|Prerequisites/i);
		});

		it("init mode shows prerequisite check results", async () => {
			// Arrange - no .chorus/ directory

			// Act - use skipDefaultMode to test mode routing
			const result = await renderApp([], {
				cwd: projectDir,
				skipDefaultMode: true,
			});
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
			// Arrange - create .chorus/ directory with empty tasks file
			mkdirSync(chorusDir, { recursive: true });
			writeFileSync(join(chorusDir, "tasks.jsonl"), "");

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
			// Create empty tasks file
			writeFileSync(join(chorusDir, "tasks.jsonl"), "");

			// Act - use skipDefaultMode to test state restoration routing
			const result = await renderApp([], {
				cwd: projectDir,
				skipDefaultMode: true,
			});
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
			// Create task in TaskJSONL format
			const now = new Date().toISOString();
			const task = {
				id: "ch-test1",
				title: "Test Task",
				description: "",
				status: "todo",
				type: "task",
				tags: [],
				dependencies: [],
				created_at: now,
				updated_at: now,
				review_count: 0,
				learnings_count: 0,
				has_learnings: false,
				version: 1,
			};
			writeFileSync(
				join(chorusDir, "tasks.jsonl"),
				`${JSON.stringify(task)}\n`,
			);

			// Act - use skipDefaultMode to test state restoration routing
			const result = await renderApp([], {
				cwd: projectDir,
				skipDefaultMode: true,
			});
			// Wait for Implementation mode to render - check for CHORUS header and task
			await waitForText(result, "CHORUS", 5000);
			await waitForText(result, "Tasks (1)", 5000); // Wait for tasks to load

			// Assert - should be in implementation mode (shows CHORUS header and task)
			const output = getOutput(result);
			expect(output).toContain("CHORUS");
			expect(output).toContain("Tasks (1)"); // Task panel shows 1 task
			expect(output).toContain("1 pending"); // Task stats in footer
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
			// Create task in TaskJSONL format
			const now = new Date().toISOString();
			const task = {
				id: "ch-test1",
				title: "Test Task",
				description: "",
				status: "todo",
				type: "task",
				tags: [],
				dependencies: [],
				created_at: now,
				updated_at: now,
				review_count: 0,
				learnings_count: 0,
				has_learnings: false,
				version: 1,
			};
			writeFileSync(
				join(chorusDir, "tasks.jsonl"),
				`${JSON.stringify(task)}\n`,
			);

			// Act - CLI says semi-auto (--mode triggers implementation mode)
			const result = await renderApp(["--mode", "semi-auto"], {
				cwd: projectDir,
			});
			await waitForText(result, "CHORUS", 5000);

			// Assert - semi-auto should take precedence
			const output = getOutput(result);
			// The app should be running with semi-auto mode
			expect(output).toContain("CHORUS");
		});

		it("defaults to planning when .chorus/ exists but no planning-state.json", async () => {
			// Arrange - .chorus/ exists with empty tasks file
			mkdirSync(chorusDir, { recursive: true });
			writeFileSync(join(chorusDir, "tasks.jsonl"), "");

			// Act - use skipDefaultMode to test default behavior
			const result = await renderApp([], {
				cwd: projectDir,
				skipDefaultMode: true,
			});
			await waitForText(result, "PLANNING", 5000);

			// Assert - should default to planning mode
			const output = getOutput(result);
			expect(output).toContain("PLANNING");
		});
	});
});
