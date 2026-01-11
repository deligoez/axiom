import * as fs from "node:fs";
import { basename } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectDetector } from "./ProjectDetector.js";

// Mock fs
vi.mock("node:fs", () => ({
	existsSync: vi.fn(),
	readFileSync: vi.fn(),
}));

// Mock path
vi.mock("node:path", async () => {
	const actual = await vi.importActual("node:path");
	return {
		...actual,
		basename: vi.fn(() => "test-project"),
	};
});

const mockExistsSync = vi.mocked(fs.existsSync);
const mockReadFileSync = vi.mocked(fs.readFileSync);
const mockBasename = vi.mocked(basename);

describe("ProjectDetector", () => {
	let detector: ProjectDetector;

	beforeEach(() => {
		vi.clearAllMocks();
		detector = new ProjectDetector("/test/project");
	});

	describe("detect", () => {
		it("identifies Node.js from package.json", () => {
			// Arrange
			mockExistsSync.mockImplementation((path) =>
				String(path).includes("package.json"),
			);

			// Act
			const type = detector.detect();

			// Assert
			expect(type).toBe("node");
		});

		it("identifies PHP from composer.json", () => {
			// Arrange
			mockExistsSync.mockImplementation((path) =>
				String(path).includes("composer.json"),
			);

			// Act
			const type = detector.detect();

			// Assert
			expect(type).toBe("php");
		});

		it("identifies Python from pyproject.toml", () => {
			// Arrange
			mockExistsSync.mockImplementation((path) =>
				String(path).includes("pyproject.toml"),
			);

			// Act
			const type = detector.detect();

			// Assert
			expect(type).toBe("python");
		});

		it("identifies Python from requirements.txt", () => {
			// Arrange
			mockExistsSync.mockImplementation((path) =>
				String(path).includes("requirements.txt"),
			);

			// Act
			const type = detector.detect();

			// Assert
			expect(type).toBe("python");
		});

		it("identifies Go from go.mod", () => {
			// Arrange
			mockExistsSync.mockImplementation((path) =>
				String(path).includes("go.mod"),
			);

			// Act
			const type = detector.detect();

			// Assert
			expect(type).toBe("go");
		});

		it("identifies Rust from Cargo.toml", () => {
			// Arrange
			mockExistsSync.mockImplementation((path) =>
				String(path).includes("Cargo.toml"),
			);

			// Act
			const type = detector.detect();

			// Assert
			expect(type).toBe("rust");
		});

		it("returns unknown if no config files found", () => {
			// Arrange
			mockExistsSync.mockReturnValue(false);

			// Act
			const type = detector.detect();

			// Assert
			expect(type).toBe("unknown");
		});
	});

	describe("suggestQualityCommands", () => {
		it("returns default commands per type", () => {
			// Act
			const nodeCommands = detector.suggestQualityCommands("node");
			const pythonCommands = detector.suggestQualityCommands("python");
			const goCommands = detector.suggestQualityCommands("go");

			// Assert
			expect(nodeCommands).toContainEqual(
				expect.objectContaining({ command: expect.stringContaining("npm") }),
			);
			expect(pythonCommands).toContainEqual(
				expect.objectContaining({ command: expect.stringContaining("pytest") }),
			);
			expect(goCommands).toContainEqual(
				expect.objectContaining({
					command: expect.stringContaining("go test"),
				}),
			);
		});
	});

	describe("getProjectName", () => {
		it("extracts name from package.json", () => {
			// Arrange
			mockExistsSync.mockImplementation((path) =>
				String(path).includes("package.json"),
			);
			mockReadFileSync.mockReturnValue(
				JSON.stringify({ name: "my-awesome-project" }),
			);

			// Act
			const name = detector.getProjectName();

			// Assert
			expect(name).toBe("my-awesome-project");
		});

		it("returns directory name if no name in config", () => {
			// Arrange
			mockExistsSync.mockReturnValue(false);
			mockBasename.mockReturnValue("fallback-dir");

			// Act
			const name = detector.getProjectName();

			// Assert
			expect(name).toBe("fallback-dir");
		});
	});
});
