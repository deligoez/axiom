/**
 * INT-26: Agent Data Storage Integration
 *
 * Integration tests for the full agent data storage lifecycle.
 * Tests verify that AgentDataIntegration correctly writes data to disk.
 */

import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AgentDataIntegration } from "../services/AgentDataIntegration.js";

describe("INT-26: Agent Data Storage", () => {
	let tempDir: string;
	let integration: AgentDataIntegration;

	beforeEach(() => {
		// Create isolated temp directory for each test
		tempDir = mkdtempSync(join(tmpdir(), "agent-data-e2e-"));
		// Create .chorus directory structure
		mkdirSync(join(tempDir, ".chorus", "agents"), { recursive: true });
		// Create integration instance
		integration = new AgentDataIntegration({ projectDir: tempDir });
	});

	afterEach(() => {
		// Cleanup temp directory
		if (tempDir && existsSync(tempDir)) {
			rmSync(tempDir, { recursive: true, force: true });
		}
	});

	it("creates log file in .chorus/agents/{persona}/logs/", () => {
		// Arrange
		const persona = "chip";
		const taskId = "ch-test1";
		const expectedLogPath = join(
			tempDir,
			".chorus",
			"agents",
			persona,
			"logs",
			`${taskId}.jsonl`,
		);

		// Act - Start agent with task
		integration.onAgentStart(persona, taskId);

		// Assert - File exists at correct location
		expect(existsSync(expectedLogPath)).toBe(true);
	});

	it("log file contains lifecycle events (start, iteration, complete)", () => {
		// Arrange
		const persona = "sage";
		const taskId = "ch-test2";
		const logPath = join(
			tempDir,
			".chorus",
			"agents",
			persona,
			"logs",
			`${taskId}.jsonl`,
		);

		// Act - Simulate full task lifecycle
		integration.onAgentStart(persona, taskId);
		integration.onIteration(persona, taskId, 1, "input1", "output1");
		integration.onIteration(persona, taskId, 2, "input2", "output2");
		integration.onComplete(persona, taskId);

		// Assert - Read log file and parse events
		const logContent = readFileSync(logPath, "utf-8");
		const events = logContent
			.trim()
			.split("\n")
			.map((line) => JSON.parse(line));

		expect(events).toHaveLength(4);
		expect(events[0].event).toBe("start");
		expect(events[0].taskId).toBe(taskId);
		expect(events[1].event).toBe("iteration");
		expect(events[1].number).toBe(1);
		expect(events[2].event).toBe("iteration");
		expect(events[2].number).toBe(2);
		expect(events[3].event).toBe("complete");
		expect(events[3].iterations).toBe(2);
	});

	it("updates metrics after task completion", () => {
		// Arrange
		const persona = "patch";
		const taskId = "ch-test3";
		const metricsPath = join(
			tempDir,
			".chorus",
			"agents",
			persona,
			"metrics.json",
		);

		// Act - Complete a task
		integration.onAgentStart(persona, taskId);
		integration.onIteration(persona, taskId, 1, "in", "out");
		integration.onComplete(persona, taskId);

		// Assert - Metrics file created and updated
		expect(existsSync(metricsPath)).toBe(true);
		const metrics = JSON.parse(readFileSync(metricsPath, "utf-8"));
		expect(metrics.tasks.completed).toBe(1);
		expect(metrics.tasks.successRate).toBe(1);
		expect(metrics.iterations.total).toBe(1);
	});

	it("accumulates metrics across multiple tasks", () => {
		// Arrange
		const persona = "archie";
		const metricsPath = join(
			tempDir,
			".chorus",
			"agents",
			persona,
			"metrics.json",
		);

		// Act - Complete 3 tasks
		integration.onAgentStart(persona, "ch-task1");
		integration.onIteration(persona, "ch-task1", 1, "in1", "out1");
		integration.onComplete(persona, "ch-task1");

		integration.onAgentStart(persona, "ch-task2");
		integration.onIteration(persona, "ch-task2", 1, "in2a", "out2a");
		integration.onIteration(persona, "ch-task2", 2, "in2b", "out2b");
		integration.onComplete(persona, "ch-task2");

		integration.onAgentStart(persona, "ch-task3");
		integration.onIteration(persona, "ch-task3", 1, "in3a", "out3a");
		integration.onIteration(persona, "ch-task3", 2, "in3b", "out3b");
		integration.onIteration(persona, "ch-task3", 3, "in3c", "out3c");
		integration.onComplete(persona, "ch-task3");

		// Assert - Metrics accumulated correctly
		const metrics = JSON.parse(readFileSync(metricsPath, "utf-8"));
		expect(metrics.tasks.completed).toBe(3);
		expect(metrics.iterations.total).toBe(6); // 1 + 2 + 3
		expect(metrics.iterations.avgPerTask).toBe(2); // 6 / 3
		expect(metrics.iterations.maxPerTask).toBe(3);
	});

	it("stores learnings in agent-specific file", () => {
		// Arrange
		const persona = "echo";
		const category = "Performance";
		const learning = "Use memoization for expensive calculations";
		const learningsPath = join(
			tempDir,
			".chorus",
			"agents",
			persona,
			"learnings.md",
		);

		// Act - Extract a learning
		integration.onLearning(persona, category, learning);

		// Assert - Learning stored in agent-specific file
		expect(existsSync(learningsPath)).toBe(true);
		const content = readFileSync(learningsPath, "utf-8");
		expect(content).toContain("# Echo's Learnings");
		expect(content).toContain("## Performance");
		expect(content).toContain("Use memoization for expensive calculations");
	});
});
