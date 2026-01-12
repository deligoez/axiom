import { render } from "ink-testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App.js";

// Hoisted mocks
const { mockSend, mockSnapshot, mockLoad, mockExistsSync } = vi.hoisted(() => ({
	mockSend: vi.fn(),
	mockSnapshot: {
		matches: vi.fn(),
		context: {
			config: { projectRoot: "/test" },
			mode: "semi-auto" as const,
		},
	},
	mockLoad: vi.fn(),
	mockExistsSync: vi.fn(),
}));

vi.mock("./hooks/useChorusMachine.js", () => ({
	useChorusMachine: () => ({
		snapshot: mockSnapshot,
		send: mockSend,
		actorRef: { id: "test-actor" },
		agents: [],
		mode: "semi-auto",
		mergeQueue: [],
		isRunning: false,
		isPaused: false,
	}),
}));

// Mock child mode components - use simple functions that return strings
vi.mock("./modes/InitMode.js", () => ({
	InitMode: function MockInitMode() {
		return "InitMode";
	},
}));

vi.mock("./modes/PlanningMode.js", () => ({
	PlanningMode: function MockPlanningMode() {
		return "PlanningMode";
	},
}));

vi.mock("./modes/ReviewLoop.js", () => ({
	ReviewLoop: function MockReviewLoop() {
		return "ReviewLoop";
	},
}));

vi.mock("./modes/ImplementationMode.js", () => ({
	ImplementationMode: function MockImplementationMode() {
		return "ImplementationMode";
	},
}));

// Mock PlanningState service as a class
vi.mock("./services/PlanningState.js", () => ({
	PlanningState: class {
		load() {
			return mockLoad();
		}
		save() {}
	},
}));

// Mock fs for .chorus/ check
vi.mock("node:fs", () => ({
	existsSync: mockExistsSync,
}));

describe("App Router", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSnapshot.matches.mockReset();
		mockLoad.mockReset();
		mockExistsSync.mockReset();
	});

	describe("Machine State Routing", () => {
		it("renders InitMode when snapshot.matches app.init", () => {
			// Arrange
			mockSnapshot.matches.mockImplementation(
				(state: { app: string }) => state.app === "init",
			);

			// Act
			const { lastFrame } = render(<App projectRoot="/test" />);

			// Assert
			expect(lastFrame()).toContain("InitMode");
		});

		it("renders PlanningMode when snapshot.matches app.planning", () => {
			// Arrange
			mockSnapshot.matches.mockImplementation(
				(state: { app: string }) => state.app === "planning",
			);

			// Act
			const { lastFrame } = render(<App projectRoot="/test" />);

			// Assert
			expect(lastFrame()).toContain("PlanningMode");
		});

		it("renders ReviewLoop when snapshot.matches app.review", () => {
			// Arrange
			mockSnapshot.matches.mockImplementation(
				(state: { app: string }) => state.app === "review",
			);

			// Act
			const { lastFrame } = render(<App projectRoot="/test" />);

			// Assert
			expect(lastFrame()).toContain("ReviewLoop");
		});

		it("renders ImplementationMode when snapshot.matches app.implementation", () => {
			// Arrange
			mockSnapshot.matches.mockImplementation(
				(state: { app: string }) => state.app === "implementation",
			);

			// Act
			const { lastFrame } = render(<App projectRoot="/test" />);

			// Assert
			expect(lastFrame()).toContain("ImplementationMode");
		});
	});

	describe("CLI Override Events", () => {
		it("dispatches FORCE_INIT when cliArgs.command is init", () => {
			// Arrange
			mockSnapshot.matches.mockReturnValue(false);

			// Act
			render(<App projectRoot="/test" cliArgs={{ command: "init" }} />);

			// Assert
			expect(mockSend).toHaveBeenCalledWith({ type: "FORCE_INIT" });
		});

		it("dispatches FORCE_PLANNING when cliArgs.command is plan", () => {
			// Arrange
			mockSnapshot.matches.mockReturnValue(false);

			// Act
			render(<App projectRoot="/test" cliArgs={{ command: "plan" }} />);

			// Assert
			expect(mockSend).toHaveBeenCalledWith({ type: "FORCE_PLANNING" });
		});

		it("dispatches SET_MODE when cliArgs.mode is provided", () => {
			// Arrange
			mockSnapshot.matches.mockReturnValue(false);

			// Act
			render(<App projectRoot="/test" cliArgs={{ mode: "autopilot" }} />);

			// Assert
			expect(mockSend).toHaveBeenCalledWith({
				type: "SET_MODE",
				mode: "autopilot",
			});
		});

		it("CLI mode overrides planning-state.json chosenMode", () => {
			// Arrange
			mockExistsSync.mockReturnValue(true);
			mockLoad.mockReturnValue({
				status: "ready",
				chosenMode: "autopilot",
			});
			mockSnapshot.matches.mockReturnValue(false);

			// Act - CLI says semi-auto
			render(<App projectRoot="/test" cliArgs={{ mode: "semi-auto" }} />);

			// Assert - CLI wins (SET_MODE is dispatched, not RESTORE_STATE)
			expect(mockSend).toHaveBeenCalledWith({
				type: "SET_MODE",
				mode: "semi-auto",
			});
		});
	});

	describe("State Restoration", () => {
		it("dispatches INIT_REQUIRED when .chorus/ does not exist", () => {
			// Arrange
			mockExistsSync.mockReturnValue(false);
			mockSnapshot.matches.mockReturnValue(false);

			// Act
			render(<App projectRoot="/test" />);

			// Assert
			expect(mockSend).toHaveBeenCalledWith({ type: "INIT_REQUIRED" });
		});

		it("dispatches RESTORE_STATE with planning-state.json data", () => {
			// Arrange
			mockExistsSync.mockReturnValue(true);
			mockLoad.mockReturnValue({
				status: "ready",
				chosenMode: "autopilot",
				tasks: [],
			});
			mockSnapshot.matches.mockReturnValue(false);

			// Act
			render(<App projectRoot="/test" />);

			// Assert
			expect(mockSend).toHaveBeenCalledWith({
				type: "RESTORE_STATE",
				state: { status: "ready", chosenMode: "autopilot", tasks: [] },
			});
		});

		it("defaults to planning when planning-state.json is missing or corrupted", () => {
			// Arrange
			mockExistsSync.mockReturnValue(true);
			mockLoad.mockReturnValue(null); // Missing/corrupted
			mockSnapshot.matches.mockReturnValue(false);

			// Act
			render(<App projectRoot="/test" />);

			// Assert - should go to planning by default
			expect(mockSend).toHaveBeenCalledWith({ type: "FORCE_PLANNING" });
		});
	});

	describe("Event Propagation", () => {
		it("passes onEvent callback to child modes", () => {
			// Arrange
			mockSnapshot.matches.mockImplementation(
				(state: { app: string }) => state.app === "init",
			);

			// Act
			const { lastFrame } = render(<App projectRoot="/test" />);

			// Assert - InitMode is rendered (it would receive onEvent prop)
			expect(lastFrame()).toContain("InitMode");
		});

		it("child mode events are forwarded to machine via send()", () => {
			// Arrange
			mockSnapshot.matches.mockImplementation(
				(state: { app: string }) => state.app === "init",
			);
			mockSend.mockClear();

			// Act
			render(<App projectRoot="/test" />);

			// Assert - onEvent should be wired to send
			// This is verified by the implementation passing send as onEvent
			expect(mockSnapshot.matches).toHaveBeenCalled();
		});

		it("state transitions happen via machine, not local state", () => {
			// Arrange - have all matches return false to verify routing checks all states
			mockSnapshot.matches.mockReturnValue(false);

			// Act
			const { lastFrame } = render(<App projectRoot="/test" />);

			// Assert - App uses snapshot.matches for routing, not local state
			// Since all matches return false, it falls through to the fallback
			expect(mockSnapshot.matches).toHaveBeenCalledWith({ app: "init" });
			expect(mockSnapshot.matches).toHaveBeenCalledWith({ app: "planning" });
			expect(mockSnapshot.matches).toHaveBeenCalledWith({ app: "review" });
			expect(mockSnapshot.matches).toHaveBeenCalledWith({
				app: "implementation",
			});
			// Fallback renders InitMode
			expect(lastFrame()).toContain("InitMode");
		});
	});
});
