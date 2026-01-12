import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import type { ExitDialogState } from "../hooks/useExitHandler.js";
import ExitDialog from "./ExitDialog.js";

describe("ExitDialog", () => {
	const createState = (
		overrides: Partial<ExitDialogState> = {},
	): ExitDialogState => ({
		visible: true,
		countdown: 30,
		action: "pending",
		agentCount: 2,
		...overrides,
	});

	describe("visibility", () => {
		it("returns null when visible=false", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ExitDialog state={createState({ visible: false })} />,
			);

			// Assert
			expect(lastFrame()).toBe("");
		});

		it("renders when visible=true", () => {
			// Arrange & Act
			const { lastFrame } = render(<ExitDialog state={createState()} />);

			// Assert
			expect(lastFrame()).toContain("EXIT CHORUS");
		});
	});

	describe("pending state", () => {
		it("shows agent count", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ExitDialog state={createState({ agentCount: 3 })} />,
			);

			// Assert
			expect(lastFrame()).toContain("3 agents are still running");
		});

		it("shows singular for 1 agent", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ExitDialog state={createState({ agentCount: 1 })} />,
			);

			// Assert
			expect(lastFrame()).toContain("1 agent is still running");
		});

		it("shows kill option", () => {
			// Arrange & Act
			const { lastFrame } = render(<ExitDialog state={createState()} />);

			// Assert
			expect(lastFrame()).toContain("[k] Kill all agents");
		});

		it("shows wait option", () => {
			// Arrange & Act
			const { lastFrame } = render(<ExitDialog state={createState()} />);

			// Assert
			expect(lastFrame()).toContain("[w] Wait for agents");
		});

		it("shows cancel option", () => {
			// Arrange & Act
			const { lastFrame } = render(<ExitDialog state={createState()} />);

			// Assert
			expect(lastFrame()).toContain("[ESC] Cancel");
		});

		it("shows countdown", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ExitDialog state={createState({ countdown: 25 })} />,
			);

			// Assert
			expect(lastFrame()).toContain("Auto-kill in: 25s");
		});
	});

	describe("killing state", () => {
		it("shows stopping message", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ExitDialog state={createState({ action: "killing" })} />,
			);

			// Assert
			expect(lastFrame()).toContain("STOPPING AGENTS");
		});

		it("shows please wait message", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ExitDialog state={createState({ action: "killing" })} />,
			);

			// Assert
			expect(lastFrame()).toContain("Please wait");
		});
	});

	describe("waiting state", () => {
		it("shows waiting message", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ExitDialog state={createState({ action: "waiting" })} />,
			);

			// Assert
			expect(lastFrame()).toContain("WAITING FOR AGENTS");
		});

		it("shows agent count in waiting state", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ExitDialog
					state={createState({ action: "waiting", agentCount: 2 })}
				/>,
			);

			// Assert
			expect(lastFrame()).toContain("2 agents still running");
		});

		it("shows will exit message", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ExitDialog state={createState({ action: "waiting" })} />,
			);

			// Assert
			expect(lastFrame()).toContain("Will exit when all agents finish");
		});

		it("shows kill now option", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ExitDialog state={createState({ action: "waiting" })} />,
			);

			// Assert
			expect(lastFrame()).toContain("[k] Kill all now");
		});
	});
});
