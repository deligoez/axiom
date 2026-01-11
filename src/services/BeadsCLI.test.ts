import * as fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BeadsCLI } from "./BeadsCLI.js";

// Mock execa
vi.mock("execa", () => ({
	execa: vi.fn(),
	execaSync: vi.fn(),
}));

// Mock fs
vi.mock("node:fs", () => ({
	existsSync: vi.fn(),
}));

import { execa, execaSync } from "execa";

const mockExeca = vi.mocked(execa);
const mockExecaSync = vi.mocked(execaSync);
const mockExistsSync = vi.mocked(fs.existsSync);

describe("BeadsCLI", () => {
	let cli: BeadsCLI;

	beforeEach(() => {
		vi.clearAllMocks();
		cli = new BeadsCLI("/test/project");
	});

	// claimTask tests (2)
	it("claimTask() runs bd update with status and assignee", async () => {
		// Arrange
		mockExeca.mockResolvedValue({
			stdout: "Updated",
			stderr: "",
			exitCode: 0,
		} as never);

		// Act
		await cli.claimTask("ch-abc", "claude-1");

		// Assert
		expect(mockExeca).toHaveBeenCalledWith(
			"bd",
			["update", "ch-abc", "--status=in_progress", "--assignee=claude-1"],
			{ cwd: "/test/project", reject: false },
		);
	});

	it("claimTask() throws on bd error", async () => {
		// Arrange
		mockExeca.mockResolvedValue({
			stdout: "",
			stderr: "Error: Task not found",
			exitCode: 1,
		} as never);

		// Act & Assert
		await expect(cli.claimTask("ch-invalid", "agent")).rejects.toThrow(
			"Task not found",
		);
	});

	// releaseTask tests (2)
	it("releaseTask() runs bd update with open status and empty assignee", async () => {
		// Arrange
		mockExeca.mockResolvedValue({
			stdout: "Updated",
			stderr: "",
			exitCode: 0,
		} as never);

		// Act
		await cli.releaseTask("ch-abc");

		// Assert
		expect(mockExeca).toHaveBeenCalledWith(
			"bd",
			["update", "ch-abc", "--status=open", "--assignee="],
			{ cwd: "/test/project", reject: false },
		);
	});

	it("releaseTask() throws on bd error", async () => {
		// Arrange
		mockExeca.mockResolvedValue({
			stdout: "",
			stderr: "Error: Failed",
			exitCode: 1,
		} as never);

		// Act & Assert
		await expect(cli.releaseTask("ch-invalid")).rejects.toThrow("Failed");
	});

	// getTask tests (3)
	it("getTask() returns parsed task for valid ID", async () => {
		// Arrange
		mockExeca.mockResolvedValue({
			stdout: JSON.stringify({
				id: "ch-abc",
				title: "Test Task",
				priority: 1,
				status: "open",
				labels: ["m1-infrastructure"],
				dependencies: [],
			}),
			stderr: "",
			exitCode: 0,
		} as never);

		// Act
		const task = await cli.getTask("ch-abc");

		// Assert
		expect(task).not.toBeNull();
		expect(task?.id).toBe("ch-abc");
		expect(task?.title).toBe("Test Task");
		expect(task?.priority).toBe(1);
	});

	it("getTask() returns null for invalid ID", async () => {
		// Arrange
		mockExeca.mockResolvedValue({
			stdout: "",
			stderr: "Error: Not found",
			exitCode: 1,
		} as never);

		// Act
		const task = await cli.getTask("ch-invalid");

		// Assert
		expect(task).toBeNull();
	});

	it("getTask() includes custom fields", async () => {
		// Arrange
		mockExeca.mockResolvedValue({
			stdout: JSON.stringify({
				id: "ch-abc",
				title: "Test",
				priority: 1,
				status: "open",
				labels: [],
				dependencies: [],
				custom: {
					model: "opus",
					agent: "claude",
					acceptance_criteria: ["test passes"],
				},
			}),
			stderr: "",
			exitCode: 0,
		} as never);

		// Act
		const task = await cli.getTask("ch-abc");

		// Assert
		expect(task?.custom?.model).toBe("opus");
		expect(task?.custom?.agent).toBe("claude");
		expect(task?.custom?.acceptance_criteria).toContain("test passes");
	});

	// getReadyTasks tests (6)
	it("getReadyTasks() returns array of ready tasks", async () => {
		// Arrange
		mockExeca.mockResolvedValue({
			stdout: JSON.stringify([
				{
					id: "ch-1",
					title: "Task 1",
					priority: 1,
					status: "open",
					labels: [],
				},
				{
					id: "ch-2",
					title: "Task 2",
					priority: 2,
					status: "open",
					labels: [],
				},
			]),
			stderr: "",
			exitCode: 0,
		} as never);

		// Act
		const tasks = await cli.getReadyTasks();

		// Assert
		expect(tasks).toHaveLength(2);
		expect(tasks[0].id).toBe("ch-1");
	});

	it("getReadyTasks() with excludeLabels filters out tasks with deferred label", async () => {
		// Arrange
		mockExeca.mockResolvedValue({
			stdout: JSON.stringify([
				{
					id: "ch-1",
					title: "Active",
					priority: 1,
					status: "open",
					labels: ["m1"],
				},
				{
					id: "ch-2",
					title: "Deferred",
					priority: 1,
					status: "open",
					labels: ["deferred"],
				},
			]),
			stderr: "",
			exitCode: 0,
		} as never);

		// Act
		const tasks = await cli.getReadyTasks({ excludeLabels: ["deferred"] });

		// Assert
		expect(tasks).toHaveLength(1);
		expect(tasks[0].id).toBe("ch-1");
	});

	it("getReadyTasks() with includeLabels returns only tasks with that label", async () => {
		// Arrange
		mockExeca.mockResolvedValue({
			stdout: JSON.stringify([
				{
					id: "ch-1",
					title: "M1 Task",
					priority: 1,
					status: "open",
					labels: ["m1-infrastructure"],
				},
				{
					id: "ch-2",
					title: "M2 Task",
					priority: 1,
					status: "open",
					labels: ["m2-agent"],
				},
			]),
			stderr: "",
			exitCode: 0,
		} as never);

		// Act
		const tasks = await cli.getReadyTasks({
			includeLabels: ["m1-infrastructure"],
		});

		// Assert
		expect(tasks).toHaveLength(1);
		expect(tasks[0].id).toBe("ch-1");
	});

	it("getReadyTasks() applies exclude before include (exclude wins)", async () => {
		// Arrange - Tasks: A (m1, deferred), B (m1), C (m2)
		mockExeca.mockResolvedValue({
			stdout: JSON.stringify([
				{
					id: "A",
					title: "A",
					priority: 1,
					status: "open",
					labels: ["m1", "deferred"],
				},
				{ id: "B", title: "B", priority: 1, status: "open", labels: ["m1"] },
				{ id: "C", title: "C", priority: 1, status: "open", labels: ["m2"] },
			]),
			stderr: "",
			exitCode: 0,
		} as never);

		// Act
		const tasks = await cli.getReadyTasks({
			includeLabels: ["m1"],
			excludeLabels: ["deferred"],
		});

		// Assert - Only B (A excluded by deferred, C filtered by include m1)
		expect(tasks).toHaveLength(1);
		expect(tasks[0].id).toBe("B");
	});

	it("getReadyTasks() returns empty array on error", async () => {
		// Arrange
		mockExeca.mockResolvedValue({
			stdout: "",
			stderr: "Error",
			exitCode: 1,
		} as never);

		// Act
		const tasks = await cli.getReadyTasks();

		// Assert
		expect(tasks).toEqual([]);
	});

	it("getReadyTasks() with empty options returns all ready tasks", async () => {
		// Arrange
		mockExeca.mockResolvedValue({
			stdout: JSON.stringify([
				{
					id: "ch-1",
					title: "Task 1",
					priority: 1,
					status: "open",
					labels: [],
				},
			]),
			stderr: "",
			exitCode: 0,
		} as never);

		// Act
		const tasks = await cli.getReadyTasks({});

		// Assert
		expect(tasks).toHaveLength(1);
	});

	// createTask tests (3)
	it("createTask() runs bd create with priority, labels, depends", async () => {
		// Arrange
		mockExeca.mockResolvedValue({
			stdout: "Created ch-new: Test Task",
			stderr: "",
			exitCode: 0,
		} as never);

		// Act
		const id = await cli.createTask("Test Task", {
			priority: 1,
			labels: ["m1-infrastructure"],
			depends: ["ch-abc"],
		});

		// Assert
		expect(mockExeca).toHaveBeenCalledWith(
			"bd",
			[
				"create",
				"Test Task",
				"-p",
				"1",
				"-l",
				"m1-infrastructure",
				"--deps",
				"ch-abc",
			],
			{ cwd: "/test/project", reject: false },
		);
		expect(id).toBe("ch-new");
	});

	it("createTask() supports custom fields via --custom", async () => {
		// Arrange
		mockExeca.mockResolvedValue({
			stdout: "Created ch-xyz: Custom Task",
			stderr: "",
			exitCode: 0,
		} as never);

		// Act
		await cli.createTask("Custom Task", {
			model: "opus",
			agent: "claude",
			acceptanceCriteria: ["test passes"],
		});

		// Assert
		expect(mockExeca).toHaveBeenCalledWith(
			"bd",
			[
				"create",
				"Custom Task",
				"--custom",
				"model=opus",
				"--custom",
				"agent=claude",
				"--custom",
				"acceptance_criteria=test passes",
			],
			{ cwd: "/test/project", reject: false },
		);
	});

	it("createTask() returns created task ID", async () => {
		// Arrange
		mockExeca.mockResolvedValue({
			stdout: "Created ch-abc123: New Feature",
			stderr: "",
			exitCode: 0,
		} as never);

		// Act
		const id = await cli.createTask("New Feature");

		// Assert
		expect(id).toBe("ch-abc123");
	});

	// Utility tests (2)
	it("isAvailable() returns true if bd installed", () => {
		// Arrange
		mockExecaSync.mockReturnValue({ exitCode: 0 } as never);

		// Act
		const result = cli.isAvailable();

		// Assert
		expect(result).toBe(true);
	});

	it("isInitialized() returns true if .beads/ exists", () => {
		// Arrange
		mockExistsSync.mockReturnValue(true);

		// Act
		const result = cli.isInitialized();

		// Assert
		expect(result).toBe(true);
		expect(mockExistsSync).toHaveBeenCalledWith("/test/project/.beads");
	});

	// Task Closer tests (8) - F13
	it("closeTask() runs bd close with id", async () => {
		// Arrange
		mockExeca.mockResolvedValue({
			stdout: "Closed",
			stderr: "",
			exitCode: 0,
		} as never);

		// Act
		await cli.closeTask("ch-abc");

		// Assert
		expect(mockExeca).toHaveBeenCalledWith("bd", ["close", "ch-abc"], {
			cwd: "/test/project",
			reject: false,
		});
	});

	it("closeTask() supports optional comment", async () => {
		// Arrange
		mockExeca.mockResolvedValue({
			stdout: "Closed",
			stderr: "",
			exitCode: 0,
		} as never);

		// Act
		await cli.closeTask("ch-abc", "Task completed successfully");

		// Assert
		expect(mockExeca).toHaveBeenCalledWith(
			"bd",
			["close", "ch-abc", "--comment", "Task completed successfully"],
			{ cwd: "/test/project", reject: false },
		);
	});

	it("closeTask() throws on bd error", async () => {
		// Arrange
		mockExeca.mockResolvedValue({
			stdout: "",
			stderr: "Error: Cannot close",
			exitCode: 1,
		} as never);

		// Act & Assert
		await expect(cli.closeTask("ch-invalid")).rejects.toThrow("Cannot close");
	});

	it("reopenTask() changes status back to open", async () => {
		// Arrange
		mockExeca.mockResolvedValue({
			stdout: "Updated",
			stderr: "",
			exitCode: 0,
		} as never);

		// Act
		await cli.reopenTask("ch-abc");

		// Assert
		expect(mockExeca).toHaveBeenCalledWith(
			"bd",
			["update", "ch-abc", "--status=open"],
			{ cwd: "/test/project", reject: false },
		);
	});

	it("getTaskStatus() returns current status string", async () => {
		// Arrange
		mockExeca.mockResolvedValue({
			stdout: JSON.stringify({
				id: "ch-abc",
				title: "Test",
				priority: 1,
				status: "in_progress",
				labels: [],
			}),
			stderr: "",
			exitCode: 0,
		} as never);

		// Act
		const status = await cli.getTaskStatus("ch-abc");

		// Assert
		expect(status).toBe("in_progress");
	});

	it("getTaskStatus() returns null for invalid task", async () => {
		// Arrange
		mockExeca.mockResolvedValue({
			stdout: "",
			stderr: "Error: Not found",
			exitCode: 1,
		} as never);

		// Act
		const status = await cli.getTaskStatus("ch-invalid");

		// Assert
		expect(status).toBeNull();
	});

	it("getInProgressTasks() returns array of in_progress tasks", async () => {
		// Arrange
		mockExeca.mockResolvedValue({
			stdout: JSON.stringify([
				{
					id: "ch-1",
					title: "Task 1",
					priority: 1,
					status: "in_progress",
					labels: [],
				},
			]),
			stderr: "",
			exitCode: 0,
		} as never);

		// Act
		const tasks = await cli.getInProgressTasks();

		// Assert
		expect(tasks).toHaveLength(1);
		expect(tasks[0].status).toBe("in_progress");
		expect(mockExeca).toHaveBeenCalledWith(
			"bd",
			["list", "--status=in_progress", "-n", "0", "--json"],
			{ cwd: "/test/project", reject: false },
		);
	});

	it("getClosedTasks() returns array of closed tasks", async () => {
		// Arrange
		mockExeca.mockResolvedValue({
			stdout: JSON.stringify([
				{
					id: "ch-2",
					title: "Done Task",
					priority: 1,
					status: "closed",
					labels: [],
				},
			]),
			stderr: "",
			exitCode: 0,
		} as never);

		// Act
		const tasks = await cli.getClosedTasks();

		// Assert
		expect(tasks).toHaveLength(1);
		expect(tasks[0].status).toBe("closed");
		expect(mockExeca).toHaveBeenCalledWith(
			"bd",
			["list", "--status=closed", "-n", "0", "--json"],
			{ cwd: "/test/project", reject: false },
		);
	});
});
