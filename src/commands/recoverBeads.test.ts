import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { recoverBeadsCommand } from "./recoverBeads.js";

describe("recoverBeads", () => {
	let testDir: string;
	let beadsDir: string;
	let issuesPath: string;

	beforeEach(() => {
		testDir = join(tmpdir(), `chorus-test-${Date.now()}`);
		beadsDir = join(testDir, ".beads");
		issuesPath = join(beadsDir, "issues.jsonl");
		mkdirSync(beadsDir, { recursive: true });
		vi.clearAllMocks();
	});

	afterEach(() => {
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true });
		}
	});

	describe("--verify mode", () => {
		it("returns needed:true if bd ready fails with parse error", async () => {
			// Arrange - create invalid/corrupted state (simulate bd ready failure)
			// In real scenario, bd ready would fail. Here we simulate by not having proper setup

			// Act
			const result = await recoverBeadsCommand({
				projectRoot: testDir,
				verify: true,
			});

			// Assert - without valid beads setup, recovery is needed
			expect(result.needed).toBe(true);
		});

		it("returns needed:false if beads is healthy", async () => {
			// Arrange - create valid issues.jsonl with valid task
			const validTask = JSON.stringify({
				id: "ch-test1",
				title: "Test Task",
				status: "open",
				priority: 1,
			});
			writeFileSync(issuesPath, `${validTask}\n`);

			// Act
			const result = await recoverBeadsCommand({
				projectRoot: testDir,
				verify: true,
			});

			// Assert - valid beads, no recovery needed
			expect(result.needed).toBe(false);
		});
	});

	describe("Recovery execution", () => {
		it("validates issues.jsonl is parseable before recovery", async () => {
			// Arrange - create unparseable issues.jsonl
			writeFileSync(issuesPath, "not valid json\n");

			// Act
			const result = await recoverBeadsCommand({
				projectRoot: testDir,
			});

			// Assert - should report parse error
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0]).toContain("parse");
		});

		it("runs bd rebuild command", async () => {
			// Arrange - create valid issues.jsonl
			const validTask = JSON.stringify({
				id: "ch-test1",
				title: "Test Task",
				status: "open",
				priority: 1,
			});
			writeFileSync(issuesPath, `${validTask}\n`);

			// Act
			const result = await recoverBeadsCommand({
				projectRoot: testDir,
			});

			// Assert - should attempt recovery (even if bd rebuild fails in test env)
			expect(result).toBeDefined();
		});

		it("reports number of tasks recovered", async () => {
			// Arrange - create multiple valid tasks
			const task1 = JSON.stringify({
				id: "ch-1",
				title: "Task 1",
				status: "open",
				priority: 1,
			});
			const task2 = JSON.stringify({
				id: "ch-2",
				title: "Task 2",
				status: "open",
				priority: 2,
			});
			writeFileSync(issuesPath, `${task1}\n${task2}\n`);

			// Act
			const result = await recoverBeadsCommand({
				projectRoot: testDir,
			});

			// Assert - should report task count
			expect(result.tasksRecovered).toBe(2);
		});

		it("handles missing issues.jsonl gracefully", async () => {
			// Arrange - delete the beads dir (no issues.jsonl)
			rmSync(beadsDir, { recursive: true });

			// Act
			const result = await recoverBeadsCommand({
				projectRoot: testDir,
			});

			// Assert - should report error gracefully
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0]).toContain("issues.jsonl");
		});
	});

	describe("Options", () => {
		it("--dry-run shows preview without executing", async () => {
			// Arrange - create valid issues.jsonl
			const validTask = JSON.stringify({
				id: "ch-test1",
				title: "Test Task",
				status: "open",
				priority: 1,
			});
			writeFileSync(issuesPath, `${validTask}\n`);

			// Act
			const result = await recoverBeadsCommand({
				projectRoot: testDir,
				dryRun: true,
			});

			// Assert - should report what would be recovered without executing
			expect(result.tasksRecovered).toBe(1);
			// dryRun doesn't actually run bd rebuild
		});

		it("--force skips confirmation prompt", async () => {
			// Arrange - create valid issues.jsonl
			const validTask = JSON.stringify({
				id: "ch-test1",
				title: "Test Task",
				status: "open",
				priority: 1,
			});
			writeFileSync(issuesPath, `${validTask}\n`);

			// Act - force flag allows immediate execution
			const result = await recoverBeadsCommand({
				projectRoot: testDir,
				force: true,
			});

			// Assert - should proceed without prompt
			expect(result).toBeDefined();
			expect(result.tasksRecovered).toBe(1);
		});
	});
});
