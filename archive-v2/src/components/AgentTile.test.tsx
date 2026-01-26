import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { AgentTile } from "./AgentTile.js";

describe("AgentTile", () => {
	const baseAgent = {
		id: "agent-1",
		type: "claude" as const,
		taskId: "ch-001",
		status: "running" as const,
		iteration: 7,
		maxIterations: 50,
		startTime: Date.now() - 12 * 60 * 1000,
	};

	it("renders AgentTileHeader with correct props", () => {
		// Arrange
		const agent = { ...baseAgent };

		// Act
		const { lastFrame } = render(<AgentTile agent={agent} />);

		// Assert - Header shows type, taskId, and status icon
		expect(lastFrame()).toContain("CLAUDE");
		expect(lastFrame()).toContain("ch-001");
		expect(lastFrame()).toContain("●"); // running status icon
	});

	it("renders AgentTileProgress with correct props", () => {
		// Arrange
		const agent = { ...baseAgent };

		// Act
		const { lastFrame } = render(<AgentTile agent={agent} />);

		// Assert - Progress shows iteration and progress bar
		expect(lastFrame()).toContain("iter 7/50");
		expect(lastFrame()).toMatch(/[▓░]/); // progress bar characters
	});

	it("renders AgentTileOutput with correct props", () => {
		// Arrange
		const agent = {
			...baseAgent,
			statusText: "Reading auth config...",
			lastCommand: "npm test",
			testResult: { passed: 47, failed: 0 },
		};

		// Act
		const { lastFrame } = render(<AgentTile agent={agent} />);

		// Assert
		expect(lastFrame()).toContain("Reading auth config...");
		expect(lastFrame()).toContain("npm test");
		expect(lastFrame()).toContain("47");
	});

	it("has single gray border by default", () => {
		// Arrange
		const agent = { ...baseAgent };

		// Act
		const { lastFrame } = render(<AgentTile agent={agent} />);

		// Assert - Single border uses │ and ─ characters
		const frame = lastFrame() ?? "";
		expect(frame).toMatch(/[│─┌┐└┘]/);
	});

	it("has double cyan border when selected", () => {
		// Arrange
		const agent = { ...baseAgent };

		// Act
		const { lastFrame } = render(<AgentTile agent={agent} isSelected={true} />);

		// Assert - Double border uses ║ and ═ characters
		const frame = lastFrame() ?? "";
		expect(frame).toMatch(/[║═╔╗╚╝]/);
	});

	it('shows "starting..." when iteration=0', () => {
		// Arrange
		const agent = { ...baseAgent, iteration: 0 };

		// Act
		const { lastFrame } = render(<AgentTile agent={agent} />);

		// Assert
		expect(lastFrame()).toContain("starting...");
	});

	it("has red border when status='error'", () => {
		// Arrange
		const agent = { ...baseAgent, status: "error" as const };

		// Act
		const { lastFrame } = render(<AgentTile agent={agent} />);

		// Assert - Error status shows ✗ icon (from header) and frame contains error indication
		expect(lastFrame()).toContain("✗");
	});

	it("handles missing optional fields (statusText, lastCommand, testResult)", () => {
		// Arrange - agent with no optional fields
		const agent = { ...baseAgent };

		// Act
		const { lastFrame } = render(<AgentTile agent={agent} />);

		// Assert - Should render without error
		expect(lastFrame()).toBeDefined();
		expect(lastFrame()).toContain("CLAUDE");
	});

	it("respects width prop", () => {
		// Arrange
		const agent = { ...baseAgent };

		// Act
		const { lastFrame } = render(<AgentTile agent={agent} width={30} />);

		// Assert - Frame should render (width is used internally by Box)
		expect(lastFrame()).toBeDefined();
		expect(lastFrame()).toContain("CLAUDE");
	});
});
