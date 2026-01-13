import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AgentLogService } from "./AgentLogService.js";

describe("AgentLogService", () => {
	let projectDir: string;
	let service: AgentLogService;

	beforeEach(() => {
		projectDir = join(process.cwd(), "test-fixtures", `agentlog-${Date.now()}`);
		mkdirSync(projectDir, { recursive: true });
		service = new AgentLogService(projectDir);
	});

	afterEach(() => {
		rmSync(projectDir, { recursive: true, force: true });
	});

	it("logStart writes start event to log file", () => {
		// Arrange
		const persona = "chip";
		const taskId = "ch-abc1";

		// Act
		service.logStart(persona, taskId);

		// Assert
		const logPath = join(
			projectDir,
			".chorus",
			"agents",
			persona,
			"logs",
			`${taskId}.jsonl`,
		);
		const content = readFileSync(logPath, "utf-8");
		const entry = JSON.parse(content.trim());
		expect(entry.event).toBe("start");
		expect(entry.taskId).toBe(taskId);
		expect(entry.timestamp).toBeDefined();
	});

	it("logIteration writes iteration event with input/output", () => {
		// Arrange
		const persona = "chip";
		const taskId = "ch-abc1";
		service.logStart(persona, taskId);

		// Act
		service.logIteration(persona, taskId, 1, "test input", "test output");

		// Assert
		const logPath = join(
			projectDir,
			".chorus",
			"agents",
			persona,
			"logs",
			`${taskId}.jsonl`,
		);
		const lines = readFileSync(logPath, "utf-8").trim().split("\n");
		const entry = JSON.parse(lines[1]);
		expect(entry.event).toBe("iteration");
		expect(entry.number).toBe(1);
		expect(entry.input).toBe("test input");
		expect(entry.output).toBe("test output");
	});

	it("logSignal writes signal event with type and optional payload", () => {
		// Arrange
		const persona = "sage";
		const taskId = "ch-xyz1";
		service.logStart(persona, taskId);

		// Act
		service.logSignal(persona, taskId, "PROGRESS", "50");

		// Assert
		const logPath = join(
			projectDir,
			".chorus",
			"agents",
			persona,
			"logs",
			`${taskId}.jsonl`,
		);
		const lines = readFileSync(logPath, "utf-8").trim().split("\n");
		const entry = JSON.parse(lines[1]);
		expect(entry.event).toBe("signal");
		expect(entry.type).toBe("PROGRESS");
		expect(entry.payload).toBe("50");
	});

	it("logComplete writes complete event with duration and iterations", () => {
		// Arrange
		const persona = "chip";
		const taskId = "ch-abc1";
		service.logStart(persona, taskId);

		// Act
		service.logComplete(persona, taskId, 300000, 3);

		// Assert
		const logPath = join(
			projectDir,
			".chorus",
			"agents",
			persona,
			"logs",
			`${taskId}.jsonl`,
		);
		const lines = readFileSync(logPath, "utf-8").trim().split("\n");
		const entry = JSON.parse(lines[1]);
		expect(entry.event).toBe("complete");
		expect(entry.durationMs).toBe(300000);
		expect(entry.iterations).toBe(3);
	});

	it("logError writes error event with error message", () => {
		// Arrange
		const persona = "patch";
		const taskId = "ch-bug1";
		service.logStart(persona, taskId);

		// Act
		service.logError(persona, taskId, new Error("Test error"));

		// Assert
		const logPath = join(
			projectDir,
			".chorus",
			"agents",
			persona,
			"logs",
			`${taskId}.jsonl`,
		);
		const lines = readFileSync(logPath, "utf-8").trim().split("\n");
		const entry = JSON.parse(lines[1]);
		expect(entry.event).toBe("error");
		expect(entry.error).toBe("Test error");
	});

	it("creates log directory if not exists", () => {
		// Arrange
		const persona = "chip";
		const taskId = "ch-new1";

		// Act - first call creates directory
		service.logStart(persona, taskId);

		// Assert
		const logPath = join(
			projectDir,
			".chorus",
			"agents",
			persona,
			"logs",
			`${taskId}.jsonl`,
		);
		const content = readFileSync(logPath, "utf-8");
		expect(content.length).toBeGreaterThan(0);
	});

	it("appends multiple events to same log file", () => {
		// Arrange
		const persona = "chip";
		const taskId = "ch-multi";

		// Act
		service.logStart(persona, taskId);
		service.logIteration(persona, taskId, 1, "in1", "out1");
		service.logIteration(persona, taskId, 2, "in2", "out2");
		service.logComplete(persona, taskId, 60000, 2);

		// Assert
		const logPath = join(
			projectDir,
			".chorus",
			"agents",
			persona,
			"logs",
			`${taskId}.jsonl`,
		);
		const lines = readFileSync(logPath, "utf-8").trim().split("\n");
		expect(lines.length).toBe(4);

		const events = lines.map((line) => JSON.parse(line).event);
		expect(events).toEqual(["start", "iteration", "iteration", "complete"]);
	});
});
