import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanupTestProject } from "../test-utils/e2e-fixtures.js";
import {
	cleanup,
	getOutput,
	renderApp,
	waitForText,
} from "../test-utils/e2e-helpers.js";

describe("E2E: Fresh Project Init", () => {
	let projectDir: string;

	beforeEach(() => {
		// Create a temp directory WITHOUT .beads folder
		projectDir = join(
			tmpdir(),
			`chorus-fresh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		);
		mkdirSync(projectDir, { recursive: true });
	});

	afterEach(async () => {
		await cleanup();
		if (projectDir) {
			cleanupTestProject(projectDir);
		}
	});

	it("starts in fresh directory without errors", async () => {
		// Arrange & Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Chorus", 5000);

		// Assert
		const output = getOutput(result);
		expect(output).toContain("Chorus");
		// App should not crash - if it did, we wouldn't get here
	});

	it("shows empty task state", async () => {
		// Arrange & Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "0 tasks", 5000);

		// Assert
		const output = getOutput(result);
		expect(output).toContain("0 tasks");
	});

	it("can create first task via file", async () => {
		// Arrange - pre-create .beads directory so watcher is ready
		const beadsDir = join(projectDir, ".beads");
		mkdirSync(beadsDir, { recursive: true });
		// Create empty issues file first
		writeFileSync(join(beadsDir, "issues.jsonl"), "");

		// Start app
		const result = await renderApp([], projectDir);
		await waitForText(result, "0 tasks", 5000);

		// Act - write a task to the file
		const task = {
			id: "ch-test1",
			title: "First Test Task",
			description: "",
			status: "open",
			priority: 2,
			type: "task",
			created: new Date().toISOString(),
			updated: new Date().toISOString(),
		};
		writeFileSync(join(beadsDir, "issues.jsonl"), `${JSON.stringify(task)}\n`);

		// Assert - wait for file watcher to pick up the new task
		// Use longer timeout for file watcher (can be slow under parallel test load)
		await waitForText(result, "1 task", 10000);
		const output = getOutput(result);
		expect(output).toContain("1 task");
	}, 15000);

	it("first task appears in panel", async () => {
		// Arrange - create project with a task already
		const beadsDir = join(projectDir, ".beads");
		mkdirSync(beadsDir, { recursive: true });
		const task = {
			id: "ch-init1",
			title: "Initial Task",
			description: "",
			status: "open",
			priority: 1,
			type: "task",
			created: new Date().toISOString(),
			updated: new Date().toISOString(),
		};
		writeFileSync(join(beadsDir, "issues.jsonl"), `${JSON.stringify(task)}\n`);

		// Act
		const result = await renderApp([], projectDir);
		await waitForText(result, "Initial Task", 5000);

		// Assert
		const output = getOutput(result);
		expect(output).toContain("Initial Task");
	});
});
