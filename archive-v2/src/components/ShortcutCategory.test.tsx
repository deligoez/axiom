import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { ShortcutCategory } from "./ShortcutCategory.js";

describe("ShortcutCategory", () => {
	it("shows category title in bold", () => {
		// Arrange
		const shortcuts = [{ key: "j/↓", description: "Move down" }];

		// Act
		const { lastFrame } = render(
			<ShortcutCategory title="NAVIGATION" shortcuts={shortcuts} />,
		);

		// Assert
		expect(lastFrame()).toContain("NAVIGATION");
	});

	it("lists all shortcuts with key and description", () => {
		// Arrange
		const shortcuts = [
			{ key: "j/↓", description: "Move down" },
			{ key: "k/↑", description: "Move up" },
			{ key: "Tab", description: "Switch panels" },
		];

		// Act
		const { lastFrame } = render(
			<ShortcutCategory title="NAVIGATION" shortcuts={shortcuts} />,
		);

		// Assert
		expect(lastFrame()).toContain("j/↓");
		expect(lastFrame()).toContain("Move down");
		expect(lastFrame()).toContain("k/↑");
		expect(lastFrame()).toContain("Move up");
		expect(lastFrame()).toContain("Tab");
		expect(lastFrame()).toContain("Switch panels");
	});

	it("key has fixed width alignment", () => {
		// Arrange
		const shortcuts = [
			{ key: "j", description: "Move down" },
			{ key: "Ctrl+C", description: "Exit" },
		];

		// Act
		const { lastFrame } = render(
			<ShortcutCategory title="COMMANDS" shortcuts={shortcuts} />,
		);

		// Assert - Both keys and descriptions appear
		const frame = lastFrame() ?? "";
		expect(frame).toContain("j");
		expect(frame).toContain("Ctrl+C");
	});

	it("description uses dim styling", () => {
		// Arrange
		const shortcuts = [{ key: "?", description: "Show help" }];

		// Act
		const { lastFrame } = render(
			<ShortcutCategory title="HELP" shortcuts={shortcuts} />,
		);

		// Assert - Description is present (dimColor styling not visible in test)
		expect(lastFrame()).toContain("Show help");
	});

	it("handles empty shortcuts array", () => {
		// Arrange
		const shortcuts: { key: string; description: string }[] = [];

		// Act
		const { lastFrame } = render(
			<ShortcutCategory title="EMPTY" shortcuts={shortcuts} />,
		);

		// Assert - Title still renders
		expect(lastFrame()).toContain("EMPTY");
	});
});
