/**
 * Persona Color Theme
 *
 * Color definitions for TUI persona display with WCAG AA compliance.
 */

/**
 * Color set for a persona.
 */
export interface PersonaColorSet {
	/** Primary accent color for the persona */
	primary: string;
	/** Background color for containers */
	background: string;
	/** Text color for readability */
	text: string;
}

/**
 * All persona color themes.
 * Colors are chosen to meet WCAG AA contrast requirements (4.5:1 minimum).
 */
export const PERSONA_COLORS: Record<string, PersonaColorSet> = {
	sage: {
		primary: "#FF00FF", // Magenta
		background: "#1A0A1A", // Dark magenta
		text: "#FFFFFF", // White
	},
	chip: {
		primary: "#00FFFF", // Cyan
		background: "#0A1A1A", // Dark cyan
		text: "#FFFFFF", // White
	},
	archie: {
		primary: "#FFD700", // Gold/Yellow
		background: "#1A1500", // Dark yellow
		text: "#FFFFFF", // White
	},
	patch: {
		primary: "#00FF00", // Green
		background: "#0A1A0A", // Dark green
		text: "#FFFFFF", // White
	},
	scout: {
		primary: "#0088FF", // Blue
		background: "#0A0F1A", // Dark blue
		text: "#FFFFFF", // White
	},
	echo: {
		primary: "#FF4444", // Red
		background: "#1A0A0A", // Dark red
		text: "#FFFFFF", // White
	},
	maestro: {
		primary: "#BB86FC", // Purple
		background: "#1A0A1F", // Dark purple
		text: "#FFFFFF", // White
	},
};

/**
 * Calculate relative luminance of a hex color.
 * @see https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
function getRelativeLuminance(hex: string): number {
	// Remove # if present
	const cleanHex = hex.replace("#", "");

	// Parse RGB values
	const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
	const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
	const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

	// Apply gamma correction
	const sR = r <= 0.03928 ? r / 12.92 : ((r + 0.055) / 1.055) ** 2.4;
	const sG = g <= 0.03928 ? g / 12.92 : ((g + 0.055) / 1.055) ** 2.4;
	const sB = b <= 0.03928 ? b / 12.92 : ((b + 0.055) / 1.055) ** 2.4;

	// Calculate luminance
	return 0.2126 * sR + 0.7152 * sG + 0.0722 * sB;
}

/**
 * Calculate WCAG contrast ratio between two colors.
 * @see https://www.w3.org/TR/WCAG20/#contrast-ratiodef
 *
 * @param foreground - Foreground hex color
 * @param background - Background hex color
 * @returns Contrast ratio (1:1 to 21:1)
 */
export function getContrastRatio(
	foreground: string,
	background: string,
): number {
	const L1 = getRelativeLuminance(foreground);
	const L2 = getRelativeLuminance(background);

	const lighter = Math.max(L1, L2);
	const darker = Math.min(L1, L2);

	return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get color set for a persona.
 *
 * @param persona - Persona name
 * @returns Color set for the persona
 */
export function getPersonaColor(persona: string): PersonaColorSet {
	const colors = PERSONA_COLORS[persona];
	if (!colors) {
		// Default to sage colors if persona not found
		return PERSONA_COLORS.sage;
	}
	return colors;
}
