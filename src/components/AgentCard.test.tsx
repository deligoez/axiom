import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { createAgentIdentity } from "../types/persona.js";
import { AgentCard, getAgentDisplayName } from "./AgentCard.js";

describe("AgentCard", () => {
	it("shows persona display name in header", () => {
		// Arrange
		const identity = createAgentIdentity("chip", 1);

		// Act
		const { lastFrame } = render(
			<AgentCard identity={identity} status="running" />,
		);

		// Assert - display name shown
		expect(lastFrame()).toContain("Chip-001");
	});

	it("shows numbered identity for workers (non-singular)", () => {
		// Arrange
		const identity1 = createAgentIdentity("chip", 1);
		const identity2 = createAgentIdentity("chip", 42);

		// Act
		const { lastFrame: frame1 } = render(
			<AgentCard identity={identity1} status="idle" />,
		);
		const { lastFrame: frame2 } = render(
			<AgentCard identity={identity2} status="idle" />,
		);

		// Assert - numbered identity with padding
		expect(frame1()).toContain("Chip-001");
		expect(frame2()).toContain("Chip-042");
	});

	it("shows name only for singular personas (no number)", () => {
		// Arrange - Sage and Echo are singular
		const sageIdentity = createAgentIdentity("sage");
		const echoIdentity = createAgentIdentity("echo");

		// Act
		const { lastFrame: sageFrame } = render(
			<AgentCard identity={sageIdentity} status="idle" />,
		);
		const { lastFrame: echoFrame } = render(
			<AgentCard identity={echoIdentity} status="idle" />,
		);

		// Assert - no number suffix
		expect(sageFrame()).toContain("Sage");
		expect(sageFrame()).not.toContain("Sage-");
		expect(echoFrame()).toContain("Echo");
		expect(echoFrame()).not.toContain("Echo-");
	});

	it("uses persona primary color for border", () => {
		// Arrange - chip has cyan, sage has magenta
		const chipIdentity = createAgentIdentity("chip", 1);
		const sageIdentity = createAgentIdentity("sage");

		// Act
		const { lastFrame: chipFrame } = render(
			<AgentCard identity={chipIdentity} status="idle" />,
		);
		const { lastFrame: sageFrame } = render(
			<AgentCard identity={sageIdentity} status="idle" />,
		);

		// Assert - borders are rendered (color applied through ink)
		// Can't directly test border color in ink-testing-library,
		// but we can verify component renders without error
		expect(chipFrame()).toContain("Chip-001");
		expect(sageFrame()).toContain("Sage");
	});

	it("shows correct status indicators", () => {
		// Arrange
		const identity = createAgentIdentity("chip", 1);

		// Act & Assert - each status has its indicator
		const { lastFrame: idle } = render(
			<AgentCard identity={identity} status="idle" />,
		);
		expect(idle()).toContain("○"); // idle

		const { lastFrame: running } = render(
			<AgentCard identity={identity} status="running" />,
		);
		expect(running()).toContain("●"); // running

		const { lastFrame: error } = render(
			<AgentCard identity={identity} status="error" />,
		);
		expect(error()).toContain("✗"); // error

		const { lastFrame: completed } = render(
			<AgentCard identity={identity} status="completed" />,
		);
		expect(completed()).toContain("✓"); // completed
	});
});

describe("getAgentDisplayName", () => {
	it("returns numbered name for non-singular personas", () => {
		// Act & Assert
		expect(getAgentDisplayName("chip", 1)).toBe("Chip-001");
		expect(getAgentDisplayName("chip", 42)).toBe("Chip-042");
		expect(getAgentDisplayName("patch", 100)).toBe("Patch-100");
		expect(getAgentDisplayName("scout", 5)).toBe("Scout-005");
	});

	it("returns plain name for singular personas", () => {
		// Act & Assert - singular personas ignore instance number
		expect(getAgentDisplayName("sage")).toBe("Sage");
		expect(getAgentDisplayName("sage", 1)).toBe("Sage"); // number ignored
		expect(getAgentDisplayName("archie")).toBe("Archie");
		expect(getAgentDisplayName("echo")).toBe("Echo");
	});
});
