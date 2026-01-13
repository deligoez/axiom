import * as fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigService } from "./ConfigService.js";

// Mock fs
vi.mock("node:fs", () => ({
	existsSync: vi.fn(),
	readFileSync: vi.fn(),
	writeFileSync: vi.fn(),
	mkdirSync: vi.fn(),
}));

const mockExistsSync = vi.mocked(fs.existsSync);
const mockReadFileSync = vi.mocked(fs.readFileSync);
const mockWriteFileSync = vi.mocked(fs.writeFileSync);
const mockMkdirSync = vi.mocked(fs.mkdirSync);

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

	// F01c: save() tests (2)
	it("save() creates directory and writes formatted JSON", () => {
		// Arrange
		mockExistsSync.mockReturnValue(false);
		const config = {
			version: "1.0",
			mode: "semi-auto" as const,
			project: { taskIdPrefix: "ch-" },
			agents: {
				default: "claude" as const,
				maxParallel: 3,
				timeoutMinutes: 30,
				available: {},
			},
			qualityCommands: [],
			completion: {
				signal: "DONE",
				requireTests: true,
				maxIterations: 50,
				taskTimeout: 30,
			},
			merge: { autoResolve: true, agentResolve: true, requireApproval: false },
			tui: { agentGrid: "auto" as const },
			checkpoints: { beforeAutopilot: true, beforeMerge: true, periodic: 5 },
			planReview: {
				enabled: true,
				maxIterations: 5,
				triggerOn: [],
				autoApply: "none" as const,
				requireApproval: [],
			},
			review: {
				defaultMode: "batch" as const,
				autoApprove: {
					enabled: true,
					maxIterations: 3,
					requireQualityPass: true,
				},
				labelRules: [],
			},
			fileWatcher: { usePolling: false, interval: 100 },
			taskStore: { maxTasks: 50000, warnThreshold: 0.8 },
		};

		// Act
		service.save(config);

		// Assert
		expect(mockMkdirSync).toHaveBeenCalledWith("/test/project/.chorus", {
			recursive: true,
		});
		expect(mockWriteFileSync).toHaveBeenCalledWith(
			"/test/project/.chorus/config.json",
			expect.stringContaining('"version": "1.0"'),
		);
	});

	it("save() overwrites existing file", () => {
		// Arrange
		mockExistsSync.mockReturnValue(true);
		const config = {
			version: "2.0",
			mode: "autopilot" as const,
			project: { taskIdPrefix: "new-" },
			agents: {
				default: "claude" as const,
				maxParallel: 3,
				timeoutMinutes: 30,
				available: {},
			},
			qualityCommands: [],
			completion: {
				signal: "DONE",
				requireTests: true,
				maxIterations: 50,
				taskTimeout: 30,
			},
			merge: { autoResolve: true, agentResolve: true, requireApproval: false },
			tui: { agentGrid: "auto" as const },
			checkpoints: { beforeAutopilot: true, beforeMerge: true, periodic: 5 },
			planReview: {
				enabled: true,
				maxIterations: 5,
				triggerOn: [],
				autoApply: "none" as const,
				requireApproval: [],
			},
			review: {
				defaultMode: "batch" as const,
				autoApprove: {
					enabled: true,
					maxIterations: 3,
					requireQualityPass: true,
				},
				labelRules: [],
			},
			fileWatcher: { usePolling: false, interval: 100 },
			taskStore: { maxTasks: 50000, warnThreshold: 0.8 },
		};

		// Act
		service.save(config);

		// Assert
		expect(mockWriteFileSync).toHaveBeenCalledWith(
			"/test/project/.chorus/config.json",
			expect.stringContaining('"version": "2.0"'),
		);
	});

	// F01c: update() test (1)
	it("update() merges partial and saves", () => {
		// Arrange
		mockExistsSync.mockReturnValue(false);
		service.load(); // Get defaults
		mockExistsSync.mockReturnValue(true); // For save

		// Act
		service.update({ mode: "autopilot" });

		// Assert
		expect(mockWriteFileSync).toHaveBeenCalledWith(
			"/test/project/.chorus/config.json",
			expect.stringContaining('"mode": "autopilot"'),
		);
	});

	// F01c: validate() tests (7)
	it("validate() accepts valid ChorusConfig", () => {
		// Arrange
		const validConfig = {
			version: "1.0",
			mode: "semi-auto",
			project: { taskIdPrefix: "ch-" },
			agents: { default: "claude" },
			qualityCommands: [{ name: "test", command: "npm test" }],
		};

		// Act
		const result = service.validate(validConfig);

		// Assert
		expect(result).toBe(true);
	});

	it("validate() rejects null, undefined, and non-objects", () => {
		// Act & Assert
		expect(service.validate(null)).toBe(false);
		expect(service.validate(undefined)).toBe(false);
		expect(service.validate("string")).toBe(false);
		expect(service.validate(123)).toBe(false);
	});

	it("validate() rejects invalid mode values", () => {
		// Arrange
		const invalidMode = {
			version: "1.0",
			mode: "invalid-mode",
			project: { taskIdPrefix: "ch-" },
			agents: { default: "claude" },
			qualityCommands: [],
		};

		// Act
		const result = service.validate(invalidMode);

		// Assert
		expect(result).toBe(false);
	});

	it("validate() rejects missing required fields", () => {
		// Missing version
		expect(service.validate({ mode: "semi-auto" })).toBe(false);
		// Missing agents.default
		expect(
			service.validate({
				version: "1.0",
				mode: "semi-auto",
				project: { taskIdPrefix: "ch-" },
				agents: {},
				qualityCommands: [],
			}),
		).toBe(false);
		// Missing project.taskIdPrefix
		expect(
			service.validate({
				version: "1.0",
				mode: "semi-auto",
				project: {},
				agents: { default: "claude" },
				qualityCommands: [],
			}),
		).toBe(false);
	});

	it("validate() rejects non-array qualityCommands", () => {
		// Arrange
		const invalidQC = {
			version: "1.0",
			mode: "semi-auto",
			project: { taskIdPrefix: "ch-" },
			agents: { default: "claude" },
			qualityCommands: "not-an-array",
		};

		// Act
		const result = service.validate(invalidQC);

		// Assert
		expect(result).toBe(false);
	});

	it("validate() rejects invalid qualityCommand objects", () => {
		// Missing name
		expect(
			service.validate({
				version: "1.0",
				mode: "semi-auto",
				project: { taskIdPrefix: "ch-" },
				agents: { default: "claude" },
				qualityCommands: [{ command: "npm test" }],
			}),
		).toBe(false);
		// Missing command
		expect(
			service.validate({
				version: "1.0",
				mode: "semi-auto",
				project: { taskIdPrefix: "ch-" },
				agents: { default: "claude" },
				qualityCommands: [{ name: "test" }],
			}),
		).toBe(false);
	});

	it("validate() accepts valid qualityCommands array", () => {
		// Arrange
		const validConfig = {
			version: "1.0",
			mode: "semi-auto",
			project: { taskIdPrefix: "ch-" },
			agents: { default: "claude" },
			qualityCommands: [
				{ name: "test", command: "npm test" },
				{ name: "lint", command: "npm lint" },
			],
		};

		// Act
		const result = service.validate(validConfig);

		// Assert
		expect(result).toBe(true);
	});

	// FR15: review config validation tests (2)
	it("validate() accepts valid review config", () => {
		// Arrange
		const validConfig = {
			version: "1.0",
			mode: "semi-auto",
			project: { taskIdPrefix: "ch-" },
			agents: { default: "claude" },
			qualityCommands: [],
			review: {
				defaultMode: "batch",
				autoApprove: {
					enabled: true,
					maxIterations: 3,
					requireQualityPass: true,
				},
				labelRules: [],
			},
		};

		// Act
		const result = service.validate(validConfig);

		// Assert
		expect(result).toBe(true);
	});

	it("validate() rejects invalid review defaultMode", () => {
		// Arrange
		const invalidConfig = {
			version: "1.0",
			mode: "semi-auto",
			project: { taskIdPrefix: "ch-" },
			agents: { default: "claude" },
			qualityCommands: [],
			review: {
				defaultMode: "invalid-mode",
				autoApprove: {
					enabled: true,
					maxIterations: 3,
					requireQualityPass: true,
				},
				labelRules: [],
			},
		};

		// Act
		const result = service.validate(invalidConfig);

		// Assert
		expect(result).toBe(false);
	});
});
