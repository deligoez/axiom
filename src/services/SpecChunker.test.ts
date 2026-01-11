import { beforeEach, describe, expect, it } from "vitest";
import { SpecChunker } from "./SpecChunker.js";

describe("SpecChunker", () => {
	let chunker: SpecChunker;

	beforeEach(() => {
		chunker = new SpecChunker();
	});

	describe("chunk", () => {
		it("returns chunks array from content", () => {
			// Arrange
			const content = "Line 1\nLine 2\nLine 3";

			// Act
			const chunks = chunker.chunk(content);

			// Assert
			expect(Array.isArray(chunks)).toBe(true);
			expect(chunks.length).toBeGreaterThan(0);
		});

		it("uses default chunk size of 500 lines", () => {
			// Arrange
			const lines = Array.from({ length: 600 }, (_, i) => `Line ${i + 1}`);
			const content = lines.join("\n");

			// Act
			const chunks = chunker.chunk(content);

			// Assert
			expect(chunks).toHaveLength(2);
			expect(chunks[0].endLine - chunks[0].startLine + 1).toBeLessThanOrEqual(
				500,
			);
		});

		it("accepts custom chunk size", () => {
			// Arrange
			const lines = Array.from({ length: 30 }, (_, i) => `Line ${i + 1}`);
			const content = lines.join("\n");

			// Act
			const chunks = chunker.chunk(content, 10);

			// Assert
			expect(chunks).toHaveLength(3);
		});

		it("preserves section boundaries with markdown headers", () => {
			// Arrange
			const content = [
				"# Section 1",
				"Content line 1",
				"Content line 2",
				"Content line 3",
				"Content line 4",
				"## Section 2",
				"More content 1",
				"More content 2",
			].join("\n");

			// Act
			const chunks = chunker.chunk(content, 5);

			// Assert - section header should stay with its content
			const chunk1 = chunks[0].content;
			const chunk2 = chunks[1].content;
			expect(chunk1).toContain("# Section 1");
			expect(chunk2).toContain("## Section 2");
			// Header shouldn't be split from its following content
			expect(chunk2).toContain("More content");
		});

		it("returns chunks with startLine, endLine, content fields", () => {
			// Arrange
			const content = "Line 1\nLine 2\nLine 3";

			// Act
			const chunks = chunker.chunk(content);

			// Assert
			expect(chunks[0]).toHaveProperty("startLine");
			expect(chunks[0]).toHaveProperty("endLine");
			expect(chunks[0]).toHaveProperty("content");
			expect(typeof chunks[0].startLine).toBe("number");
			expect(typeof chunks[0].endLine).toBe("number");
			expect(typeof chunks[0].content).toBe("string");
		});

		it("returns single chunk for files smaller than chunk size", () => {
			// Arrange
			const content = "Line 1\nLine 2\nLine 3";

			// Act
			const chunks = chunker.chunk(content, 500);

			// Assert
			expect(chunks).toHaveLength(1);
			expect(chunks[0].startLine).toBe(1);
			expect(chunks[0].endLine).toBe(3);
			expect(chunks[0].content).toBe(content);
		});

		it("handles very large files (10K+ lines)", () => {
			// Arrange
			const lines = Array.from({ length: 10500 }, (_, i) => `Line ${i + 1}`);
			const content = lines.join("\n");

			// Act
			const chunks = chunker.chunk(content, 500);

			// Assert
			expect(chunks.length).toBe(21); // 10500 / 500 = 21 chunks
			expect(chunks[0].startLine).toBe(1);
			expect(chunks[chunks.length - 1].endLine).toBe(10500);
		});
	});

	describe("getProgress", () => {
		it("returns progress percentage for chunk index", () => {
			// Arrange
			const lines = Array.from({ length: 100 }, (_, i) => `Line ${i + 1}`);
			const content = lines.join("\n");
			chunker.chunk(content, 25); // 4 chunks

			// Act & Assert
			expect(chunker.getProgress(0)).toBe(25);
			expect(chunker.getProgress(1)).toBe(50);
			expect(chunker.getProgress(2)).toBe(75);
			expect(chunker.getProgress(3)).toBe(100);
		});
	});
});
