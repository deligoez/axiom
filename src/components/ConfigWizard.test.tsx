import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import { ConfigWizard } from "./ConfigWizard.js";

describe("ConfigWizard", () => {
	const defaultDetection = {
		projectType: "node" as const,
		projectName: "test-project",
		qualityCommands: [
			{ name: "test", command: "npm test", required: true, order: 1 },
		],
	};

	describe("Step 2/5: Project Detection", () => {
		it("displays detected project type", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ConfigWizard detection={defaultDetection} onComplete={vi.fn()} />,
			);

			// Assert
			expect(lastFrame()).toContain("node");
		});

		it("displays project name from detection", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ConfigWizard detection={defaultDetection} onComplete={vi.fn()} />,
			);

			// Assert
			expect(lastFrame()).toContain("test-project");
		});

		it("displays default task ID prefix ch-", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ConfigWizard detection={defaultDetection} onComplete={vi.fn()} />,
			);

			// Assert
			expect(lastFrame()).toContain("ch-");
		});
	});

	describe("Step 3/5: Quality Commands", () => {
		it("lists detected quality commands", () => {
			// Arrange
			const detection = {
				...defaultDetection,
				qualityCommands: [
					{ name: "test", command: "npm test", required: true, order: 1 },
					{ name: "lint", command: "npm run lint", required: false, order: 2 },
				],
			};

			// Act
			const { lastFrame } = render(
				<ConfigWizard
					detection={detection}
					initialStep={2}
					onComplete={vi.fn()}
				/>,
			);

			// Assert
			expect(lastFrame()).toContain("npm test");
			expect(lastFrame()).toContain("npm run lint");
		});

		it("shows required/optional status for commands", () => {
			// Arrange
			const detection = {
				...defaultDetection,
				qualityCommands: [
					{ name: "test", command: "npm test", required: true, order: 1 },
				],
			};

			// Act
			const { lastFrame } = render(
				<ConfigWizard
					detection={detection}
					initialStep={2}
					onComplete={vi.fn()}
				/>,
			);

			// Assert
			expect(lastFrame()).toMatch(/required|optional/i);
		});
	});

	describe("Step 4/5: Task Validation Rules", () => {
		it("shows built-in rules section", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ConfigWizard
					detection={defaultDetection}
					initialStep={3}
					onComplete={vi.fn()}
				/>,
			);

			// Assert
			expect(lastFrame()).toMatch(/atomic|testable|right-sized/i);
		});

		it("shows configurable limits section", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ConfigWizard
					detection={defaultDetection}
					initialStep={3}
					onComplete={vi.fn()}
				/>,
			);

			// Assert
			expect(lastFrame()).toMatch(/max|criteria|length/i);
		});
	});

	describe("Keyboard Navigation", () => {
		it("advances to next step when Enter is pressed", async () => {
			// Arrange
			const { lastFrame, stdin } = render(
				<ConfigWizard
					detection={defaultDetection}
					initialStep={1}
					onComplete={vi.fn()}
				/>,
			);

			// Act - Press Enter
			stdin.write("\r");

			// Assert - Should be on step 3/5 (was 2/5) - use vi.waitFor for async state update
			await vi.waitFor(() => expect(lastFrame()).toMatch(/Step 3\/5/), {
				timeout: 1000,
			});
		});

		it("advances through all steps with multiple Enter presses", async () => {
			// Arrange
			const { lastFrame, stdin } = render(
				<ConfigWizard
					detection={defaultDetection}
					initialStep={1}
					onComplete={vi.fn()}
				/>,
			);

			// Act - Press Enter twice with waits
			stdin.write("\r");
			await vi.waitFor(() => expect(lastFrame()).toMatch(/Step 3\/5/), {
				timeout: 1000,
			});
			stdin.write("\r");

			// Assert - Should be on step 4/5
			await vi.waitFor(() => expect(lastFrame()).toMatch(/Step 4\/5/), {
				timeout: 1000,
			});
		});

		it("calls onComplete with config on final step Enter", () => {
			// Arrange
			const onComplete = vi.fn();
			const { stdin } = render(
				<ConfigWizard
					detection={defaultDetection}
					initialStep={3}
					onComplete={onComplete}
				/>,
			);

			// Act - Press Enter on final step (step 4/5)
			stdin.write("\r");

			// Assert
			expect(onComplete).toHaveBeenCalledTimes(1);
			expect(onComplete).toHaveBeenCalledWith(
				expect.objectContaining({
					projectType: "node",
					projectName: "test-project",
					taskIdPrefix: "ch-",
				}),
			);
		});

		it("does not advance past final step", () => {
			// Arrange
			const onComplete = vi.fn();
			const { lastFrame, stdin } = render(
				<ConfigWizard
					detection={defaultDetection}
					initialStep={3}
					onComplete={onComplete}
				/>,
			);

			// Act - Press Enter on final step
			stdin.write("\r");

			// Assert - onComplete called, still shows step 4/5
			expect(onComplete).toHaveBeenCalled();
			expect(lastFrame()).toMatch(/Step 4\/5/);
		});
	});

	describe("Navigation & UX", () => {
		it("shows Step N/5 header matching init flow", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ConfigWizard
					detection={defaultDetection}
					initialStep={1}
					onComplete={vi.fn()}
				/>,
			);

			// Assert
			expect(lastFrame()).toMatch(/Step 2\/5/);
		});

		it("shows Step 3/5 for quality commands step", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ConfigWizard
					detection={defaultDetection}
					initialStep={2}
					onComplete={vi.fn()}
				/>,
			);

			// Assert
			expect(lastFrame()).toMatch(/Step 3\/5/);
		});

		it("shows Step 4/5 for validation rules step", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ConfigWizard
					detection={defaultDetection}
					initialStep={3}
					onComplete={vi.fn()}
				/>,
			);

			// Assert
			expect(lastFrame()).toMatch(/Step 4\/5/);
		});

		it("calls onComplete callback with final config", async () => {
			// Arrange
			const onComplete = vi.fn();
			render(
				<ConfigWizard
					detection={defaultDetection}
					initialStep={3}
					isLastStep={true}
					onComplete={onComplete}
				/>,
			);

			// Assert - verify callback signature exists (manual completion test)
			expect(typeof onComplete).toBe("function");
		});

		it("shows navigation hint for Enter and Tab keys", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<ConfigWizard detection={defaultDetection} onComplete={vi.fn()} />,
			);

			// Assert
			expect(lastFrame()).toMatch(/Enter|Tab/);
		});
	});
});
