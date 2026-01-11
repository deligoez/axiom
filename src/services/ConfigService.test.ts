import * as fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigService } from "./ConfigService.js";

// Mock fs
vi.mock("node:fs", () => ({
	existsSync: vi.fn(),
	readFileSync: vi.fn(),
}));

const mockExistsSync = vi.mocked(fs.existsSync);
const mockReadFileSync = vi.mocked(fs.readFileSync);

describe("ConfigService", () => {
	let service: ConfigService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new ConfigService("/test/project");
	});

	// F01b: load() tests (5)
	it("load() returns defaults when file missing", () => {
		// Arrange
		mockExistsSync.mockReturnValue(false);

		// Act
		const config = service.load();

		// Assert - compare structure without timestamps
		expect(config.version).toBe("3.1");
		expect(config.mode).toBe("semi-auto");
		expect(config.project.taskIdPrefix).toBe("ch-");
		expect(config.agents.default).toBe("claude");
		expect(config.qualityCommands).toHaveLength(1);
	});

	it("load() parses existing config file", () => {
		// Arrange
		const customConfig = {
			version: "1.0",
			mode: "autopilot",
			project: { taskIdPrefix: "test-" },
			agents: { default: "claude", maxParallel: 5, timeoutMinutes: 60 },
			qualityCommands: [],
			completion: { signal: "DONE", requireTests: false },
			merge: {},
			tui: {},
			checkpoints: {},
			planReview: {},
		};
		mockExistsSync.mockReturnValue(true);
		mockReadFileSync.mockReturnValue(JSON.stringify(customConfig));

		// Act
		const config = service.load();

		// Assert
		expect(config.mode).toBe("autopilot");
		expect(config.project.taskIdPrefix).toBe("test-");
	});

	it("load() throws on malformed JSON", () => {
		// Arrange
		mockExistsSync.mockReturnValue(true);
		mockReadFileSync.mockReturnValue("{ invalid json }");

		// Act & Assert
		expect(() => service.load()).toThrow();
	});

	it("load() reads qualityCommands array from config", () => {
		// Arrange
		const config = {
			version: "1.0",
			qualityCommands: [
				{ name: "test", command: "npm test", required: true, order: 1 },
				{ name: "lint", command: "npm lint", required: false, order: 2 },
			],
		};
		mockExistsSync.mockReturnValue(true);
		mockReadFileSync.mockReturnValue(JSON.stringify(config));

		// Act
		const result = service.load();

		// Assert
		expect(result.qualityCommands).toHaveLength(2);
		expect(result.qualityCommands[0].name).toBe("test");
		expect(result.qualityCommands[1].name).toBe("lint");
	});

	it("load() reads project.taskIdPrefix from config", () => {
		// Arrange
		const config = {
			version: "1.0",
			project: { taskIdPrefix: "custom-" },
		};
		mockExistsSync.mockReturnValue(true);
		mockReadFileSync.mockReturnValue(JSON.stringify(config));

		// Act
		const result = service.load();

		// Assert
		expect(result.project.taskIdPrefix).toBe("custom-");
	});

	// F01b: get() tests (2)
	it("get() returns cached config", () => {
		// Arrange
		mockExistsSync.mockReturnValue(false);
		service.load(); // Cache the config

		// Act
		const config1 = service.get();
		const config2 = service.get();

		// Assert
		expect(config1).toBe(config2); // Same reference
		expect(mockExistsSync).toHaveBeenCalledTimes(1); // Only called once
	});

	it("get() calls load() if not cached", () => {
		// Arrange
		mockExistsSync.mockReturnValue(false);

		// Act
		const config = service.get();

		// Assert
		expect(config).toBeDefined();
		expect(mockExistsSync).toHaveBeenCalledTimes(1);
	});

	// F01b: exists() test (1)
	it("exists() returns false when no file", () => {
		// Arrange
		mockExistsSync.mockReturnValue(false);

		// Act
		const result = service.exists();

		// Assert
		expect(result).toBe(false);
		expect(mockExistsSync).toHaveBeenCalledWith(
			"/test/project/.chorus/config.json",
		);
	});

	// F01b: Migration test (1)
	it("load() migrates legacy testCommand to qualityCommands array", () => {
		// Arrange
		const legacyConfig = {
			version: "1.0",
			project: { testCommand: "npm run test:legacy" },
		};
		mockExistsSync.mockReturnValue(true);
		mockReadFileSync.mockReturnValue(JSON.stringify(legacyConfig));

		// Act
		const result = service.load();

		// Assert
		expect(result.qualityCommands).toBeDefined();
		expect(result.qualityCommands).toHaveLength(1);
		expect(result.qualityCommands[0]).toEqual({
			name: "test",
			command: "npm run test:legacy",
			required: true,
			order: 0,
		});
		// Legacy field should be removed
		expect(
			(result.project as { testCommand?: string }).testCommand,
		).toBeUndefined();
	});
});
