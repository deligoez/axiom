import { describe, expect, it } from "vitest";
import {
	getContrastRatio,
	getPersonaColor,
	PERSONA_COLORS,
} from "./persona-colors.js";

describe("Persona Colors", () => {
	describe("PERSONA_COLORS constant", () => {
		it("contains all 7 personas", () => {
			// Arrange
			const personaNames = [
				"sage",
				"chip",
				"archie",
				"patch",
				"scout",
				"echo",
				"maestro",
			];

			// Assert
			for (const name of personaNames) {
				expect(
					PERSONA_COLORS[name as keyof typeof PERSONA_COLORS],
				).toBeDefined();
			}
			expect(Object.keys(PERSONA_COLORS)).toHaveLength(7);
		});

		it("each persona has primary, background, and text colors", () => {
			// Assert
			for (const colors of Object.values(PERSONA_COLORS)) {
				expect(colors.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
				expect(colors.background).toMatch(/^#[0-9a-fA-F]{6}$/);
				expect(colors.text).toMatch(/^#[0-9a-fA-F]{6}$/);
			}
		});
	});

	describe("getContrastRatio()", () => {
		it("calculates WCAG contrast ratio correctly", () => {
			// Arrange - known values
			// White on black has 21:1 contrast
			// Black on white has 21:1 contrast

			// Act & Assert
			expect(getContrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 0);
			expect(getContrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
		});

		it("returns 1:1 for identical colors", () => {
			// Act & Assert
			expect(getContrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 0);
			expect(getContrastRatio("#000000", "#000000")).toBeCloseTo(1, 0);
		});
	});

	describe("getPersonaColor()", () => {
		it("returns color set for given persona", () => {
			// Act
			const sageColors = getPersonaColor("sage");

			// Assert
			expect(sageColors).toBeDefined();
			expect(sageColors.primary).toBeDefined();
			expect(sageColors.background).toBeDefined();
			expect(sageColors.text).toBeDefined();
		});
	});

	describe("WCAG AA Contrast Validation", () => {
		const MIN_CONTRAST_RATIO = 4.5;

		it("sage: primary/background contrast >= 4.5:1", () => {
			// Arrange
			const { primary, background } = PERSONA_COLORS.sage;

			// Act
			const ratio = getContrastRatio(primary, background);

			// Assert
			expect(ratio).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO);
		});

		it("chip: primary/background contrast >= 4.5:1", () => {
			// Arrange
			const { primary, background } = PERSONA_COLORS.chip;

			// Act
			const ratio = getContrastRatio(primary, background);

			// Assert
			expect(ratio).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO);
		});

		it("archie: primary/background contrast >= 4.5:1", () => {
			// Arrange
			const { primary, background } = PERSONA_COLORS.archie;

			// Act
			const ratio = getContrastRatio(primary, background);

			// Assert
			expect(ratio).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO);
		});

		it("patch: primary/background contrast >= 4.5:1", () => {
			// Arrange
			const { primary, background } = PERSONA_COLORS.patch;

			// Act
			const ratio = getContrastRatio(primary, background);

			// Assert
			expect(ratio).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO);
		});

		it("scout: primary/background contrast >= 4.5:1", () => {
			// Arrange
			const { primary, background } = PERSONA_COLORS.scout;

			// Act
			const ratio = getContrastRatio(primary, background);

			// Assert
			expect(ratio).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO);
		});

		it("echo: primary/background contrast >= 4.5:1", () => {
			// Arrange
			const { primary, background } = PERSONA_COLORS.echo;

			// Act
			const ratio = getContrastRatio(primary, background);

			// Assert
			expect(ratio).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO);
		});

		it("maestro: primary/background contrast >= 4.5:1", () => {
			// Arrange
			const { primary, background } = PERSONA_COLORS.maestro;

			// Act
			const ratio = getContrastRatio(primary, background);

			// Assert
			expect(ratio).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO);
		});
	});
});
