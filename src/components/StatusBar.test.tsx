import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import StatusBar from "./StatusBar.js";

describe("StatusBar", () => {
	it("renders app name", () => {
		const { lastFrame } = render(<StatusBar />);

		expect(lastFrame()).toContain("Chorus");
	});

	it("displays agent count when provided", () => {
		const { lastFrame } = render(<StatusBar agentCount={3} />);

		expect(lastFrame()).toContain("3");
		expect(lastFrame()).toContain("agent");
	});

	it("shows status message when provided", () => {
		const { lastFrame } = render(<StatusBar status="Running" />);

		expect(lastFrame()).toContain("Running");
	});

	it("shows help hint", () => {
		const { lastFrame } = render(<StatusBar />);

		expect(lastFrame()).toContain("q");
	});
});
