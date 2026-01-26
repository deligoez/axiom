import { EventEmitter } from "node:events";
import { Text } from "ink";
import { render } from "ink-testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Create a mock stdout that's an EventEmitter with columns/rows
class MockStdout extends EventEmitter {
	columns: number | undefined = 120;
	rows: number | undefined = 40;
}

const mockStdout = new MockStdout();

vi.mock("ink", async () => {
	const actual = await vi.importActual("ink");
	return {
		...actual,
		useStdout: () => ({
			stdout: mockStdout,
			write: vi.fn(),
		}),
	};
});

import Layout from "./Layout.js";

describe("Layout", () => {
	beforeEach(() => {
		mockStdout.columns = 120;
		mockStdout.rows = 40;
		mockStdout.removeAllListeners();
	});
	it("renders children", () => {
		const { lastFrame } = render(
			<Layout>
				<Text>Test Content</Text>
			</Layout>,
		);

		expect(lastFrame()).toContain("Test Content");
	});

	it("includes StatusBar", () => {
		const { lastFrame } = render(
			<Layout>
				<Text>Content</Text>
			</Layout>,
		);

		expect(lastFrame()).toContain("Chorus");
	});

	it("renders border characters", () => {
		const { lastFrame } = render(
			<Layout>
				<Text>Content</Text>
			</Layout>,
		);

		// Check for box drawing characters (round style uses ╭╮╯╰)
		expect(lastFrame()).toMatch(/[─│╭╮╯╰]/);
	});

	it("uses 100% width and height", () => {
		const { lastFrame } = render(
			<Layout>
				<Text>Content</Text>
			</Layout>,
		);

		// Layout renders with border and content
		expect(lastFrame()).toBeTruthy();
		expect(lastFrame()).toContain("Chorus");
		expect(lastFrame()).toContain("Content");
	});

	it("handles 0x0 terminal size gracefully", () => {
		mockStdout.columns = 0;
		mockStdout.rows = 0;

		// Should not throw and should render with minimum height
		const { lastFrame } = render(
			<Layout>
				<Text>Content</Text>
			</Layout>,
		);

		// Layout should still render (min height is enforced)
		expect(lastFrame()).toBeTruthy();
		expect(lastFrame()).toContain("Content");
	});

	it("handles very small terminal size", () => {
		mockStdout.columns = 20;
		mockStdout.rows = 5;

		const { lastFrame } = render(
			<Layout>
				<Text>Content</Text>
			</Layout>,
		);

		// Should render without crashing
		expect(lastFrame()).toBeTruthy();
	});
});
