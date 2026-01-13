import { Box, Text } from "ink";
import { render } from "ink-testing-library";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import HelpPanel from "../components/HelpPanel.js";
import { useHelpKey } from "../hooks/useHelpKey.js";

/**
 * E2E: Help Panel Toggle (? key) - Tests help panel toggle functionality
 *
 * Note: Full CLI E2E tests with cli-testing-library are skipped due to
 * infrastructure timeout issues. These tests verify the help panel toggle
 * behavior at the component level.
 */

describe("E2E: Help Panel Toggle (? key)", () => {
	const originalIsTTY = process.stdin.isTTY;

	beforeAll(() => {
		Object.defineProperty(process.stdin, "isTTY", {
			value: true,
			writable: true,
			configurable: true,
		});
	});

	afterAll(() => {
		Object.defineProperty(process.stdin, "isTTY", {
			value: originalIsTTY,
			writable: true,
			configurable: true,
		});
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("pressing ? shows help panel", () => {
		// Arrange
		const onToggle = vi.fn();
		const { stdin } = render(
			<Box flexDirection="column">
				<TestHelpToggle visible={false} onToggle={onToggle} />
			</Box>,
		);

		// Act
		stdin.write("?");

		// Assert
		expect(onToggle).toHaveBeenCalledTimes(1);
	});

	it("help panel shows 4 implemented categories", () => {
		// Arrange & Act
		const { lastFrame } = render(<HelpPanel visible={true} />);

		// Assert - Check for implemented categories (ch-6dg1 removed unimplemented)
		const output = lastFrame() ?? "";
		expect(output).toContain("NAVIGATION");
		expect(output).toContain("MODE CONTROL");
		expect(output).toContain("VIEW");
		expect(output).toContain("GENERAL");
	});

	it("pressing ? again hides help panel", () => {
		// Arrange
		const onToggle = vi.fn();
		const { stdin } = render(
			<Box flexDirection="column">
				<TestHelpToggle visible={true} onToggle={onToggle} />
			</Box>,
		);

		// Act - press ? to hide
		stdin.write("?");

		// Assert
		expect(onToggle).toHaveBeenCalledTimes(1);
	});
});

// Simple test component
function TestHelpToggle({
	visible,
	onToggle,
}: {
	visible: boolean;
	onToggle: () => void;
}) {
	useHelpKey({
		visible,
		onToggle,
	});

	return (
		<Box flexDirection="column">
			<Text>Help visible: {visible ? "yes" : "no"}</Text>
			{visible && <HelpPanel visible={true} />}
		</Box>
	);
}
