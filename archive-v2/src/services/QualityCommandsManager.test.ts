import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type CommandRunner,
	QualityCommandsManager,
} from "./QualityCommandsManager.js";

describe("QualityCommandsManager", () => {
	let manager: QualityCommandsManager;
	let mockRun: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockRun = vi.fn();
		const mockRunner: CommandRunner = {
			run: mockRun as CommandRunner["run"],
		};
		manager = new QualityCommandsManager(mockRunner);
	});

	describe("add", () => {
		it("adds command to list", () => {
			// Act
			manager.add("test", "npm test", true);

			// Assert
			const commands = manager.getCommands();
			expect(commands).toHaveLength(1);
			expect(commands[0]).toEqual({
				name: "test",
				command: "npm test",
				required: true,
				order: 0,
			});
		});
	});

	describe("remove", () => {
		it("removes command at index", () => {
			// Arrange
			manager.add("test", "npm test", true);
			manager.add("lint", "npm run lint", false);

			// Act
			manager.remove(0);

			// Assert
			const commands = manager.getCommands();
			expect(commands).toHaveLength(1);
			expect(commands[0].name).toBe("lint");
		});

		it("throws if index out of bounds", () => {
			// Arrange
			manager.add("test", "npm test", true);

			// Act & Assert
			expect(() => manager.remove(5)).toThrow("Index out of bounds");
		});
	});

	describe("toggle", () => {
		it("toggles required/optional", () => {
			// Arrange
			manager.add("test", "npm test", true);

			// Act
			manager.toggle(0);

			// Assert
			const commands = manager.getCommands();
			expect(commands[0].required).toBe(false);

			// Toggle again
			manager.toggle(0);
			expect(manager.getCommands()[0].required).toBe(true);
		});
	});

	describe("reorder", () => {
		it("changes execution order", () => {
			// Arrange
			manager.add("test", "npm test", true);
			manager.add("lint", "npm run lint", false);
			manager.add("build", "npm run build", false);

			// Act
			manager.reorder(2, 0); // Move build to first

			// Assert
			const commands = manager.getCommands();
			expect(commands[0].name).toBe("build");
			expect(commands[1].name).toBe("test");
			expect(commands[2].name).toBe("lint");
		});
	});

	describe("runAll", () => {
		it("executes all commands in order, returns results array", async () => {
			// Arrange
			manager.add("test", "npm test", true);
			manager.add("lint", "npm run lint", false);
			mockRun.mockResolvedValue({
				name: "test",
				success: true,
				output: "",
				duration: 100,
				exitCode: 0,
			});

			// Act
			const results = await manager.runAll();

			// Assert
			expect(results).toHaveLength(2);
			expect(mockRun).toHaveBeenCalledTimes(2);
		});

		it("returns { name, success, output, duration } for each command", async () => {
			// Arrange
			manager.add("test", "npm test", true);
			mockRun.mockResolvedValue({
				name: "test",
				success: true,
				output: "All tests passed",
				duration: 1500,
				exitCode: 0,
			});

			// Act
			const results = await manager.runAll();

			// Assert
			expect(results[0]).toEqual({
				name: "test",
				success: true,
				output: "All tests passed",
				duration: 1500,
			});
		});

		it("stops on first required command failure", async () => {
			// Arrange
			manager.add("test", "npm test", true);
			manager.add("lint", "npm run lint", false);
			mockRun.mockResolvedValueOnce({
				name: "test",
				success: false,
				output: "Error",
				duration: 100,
				exitCode: 1,
			});

			// Act
			const results = await manager.runAll();

			// Assert
			expect(results).toHaveLength(1); // Stopped after first
			expect(mockRun).toHaveBeenCalledTimes(1);
		});

		it("continues on optional command failure", async () => {
			// Arrange
			manager.add("lint", "npm run lint", false);
			manager.add("test", "npm test", true);
			mockRun
				.mockResolvedValueOnce({
					name: "lint",
					success: false,
					output: "Error",
					duration: 100,
					exitCode: 1,
				})
				.mockResolvedValueOnce({
					name: "test",
					success: true,
					output: "",
					duration: 100,
					exitCode: 0,
				});

			// Act
			const results = await manager.runAll();

			// Assert
			expect(results).toHaveLength(2);
			expect(mockRun).toHaveBeenCalledTimes(2);
		});
	});

	describe("runRequired", () => {
		it("executes only required commands", async () => {
			// Arrange
			manager.add("test", "npm test", true);
			manager.add("lint", "npm run lint", false);
			manager.add("typecheck", "npm run typecheck", true);
			mockRun.mockResolvedValue({
				name: "test",
				success: true,
				output: "",
				duration: 100,
				exitCode: 0,
			});

			// Act
			const results = await manager.runRequired();

			// Assert
			expect(results).toHaveLength(2);
			expect(mockRun).toHaveBeenCalledWith("npm test");
			expect(mockRun).toHaveBeenCalledWith("npm run typecheck");
		});
	});
});
