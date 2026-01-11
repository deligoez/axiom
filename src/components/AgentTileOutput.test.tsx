import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { AgentTileOutput } from "./AgentTileOutput.js";

describe("AgentTileOutput", () => {
	it("shows status text with dimColor", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<AgentTileOutput statusText="Reading auth configuration..." />,
		);

		// Assert - Ink applies ANSI codes for dimColor
		expect(lastFrame()).toContain("Reading auth configuration...");
	});

	it("shows command with gray $ prefix", () => {
		// Arrange & Act
		const { lastFrame } = render(<AgentTileOutput lastCommand="npm test" />);

		// Assert
		expect(lastFrame()).toContain("$");
		expect(lastFrame()).toContain("npm test");
	});

	it("shows green checkmark for all pass", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<AgentTileOutput testResult={{ passed: 47, failed: 0 }} />,
		);

		// Assert
		expect(lastFrame()).toContain("✓");
		expect(lastFrame()).toContain("47");
	});

	it("shows red X for failures", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<AgentTileOutput testResult={{ passed: 45, failed: 2 }} />,
		);

		// Assert
		expect(lastFrame()).toContain("✗");
	});

	it('shows "X passed, Y failed" format', () => {
		// Arrange & Act
		const { lastFrame } = render(
			<AgentTileOutput testResult={{ passed: 45, failed: 2 }} />,
		);

		// Assert
		expect(lastFrame()).toContain("45");
		expect(lastFrame()).toContain("passed");
		expect(lastFrame()).toContain("2");
		expect(lastFrame()).toContain("failed");
	});

	it('shows "X tests passed" format when no failures', () => {
		// Arrange & Act
		const { lastFrame } = render(
			<AgentTileOutput testResult={{ passed: 47, failed: 0 }} />,
		);

		// Assert
		expect(lastFrame()).toContain("47 tests passed");
	});

	it("handles zero test results (passed=0, failed=0)", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<AgentTileOutput testResult={{ passed: 0, failed: 0 }} />,
		);

		// Assert - should show "0 tests" or be empty/minimal
		expect(lastFrame()).toContain("0 tests");
	});

	it("handles missing optional props", () => {
		// Arrange & Act
		const { lastFrame } = render(<AgentTileOutput />);

		// Assert - should render without error (empty or minimal output)
		// Not crashing is success, and frame should be defined
		expect(lastFrame()).toBeDefined();
	});
});
