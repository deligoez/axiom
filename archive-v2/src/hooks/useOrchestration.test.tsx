import { render } from "ink-testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UseOrchestrationReturn } from "./useOrchestration.js";
import { useOrchestration } from "./useOrchestration.js";

// Mock useChorusMachine
vi.mock("./useChorusMachine.js", () => ({
	useChorusMachine: vi.fn(() => ({
		actorRef: { send: vi.fn() },
		send: vi.fn(),
		snapshot: {
			context: { stats: { completed: 0, failed: 0, inProgress: 0 } },
		},
		agents: [],
		mode: "semi-auto" as const,
		isRunning: false,
		isPaused: false,
		spawnAgent: vi.fn(),
		stopAgent: vi.fn(),
		pause: vi.fn(),
		resume: vi.fn(),
		setMode: vi.fn(),
	})),
}));

// Capture hook result
let capturedResult: UseOrchestrationReturn | undefined;

function TestComponent({ config }: { config: { projectRoot: string } }) {
	const result = useOrchestration({ config });
	capturedResult = result;
	return null;
}

describe("useOrchestration", () => {
	beforeEach(() => {
		capturedResult = undefined;
		vi.clearAllMocks();
	});

	const defaultConfig = { projectRoot: "/test" };

	describe("State Exposure", () => {
		it("returns status from machine state", () => {
			// Act
			render(<TestComponent config={defaultConfig} />);

			// Assert
			expect(capturedResult).toBeDefined();
			expect(capturedResult!.status).toBe("idle");
		});

		it("returns isPaused and isRunning booleans", () => {
			// Act
			render(<TestComponent config={defaultConfig} />);

			// Assert
			expect(capturedResult).toBeDefined();
			expect(typeof capturedResult!.isPaused).toBe("boolean");
			expect(typeof capturedResult!.isRunning).toBe("boolean");
		});

		it("returns mode, agents, stats from machine context", () => {
			// Act
			render(<TestComponent config={defaultConfig} />);

			// Assert
			expect(capturedResult).toBeDefined();
			expect(capturedResult!.mode).toBe("semi-auto");
			expect(Array.isArray(capturedResult!.agents)).toBe(true);
			expect(capturedResult!.stats).toBeDefined();
		});
	});

	describe("Action Helpers", () => {
		it("startTask is a function", () => {
			// Act
			render(<TestComponent config={defaultConfig} />);

			// Assert
			expect(capturedResult).toBeDefined();
			expect(typeof capturedResult!.startTask).toBe("function");
		});

		it("stopAgent is a function", () => {
			// Act
			render(<TestComponent config={defaultConfig} />);

			// Assert
			expect(capturedResult).toBeDefined();
			expect(typeof capturedResult!.stopAgent).toBe("function");
		});

		it("pause is a function", () => {
			// Act
			render(<TestComponent config={defaultConfig} />);

			// Assert
			expect(capturedResult).toBeDefined();
			expect(typeof capturedResult!.pause).toBe("function");
		});

		it("resume is a function", () => {
			// Act
			render(<TestComponent config={defaultConfig} />);

			// Assert
			expect(capturedResult).toBeDefined();
			expect(typeof capturedResult!.resume).toBe("function");
		});

		it("setMode is a function", () => {
			// Act
			render(<TestComponent config={defaultConfig} />);

			// Assert
			expect(capturedResult).toBeDefined();
			expect(typeof capturedResult!.setMode).toBe("function");
		});
	});

	describe("Performance", () => {
		it("uses useChorusMachine hook internally", async () => {
			// Act
			render(<TestComponent config={defaultConfig} />);

			// Assert - hook should be called (mock is set up at top)
			const { useChorusMachine } = await import("./useChorusMachine.js");
			expect(useChorusMachine).toHaveBeenCalled();
		});
	});
});
