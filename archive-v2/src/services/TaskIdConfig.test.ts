import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	getDefaultConfig,
	loadConfig,
	saveConfig,
	suggestPrefix,
	type TaskIdConfig,
} from "./TaskIdConfig.js";

describe("TaskIdConfig", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = join(
			tmpdir(),
			`chorus-taskid-config-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		);
		mkdirSync(tempDir, { recursive: true });
	});

	afterEach(() => {
		try {
			rmSync(tempDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("suggestPrefix", () => {
		it("generates prefix from project name (lowercase, abbreviated)", () => {
			// Arrange & Act
			const prefix = suggestPrefix("chorus");

			// Assert
			expect(prefix).toBe("ch");
		});

		it("handles multi-word project names", () => {
			// Arrange & Act
			const prefix = suggestPrefix("my-awesome-project");

			// Assert - takes first letters of each word
			expect(prefix).toBe("map");
		});

		it("handles single letter project names", () => {
			// Arrange & Act
			const prefix = suggestPrefix("x");

			// Assert
			expect(prefix).toBe("x");
		});
	});

	describe("saveConfig", () => {
		it("saves config to .chorus/config.json", () => {
			// Arrange
			const config: TaskIdConfig = {
				prefix: "ch",
				format: "simple",
			};

			// Act
			saveConfig(tempDir, config);

			// Assert
			const configPath = join(tempDir, ".chorus", "config.json");
			expect(existsSync(configPath)).toBe(true);
			const saved = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(saved.prefix).toBe("ch");
			expect(saved.format).toBe("simple");
		});
	});

	describe("loadConfig", () => {
		it("loads config from .chorus/config.json", () => {
			// Arrange
			const chorusDir = join(tempDir, ".chorus");
			mkdirSync(chorusDir, { recursive: true });
			writeFileSync(
				join(chorusDir, "config.json"),
				JSON.stringify({ prefix: "pr", format: "padded", paddingWidth: 4 }),
			);

			// Act
			const config = loadConfig(tempDir);

			// Assert
			expect(config.prefix).toBe("pr");
			expect(config.format).toBe("padded");
			expect(config.paddingWidth).toBe(4);
		});

		it("returns default config if file doesn't exist", () => {
			// Arrange - no config file

			// Act
			const config = loadConfig(tempDir);

			// Assert
			expect(config.prefix).toBe("ch");
			expect(config.format).toBe("simple");
		});
	});

	describe("getDefaultConfig", () => {
		it("returns default config values", () => {
			// Arrange & Act
			const config = getDefaultConfig();

			// Assert
			expect(config.prefix).toBe("ch");
			expect(config.format).toBe("simple");
			expect(config.paddingWidth).toBeUndefined();
		});
	});
});
