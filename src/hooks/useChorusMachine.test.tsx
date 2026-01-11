import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { useChorusMachine } from "./useChorusMachine.js";

// Test component that exposes hook values
function TestComponent({
	onValues,
}: {
	onValues: (values: ReturnType<typeof useChorusMachine>) => void;
}) {
	const values = useChorusMachine({ config: { projectRoot: "/test" } });
	onValues(values);
	return null;
}

describe("useChorusMachine", () => {
	it("returns snapshot", () => {
		// Arrange
		let capturedValues: ReturnType<typeof useChorusMachine> | null = null;

		// Act
		render(
			<TestComponent
				onValues={(values) => {
					capturedValues = values;
				}}
			/>,
		);

		// Assert
		expect(capturedValues).not.toBeNull();
		expect(capturedValues!.snapshot).toBeDefined();
		expect(capturedValues!.snapshot.value).toMatchObject({
			app: "init",
			orchestration: "idle",
		});
	});

	it("returns send function", () => {
		// Arrange
		let capturedValues: ReturnType<typeof useChorusMachine> | null = null;

		// Act
		render(
			<TestComponent
				onValues={(values) => {
					capturedValues = values;
				}}
			/>,
		);

		// Assert
		expect(capturedValues).not.toBeNull();
		expect(capturedValues!.send).toBeDefined();
		expect(typeof capturedValues!.send).toBe("function");
	});

	it("agents selector returns spawned agent refs", () => {
		// Arrange
		let capturedValues: ReturnType<typeof useChorusMachine> | null = null;

		// Act
		render(
			<TestComponent
				onValues={(values) => {
					capturedValues = values;
				}}
			/>,
		);

		// Assert - initially empty
		expect(capturedValues).not.toBeNull();
		expect(capturedValues!.agents).toEqual([]);
	});

	it("mode selector returns current mode", () => {
		// Arrange
		let capturedValues: ReturnType<typeof useChorusMachine> | null = null;

		// Act
		render(
			<TestComponent
				onValues={(values) => {
					capturedValues = values;
				}}
			/>,
		);

		// Assert - default mode
		expect(capturedValues).not.toBeNull();
		expect(capturedValues!.mode).toBe("semi-auto");
	});

	it("spawnAgent helper is callable", () => {
		// Arrange
		let capturedValues: ReturnType<typeof useChorusMachine> | null = null;

		render(
			<TestComponent
				onValues={(values) => {
					capturedValues = values;
				}}
			/>,
		);

		// Assert - helper exists and is a function
		expect(capturedValues).not.toBeNull();
		expect(typeof capturedValues!.spawnAgent).toBe("function");

		// Act - should not throw
		expect(() => capturedValues!.spawnAgent("task-1")).not.toThrow();
	});

	it("pause/resume helpers are callable", () => {
		// Arrange
		let capturedValues: ReturnType<typeof useChorusMachine> | null = null;

		render(
			<TestComponent
				onValues={(values) => {
					capturedValues = values;
				}}
			/>,
		);

		// Assert - helpers exist and are functions
		expect(capturedValues).not.toBeNull();
		expect(typeof capturedValues!.pause).toBe("function");
		expect(typeof capturedValues!.resume).toBe("function");
		expect(typeof capturedValues!.setMode).toBe("function");
		expect(typeof capturedValues!.stopAgent).toBe("function");

		// Act - should not throw
		expect(() => capturedValues!.resume()).not.toThrow();
		expect(() => capturedValues!.pause()).not.toThrow();
		expect(() => capturedValues!.setMode("autopilot")).not.toThrow();
	});
});
