import * as fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PatternsManager } from "./PatternsManager.js";

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

describe("PatternsManager", () => {
	let manager: PatternsManager;

	beforeEach(() => {
		vi.clearAllMocks();
		manager = new PatternsManager("/test/project");
	});

	describe("read", () => {
		it("returns parsed patterns from .chorus/PATTERNS.md", () => {
			// Arrange
			const content = `# Patterns

## Testing
- Always use AAA pattern
- Mock external dependencies

## Code Style
- Use TypeScript strict mode
- Prefer interfaces over types
`;
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(content);

			// Act
			const patterns = manager.read();

			// Assert
			expect(patterns).toEqual({
				Testing: ["Always use AAA pattern", "Mock external dependencies"],
				"Code Style": [
					"Use TypeScript strict mode",
					"Prefer interfaces over types",
				],
			});
		});

		it("returns empty patterns object if file does not exist", () => {
			// Arrange
			mockExistsSync.mockReturnValue(false);

			// Act
			const patterns = manager.read();

			// Assert
			expect(patterns).toEqual({});
		});
	});

	describe("write", () => {
		it("writes patterns to file", () => {
			// Arrange
			mockExistsSync.mockReturnValue(true);
			const patterns: Record<string, string[]> = {
				Testing: ["Use AAA pattern", "Mock dependencies"],
				Style: ["Use TypeScript"],
			};

			// Act
			manager.write(patterns);

			// Assert
			expect(mockWriteFileSync).toHaveBeenCalledWith(
				"/test/project/.chorus/PATTERNS.md",
				expect.stringContaining("## Testing"),
			);
			expect(mockWriteFileSync).toHaveBeenCalledWith(
				"/test/project/.chorus/PATTERNS.md",
				expect.stringContaining("- Use AAA pattern"),
			);
		});
	});

	describe("addPattern", () => {
		it("appends to existing category", () => {
			// Arrange
			const content = `# Patterns

## Testing
- Existing pattern
`;
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(content);

			// Act
			manager.addPattern("Testing", "New pattern");

			// Assert
			const writtenContent = mockWriteFileSync.mock.calls[0][1] as string;
			expect(writtenContent).toContain("- Existing pattern");
			expect(writtenContent).toContain("- New pattern");
		});

		it("creates category section if it does not exist", () => {
			// Arrange
			const content = `# Patterns

## Testing
- Existing pattern
`;
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(content);

			// Act
			manager.addPattern("New Category", "First pattern");

			// Assert
			const writtenContent = mockWriteFileSync.mock.calls[0][1] as string;
			expect(writtenContent).toContain("## New Category");
			expect(writtenContent).toContain("- First pattern");
		});
	});

	describe("getPatternsByCategory", () => {
		it("returns filtered patterns", () => {
			// Arrange
			const content = `# Patterns

## Testing
- AAA pattern
- Mock dependencies

## Style
- Use TypeScript
`;
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(content);

			// Act
			const patterns = manager.getPatternsByCategory("Testing");

			// Assert
			expect(patterns).toEqual(["AAA pattern", "Mock dependencies"]);
		});

		it("returns empty array for non-existent category", () => {
			// Arrange
			const content = `# Patterns

## Testing
- AAA pattern
`;
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(content);

			// Act
			const patterns = manager.getPatternsByCategory("NonExistent");

			// Assert
			expect(patterns).toEqual([]);
		});
	});

	describe("markdown formatting", () => {
		it("preserves markdown formatting (headers, bullets, code blocks)", () => {
			// Arrange
			mockExistsSync.mockReturnValue(true);
			const patterns: Record<string, string[]> = {
				Testing: ["Use `describe` blocks", "Test with **bold** assertions"],
			};

			// Act
			manager.write(patterns);

			// Assert
			const writtenContent = mockWriteFileSync.mock.calls[0][1] as string;
			expect(writtenContent).toContain("# Patterns");
			expect(writtenContent).toContain("## Testing");
			expect(writtenContent).toContain("- Use `describe` blocks");
			expect(writtenContent).toContain("- Test with **bold** assertions");
		});
	});
});
