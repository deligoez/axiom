import { beforeEach, describe, expect, it, vi } from "vitest";
import { CompletionChecker } from "./CompletionChecker.js";
import type { CommandResult } from "./QualityCommandRunner.js";

describe("CompletionChecker", () => {
	let checker: CompletionChecker;
	let mockParser: {
		isComplete: ReturnType<typeof vi.fn>;
		isBlocked: ReturnType<typeof vi.fn>;
		getReason: ReturnType<typeof vi.fn>;
		parse: ReturnType<typeof vi.fn>;
		parseAll: ReturnType<typeof vi.fn>;
		getProgress: ReturnType<typeof vi.fn>;
	};
	let mockRunner: {
		run: ReturnType<typeof vi.fn>;
		runWithTimeout: ReturnType<typeof vi.fn>;
		runQualityCommands: ReturnType<typeof vi.fn>;
		runRequiredOnly: ReturnType<typeof vi.fn>;
		getProjectDir: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		vi.clearAllMocks();

		// Create mock instances
		mockParser = {
			isComplete: vi.fn(),
			isBlocked: vi.fn(),
			getReason: vi.fn(),
			parse: vi.fn(),
			parseAll: vi.fn(),
			getProgress: vi.fn(),
		};

		mockRunner = {
			run: vi.fn(),
			runWithTimeout: vi.fn(),
			runQualityCommands: vi.fn(),
			runRequiredOnly: vi.fn(),
			getProjectDir: vi.fn().mockReturnValue("/test/project"),
		};

		checker = new CompletionChecker(
			"/test/project",
			{ requireTests: true, testCommand: "npm test" },
			mockParser as never,
			mockRunner as never,
		);
	});

	// F11: check() tests (5)
	it("check() returns complete: false if no signal", async () => {
		// Arrange
		mockParser.isComplete.mockReturnValue(false);

		// Act
		const result = await checker.check("agent output without signal");

		// Assert
		expect(result.complete).toBe(false);
		expect(result.hasSignal).toBe(false);
	});

	it("check() returns complete: true if signal + tests pass", async () => {
		// Arrange
		mockParser.isComplete.mockReturnValue(true);
		mockRunner.run.mockResolvedValue({
			name: "test",
			success: true,
			exitCode: 0,
			output: "All tests passed",
			duration: 1000,
		} as CommandResult);

		// Act
		const result = await checker.check(
			"<chorus>COMPLETE</chorus>",
			"/test/worktree",
		);

		// Assert
		expect(result.complete).toBe(true);
		expect(result.hasSignal).toBe(true);
		expect(result.testsPassed).toBe(true);
	});

	it("check() returns complete: false if signal + tests fail", async () => {
		// Arrange
		mockParser.isComplete.mockReturnValue(true);
		mockRunner.run.mockResolvedValue({
			name: "test",
			success: false,
			exitCode: 1,
			output: "Test failed",
			duration: 500,
		} as CommandResult);

		// Act
		const result = await checker.check(
			"<chorus>COMPLETE</chorus>",
			"/test/worktree",
		);

		// Assert
		expect(result.complete).toBe(false);
		expect(result.hasSignal).toBe(true);
		expect(result.testsPassed).toBe(false);
		expect(result.testOutput).toContain("Test failed");
	});

	it("check() respects requireTests: false (skip tests)", async () => {
		// Arrange
		const noTestChecker = new CompletionChecker(
			"/test/project",
			{ requireTests: false, testCommand: "npm test" },
			mockParser as never,
			mockRunner as never,
		);
		mockParser.isComplete.mockReturnValue(true);

		// Act
		const result = await noTestChecker.check("<chorus>COMPLETE</chorus>");

		// Assert
		expect(result.complete).toBe(true);
		expect(result.hasSignal).toBe(true);
		expect(mockRunner.run).not.toHaveBeenCalled();
	});

	it("check() runs tests in worktree path", async () => {
		// Arrange
		mockParser.isComplete.mockReturnValue(true);
		mockRunner.run.mockResolvedValue({
			name: "test",
			success: true,
			exitCode: 0,
			output: "Passed",
			duration: 100,
		} as CommandResult);

		// Act
		await checker.check("<chorus>COMPLETE</chorus>", "/custom/worktree");

		// Assert
		expect(mockRunner.run).toHaveBeenCalledWith("npm test", "/custom/worktree");
	});

	// F11: Helper method tests (3)
	it("hasCompletionSignal() quick check without running tests", () => {
		// Arrange
		mockParser.isComplete.mockReturnValue(true);

		// Act
		const result = checker.hasCompletionSignal("<chorus>COMPLETE</chorus>");

		// Assert
		expect(result).toBe(true);
		expect(mockRunner.run).not.toHaveBeenCalled();
	});

	it("isBlocked() detects BLOCKED signal and extracts reason", () => {
		// Arrange
		mockParser.isBlocked.mockReturnValue(true);
		mockParser.getReason.mockReturnValue("Missing dependency");

		// Act
		const result = checker.isBlocked("<chorus>BLOCKED</chorus>");

		// Assert
		expect(result.blocked).toBe(true);
		expect(result.reason).toBe("Missing dependency");
	});

	it("needsHelp() detects NEEDS_HELP signal and extracts question", () => {
		// Arrange
		mockParser.parse.mockReturnValue({
			hasSignal: true,
			signal: {
				type: "NEEDS_HELP",
				payload: "How do I configure auth?",
				raw: "<chorus>NEEDS_HELP:How do I configure auth?</chorus>",
			},
		});

		// Act
		const result = checker.needsHelp("<chorus>NEEDS_HELP</chorus>");

		// Assert
		expect(result.needsHelp).toBe(true);
		expect(result.question).toBe("How do I configure auth?");
	});
});
