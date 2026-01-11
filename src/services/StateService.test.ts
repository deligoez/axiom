import * as fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StateService } from "./StateService.js";

// Mock fs
vi.mock("node:fs", () => ({
	existsSync: vi.fn(),
	readFileSync: vi.fn(),
}));

const mockExistsSync = vi.mocked(fs.existsSync);
const mockReadFileSync = vi.mocked(fs.readFileSync);

// UUID regex pattern
const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("StateService", () => {
	let service: StateService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new StateService("/test/project");
	});

	// F02b: init() tests (5)
	it("init() generates sessionId in UUID format", () => {
		// Arrange - service already created

		// Act
		const state = service.init();

		// Assert
		expect(state.sessionId).toMatch(UUID_REGEX);
	});

	it("init() sets startedAt to timestamp close to Date.now()", () => {
		// Arrange
		const before = Date.now();

		// Act
		const state = service.init();

		// Assert
		const after = Date.now();
		expect(state.startedAt).toBeGreaterThanOrEqual(before);
		expect(state.startedAt).toBeLessThanOrEqual(after);
	});

	it("init() creates empty agents object", () => {
		// Arrange - service already created

		// Act
		const state = service.init();

		// Assert
		expect(state.agents).toEqual({});
	});

	it("init() creates empty mergeQueue array", () => {
		// Arrange - service already created

		// Act
		const state = service.init();

		// Assert
		expect(state.mergeQueue).toEqual([]);
	});

	it("init() sets mode to semi-auto as default", () => {
		// Arrange - service already created

		// Act
		const state = service.init();

		// Assert
		expect(state.mode).toBe("semi-auto");
	});

	// F02b: load() tests (3)
	it("load() returns null when state file does not exist", () => {
		// Arrange
		mockExistsSync.mockReturnValue(false);

		// Act
		const result = service.load();

		// Assert
		expect(result).toBeNull();
		expect(mockExistsSync).toHaveBeenCalledWith(
			"/test/project/.chorus/state.json",
		);
	});

	it("load() returns parsed ChorusState when file exists and valid", () => {
		// Arrange
		const validState = {
			version: "1.0",
			sessionId: "test-session-id",
			startedAt: 1234567890,
			mode: "semi-auto",
			paused: false,
			agents: {},
			mergeQueue: [],
			checkpoint: null,
			stats: {
				tasksCompleted: 0,
				tasksFailed: 0,
				mergesAuto: 0,
				mergesManual: 0,
				totalIterations: 0,
				totalRuntime: 0,
			},
		};
		mockExistsSync.mockReturnValue(true);
		mockReadFileSync.mockReturnValue(JSON.stringify(validState));

		// Act
		const result = service.load();

		// Assert
		expect(result).toEqual(validState);
	});

	it("load() throws Error on malformed state structure", () => {
		// Arrange
		mockExistsSync.mockReturnValue(true);
		mockReadFileSync.mockReturnValue(JSON.stringify({ invalid: "data" }));

		// Act & Assert
		expect(() => service.load()).toThrow("Invalid state structure");
	});

	// F02b: get() test (1)
	it("get() throws Error when called before init/load", () => {
		// Arrange - service created but not initialized

		// Act & Assert
		expect(() => service.get()).toThrow("State not initialized");
	});
});
