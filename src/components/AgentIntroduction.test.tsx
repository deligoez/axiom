import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import { AgentIntroduction } from "./AgentIntroduction.js";

describe("AgentIntroduction", () => {
	it("renders all 6 agents with names", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<AgentIntroduction onFinish={vi.fn()} projectDir="/test" />,
		);

		// Assert
		const output = lastFrame() ?? "";
		expect(output).toContain("Sage");
		expect(output).toContain("Chip");
		expect(output).toContain("Archie");
		expect(output).toContain("Patch");
		expect(output).toContain("Scout");
		expect(output).toContain("Echo");
	});

	it("shows agent roles", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<AgentIntroduction onFinish={vi.fn()} projectDir="/test" />,
		);

		// Assert
		const output = lastFrame() ?? "";
		expect(output).toContain("analyzer");
		expect(output).toContain("implementer");
		expect(output).toContain("architect");
		expect(output).toContain("fixer");
		expect(output).toContain("explorer");
		expect(output).toContain("reviewer");
	});

	it("shows file paths for persona customization", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<AgentIntroduction onFinish={vi.fn()} projectDir="/test" />,
		);

		// Assert
		const output = lastFrame() ?? "";
		expect(output).toContain(".chorus/agents/");
		expect(output).toContain("prompt.md");
		expect(output).toContain("rules.md");
		expect(output).toContain("skills/");
	});

	it("shows shared rules path", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<AgentIntroduction onFinish={vi.fn()} projectDir="/test" />,
		);

		// Assert
		const output = lastFrame() ?? "";
		expect(output).toContain(".chorus/rules/");
	});

	it("shows instruction to press any key to finish", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<AgentIntroduction onFinish={vi.fn()} projectDir="/test" />,
		);

		// Assert
		const output = lastFrame() ?? "";
		expect(output).toMatch(/press any key/i);
	});
});
