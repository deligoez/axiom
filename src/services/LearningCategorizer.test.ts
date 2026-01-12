import { describe, expect, it } from "vitest";
import { LearningCategorizer } from "./LearningCategorizer.js";

describe("LearningCategorizer", () => {
	const categorizer = new LearningCategorizer();

	describe("categorize", () => {
		it("should return cross-cutting with heuristic confidence for 'All endpoints need X'", () => {
			// Arrange
			const text = "All endpoints need rate limiting";

			// Act
			const result = categorizer.categorize(text);

			// Assert
			expect(result.scope).toBe("cross-cutting");
			expect(result.confidence).toBe("heuristic");
		});

		it("should return architectural with heuristic confidence for 'Architecture should Y'", () => {
			// Arrange
			const text = "Architecture should use event sourcing";

			// Act
			const result = categorizer.categorize(text);

			// Assert
			expect(result.scope).toBe("architectural");
			expect(result.confidence).toBe("heuristic");
		});

		it("should return local with default confidence for 'This function needs Z'", () => {
			// Arrange
			const text = "This function needs memoization";

			// Act
			const result = categorizer.categorize(text);

			// Assert
			expect(result.scope).toBe("local");
			expect(result.confidence).toBe("default");
		});

		it("should return matchedPattern showing which rule triggered", () => {
			// Arrange
			const text = "Always validate user input";

			// Act
			const result = categorizer.categorize(text);

			// Assert
			expect(result.matchedPattern).toBeDefined();
			expect(result.matchedPattern).toContain("always");
		});
	});

	describe("indicator methods", () => {
		it("should detect cross-cutting indicators: all, every, always, global", () => {
			// Arrange & Act & Assert
			expect(categorizer.hasCrossCuttingIndicators("all users need this")).toBe(
				true,
			);
			expect(categorizer.hasCrossCuttingIndicators("every request")).toBe(true);
			expect(categorizer.hasCrossCuttingIndicators("always check auth")).toBe(
				true,
			);
			expect(categorizer.hasCrossCuttingIndicators("global config")).toBe(true);
		});

		it("should detect architectural indicators: architecture, design decision, system-wide", () => {
			// Arrange & Act & Assert
			expect(
				categorizer.hasArchitecturalIndicators("architecture pattern"),
			).toBe(true);
			expect(
				categorizer.hasArchitecturalIndicators("design decision made"),
			).toBe(true);
			expect(
				categorizer.hasArchitecturalIndicators("system-wide approach"),
			).toBe(true);
		});

		it("should be case-insensitive", () => {
			// Arrange & Act & Assert
			expect(categorizer.hasCrossCuttingIndicators("ALL caps")).toBe(true);
			expect(categorizer.hasCrossCuttingIndicators("EVERY time")).toBe(true);
			expect(
				categorizer.hasArchitecturalIndicators("ARCHITECTURE choice"),
			).toBe(true);
		});
	});

	describe("edge cases", () => {
		it("should return local/default for empty string", () => {
			// Arrange
			const text = "";

			// Act
			const result = categorizer.categorize(text);

			// Assert
			expect(result.scope).toBe("local");
			expect(result.confidence).toBe("default");
		});

		it("should prefer architectural over cross-cutting when both present", () => {
			// Arrange
			const text =
				"All modules should follow this architecture pattern everywhere";

			// Act
			const result = categorizer.categorize(text);

			// Assert
			expect(result.scope).toBe("architectural");
		});
	});
});
