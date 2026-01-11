import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConfigService } from "../services/ConfigService.js";
import { getDefaultConfig } from "../types/config.js";

describe("E2E: ConfigService", () => {
	let tempDir: string;

	beforeEach(() => {
		// Create a fresh temp directory for each test
		tempDir = join(
			tmpdir(),
			`chorus-config-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		);
		mkdirSync(tempDir, { recursive: true });
	});

	afterEach(() => {
		// Clean up temp directory
		try {
			rmSync(tempDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	it("returns default config when no config file exists", () => {
		// Arrange
		const service = new ConfigService(tempDir);
		const defaultConfig = getDefaultConfig();

		// Act
		const config = service.load();

		// Assert - compare key fields, ignoring timestamps
		expect(config.version).toBe(defaultConfig.version);
		expect(config.mode).toBe(defaultConfig.mode);
		expect(config.agents).toEqual(defaultConfig.agents);
		expect(config.qualityCommands).toEqual(defaultConfig.qualityCommands);
		expect(service.exists()).toBe(false);
	});

	it("creates .chorus directory and saves config", () => {
		// Arrange
		const service = new ConfigService(tempDir);
		const config = getDefaultConfig();
		config.mode = "autopilot";

		// Act
		service.save(config);

		// Assert
		expect(existsSync(join(tempDir, ".chorus", "config.json"))).toBe(true);
		expect(service.exists()).toBe(true);

		// Verify saved content
		const loaded = service.load();
		expect(loaded.mode).toBe("autopilot");
	});

	it("migrates legacy testCommand to qualityCommands", () => {
		// Arrange
		const chorusDir = join(tempDir, ".chorus");
		mkdirSync(chorusDir, { recursive: true });

		// Create legacy config with testCommand
		const legacyConfig = {
			version: "1.0.0",
			mode: "semi-auto",
			agents: { default: "claude", maxParallel: 2 },
			project: {
				taskIdPrefix: "ch-",
				testCommand: "npm test", // Legacy field
			},
		};
		writeFileSync(
			join(chorusDir, "config.json"),
			JSON.stringify(legacyConfig, null, 2),
		);

		const service = new ConfigService(tempDir);

		// Act
		const config = service.load();

		// Assert
		expect(config.qualityCommands).toBeDefined();
		expect(config.qualityCommands.length).toBe(1);
		expect(config.qualityCommands[0].name).toBe("test");
		expect(config.qualityCommands[0].command).toBe("npm test");
		expect(
			(config.project as { testCommand?: string }).testCommand,
		).toBeUndefined();
	});

	it("validates correct config schema", () => {
		// Arrange
		const service = new ConfigService(tempDir);
		const validConfig = getDefaultConfig();

		// Act
		const isValid = service.validate(validConfig);

		// Assert
		expect(isValid).toBe(true);
	});

	it("rejects invalid config schema", () => {
		// Arrange
		const service = new ConfigService(tempDir);
		const invalidConfigs = [
			null,
			{},
			{ version: "1.0.0" }, // missing mode
			{ version: "1.0.0", mode: "invalid" }, // invalid mode
			{ version: "1.0.0", mode: "semi-auto", agents: {} }, // missing default agent
		];

		// Act & Assert
		for (const invalidConfig of invalidConfigs) {
			expect(service.validate(invalidConfig)).toBe(false);
		}
	});

	it("loads saved config on subsequent calls", () => {
		// Arrange
		const service = new ConfigService(tempDir);
		const config = getDefaultConfig();
		config.mode = "autopilot";
		config.agents.maxParallel = 5;

		// Act
		service.save(config);
		const loaded = service.get();

		// Assert
		expect(loaded.mode).toBe("autopilot");
		expect(loaded.agents.maxParallel).toBe(5);

		// Verify reload from disk
		const newService = new ConfigService(tempDir);
		const reloaded = newService.load();
		expect(reloaded.mode).toBe("autopilot");
		expect(reloaded.agents.maxParallel).toBe(5);
	});
});
