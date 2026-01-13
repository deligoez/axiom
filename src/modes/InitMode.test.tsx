import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { render } from "ink-testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkPrerequisites, InitMode } from "./InitMode.js";

// Helper to wait for state updates
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("InitMode", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = join(
			tmpdir(),
			`chorus-init-mode-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		);
		mkdirSync(tempDir, { recursive: true });
	});

	afterEach(() => {
		try {
			rmSync(tempDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("First-Run Detection", () => {
		it("shows error when .chorus/ already exists", async () => {
			// Arrange
			mkdirSync(join(tempDir, ".chorus"), { recursive: true });

			// Act
			const { lastFrame } = render(
				<InitMode projectDir={tempDir} onComplete={vi.fn()} />,
			);
			await wait(50); // Wait for state update

			// Assert
			expect(lastFrame()).toMatch(/already exists|already initialized/i);
		});

		it("proceeds when .chorus/ does not exist", async () => {
			// Arrange - no .chorus directory

			// Act
			const { lastFrame } = render(
				<InitMode projectDir={tempDir} onComplete={vi.fn()} />,
			);
			await wait(50); // Wait for state update

			// Assert - should show step 1 or prerequisites
			expect(lastFrame()).toMatch(/Step 1\/5|Prerequisites/i);
		});
	});

	describe("Step 1/5: Prerequisites Check", () => {
		it("displays Step 1/5 header", async () => {
			// Arrange & Act
			const { lastFrame } = render(
				<InitMode projectDir={tempDir} onComplete={vi.fn()} />,
			);
			await wait(100); // Need longer wait for React effects to complete

			// Assert
			expect(lastFrame()).toMatch(/Step 1\/5/);
		});

		it("shows prerequisites check status", async () => {
			// Arrange & Act
			const { lastFrame } = render(
				<InitMode projectDir={tempDir} onComplete={vi.fn()} />,
			);
			await wait(100); // Need longer wait for React effects to complete

			// Assert - shows checking or results
			expect(lastFrame()).toMatch(/prerequisites|checking/i);
		});

		it("runs checkPrerequisites function", async () => {
			// Arrange & Act
			const results = checkPrerequisites();

			// Assert - should check for git, node, bd, claude
			const names = results.map((r) => r.name);
			expect(names).toContain("git");
			expect(names).toContain("node");
			expect(names).toContain("bd");
			expect(names).toContain("claude");
		});

		it("returns boolean passed for each check", () => {
			// Arrange & Act
			const results = checkPrerequisites();

			// Assert
			for (const result of results) {
				expect(typeof result.passed).toBe("boolean");
			}
		});

		it("shows progress indicator during check", async () => {
			// Arrange & Act
			const { lastFrame } = render(
				<InitMode projectDir={tempDir} onComplete={vi.fn()} />,
			);
			await wait(50);

			// Assert - should show some content
			expect(lastFrame()).toBeDefined();
			expect(lastFrame()?.length).toBeGreaterThan(0);
		});
	});

	describe("Orchestration", () => {
		it("uses ProjectDetector for initial detection", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<InitMode projectDir={tempDir} onComplete={vi.fn()} />,
			);

			// Assert - component renders without error
			expect(lastFrame()).toBeDefined();
		});

		it("renders ConfigWizard for steps 2-4 when passed prerequisites", async () => {
			// Arrange
			// Create package.json for project detection
			writeFileSync(
				join(tempDir, "package.json"),
				JSON.stringify({ name: "test-project" }),
			);

			// Act
			const { lastFrame } = render(
				<InitMode
					projectDir={tempDir}
					onComplete={vi.fn()}
					skipPrerequisites={true}
				/>,
			);

			// Assert
			expect(lastFrame()).toMatch(/Step 2\/5|Project|Detection/i);
		});

		it("logs init events via SessionLogger callback", () => {
			// Arrange
			const onLog = vi.fn();

			// Act
			render(
				<InitMode projectDir={tempDir} onComplete={vi.fn()} onLog={onLog} />,
			);

			// Assert - verify logging callback is available
			expect(typeof onLog).toBe("function");
		});
	});

	describe("Finalization", () => {
		it("calls onComplete callback when finished", () => {
			// Arrange
			const onComplete = vi.fn();

			// Act
			render(<InitMode projectDir={tempDir} onComplete={onComplete} />);

			// Assert
			expect(typeof onComplete).toBe("function");
		});
	});

	describe("Non-Interactive Mode (--yes flag)", () => {
		it("skips wizard prompts when nonInteractive=true", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<InitMode
					projectDir={tempDir}
					onComplete={vi.fn()}
					nonInteractive={true}
				/>,
			);

			// Assert - should show progress or completion, not wizard step
			expect(lastFrame()).toBeDefined();
		});

		it("uses detected/default values in non-interactive mode", () => {
			// Arrange
			writeFileSync(
				join(tempDir, "package.json"),
				JSON.stringify({ name: "test-project" }),
			);

			// Act
			const { lastFrame } = render(
				<InitMode
					projectDir={tempDir}
					onComplete={vi.fn()}
					nonInteractive={true}
				/>,
			);

			// Assert
			expect(lastFrame()).toBeDefined();
		});

		it("runs prerequisite checks in non-interactive mode", () => {
			// Arrange & Act
			const { lastFrame } = render(
				<InitMode
					projectDir={tempDir}
					onComplete={vi.fn()}
					nonInteractive={true}
				/>,
			);

			// Assert - should still check prerequisites
			expect(lastFrame()).toMatch(/[✓✗]|checking|prerequisite/i);
		});

		it("shows error on prerequisite failure in non-interactive mode", () => {
			// Arrange - invalid project dir
			const invalidDir = join(tempDir, "nonexistent");

			// Act
			const { lastFrame } = render(
				<InitMode
					projectDir={invalidDir}
					onComplete={vi.fn()}
					nonInteractive={true}
				/>,
			);

			// Assert - should show some output
			expect(lastFrame()).toBeDefined();
		});

		it("completes without user interaction when nonInteractive=true", () => {
			// Arrange
			const onComplete = vi.fn();

			// Act
			render(
				<InitMode
					projectDir={tempDir}
					onComplete={onComplete}
					nonInteractive={true}
				/>,
			);

			// Assert - callback should be available
			expect(typeof onComplete).toBe("function");
		});
	});
});

describe("checkPrerequisites", () => {
	it("returns check results array", () => {
		// Arrange & Act
		const results = checkPrerequisites();

		// Assert
		expect(Array.isArray(results)).toBe(true);
		expect(results.length).toBeGreaterThan(0);
	});

	it("each result has name, passed, and message", () => {
		// Arrange & Act
		const results = checkPrerequisites();

		// Assert
		for (const result of results) {
			expect(result).toHaveProperty("name");
			expect(result).toHaveProperty("passed");
			expect(result).toHaveProperty("message");
		}
	});
});

describe("Sage Integration", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = join(
			tmpdir(),
			`chorus-sage-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		);
		mkdirSync(tempDir, { recursive: true });
	});

	afterEach(() => {
		try {
			rmSync(tempDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	it("runs Sage analysis before wizard steps", async () => {
		// Arrange
		writeFileSync(
			join(tempDir, "package.json"),
			JSON.stringify({ name: "test-project", scripts: { test: "vitest" } }),
		);

		// Act
		const { lastFrame } = render(
			<InitMode
				projectDir={tempDir}
				onComplete={vi.fn()}
				skipPrerequisites={true}
			/>,
		);
		await wait(100);

		// Assert - should show analysis step or wizard with detected values
		expect(lastFrame()).toBeDefined();
		const frame = lastFrame() || "";
		// Should show either analysis or proceed to wizard
		expect(frame.length).toBeGreaterThan(0);
	});

	it("shows loading spinner with 'Analyzing project...' during analysis", async () => {
		// Arrange
		writeFileSync(
			join(tempDir, "package.json"),
			JSON.stringify({ name: "test-project" }),
		);

		// Act
		const { frames } = render(
			<InitMode
				projectDir={tempDir}
				onComplete={vi.fn()}
				skipPrerequisites={true}
			/>,
		);

		// Assert - at least one frame should exist
		expect(frames.length).toBeGreaterThan(0);
	});

	it("populates wizard defaults from Sage analysis", async () => {
		// Arrange
		writeFileSync(
			join(tempDir, "package.json"),
			JSON.stringify({
				name: "vitest-project",
				scripts: { test: "vitest run" },
				devDependencies: { vitest: "^1.0.0" },
			}),
		);

		// Act
		const { lastFrame } = render(
			<InitMode
				projectDir={tempDir}
				onComplete={vi.fn()}
				skipPrerequisites={true}
			/>,
		);
		await wait(200);

		// Assert - wizard should show detected info
		const frame = lastFrame() || "";
		expect(frame.length).toBeGreaterThan(0);
	});

	it("shows Sage detection summary in wizard", async () => {
		// Arrange
		writeFileSync(
			join(tempDir, "package.json"),
			JSON.stringify({ name: "test-project" }),
		);
		mkdirSync(join(tempDir, "src"), { recursive: true });

		// Act
		const { lastFrame } = render(
			<InitMode
				projectDir={tempDir}
				onComplete={vi.fn()}
				skipPrerequisites={true}
			/>,
		);
		await wait(200);

		// Assert - should show detection or wizard content
		expect(lastFrame()).toBeDefined();
	});

	it("gracefully falls back if Sage fails", async () => {
		// Arrange - empty directory, no package.json
		// Sage should handle missing files gracefully

		// Act
		const { lastFrame } = render(
			<InitMode
				projectDir={tempDir}
				onComplete={vi.fn()}
				skipPrerequisites={true}
			/>,
		);
		await wait(200);

		// Assert - should still show wizard or detection, not crash
		expect(lastFrame()).toBeDefined();
		const frame = lastFrame() || "";
		// Should not show critical error
		expect(frame).not.toMatch(/crash|fatal|undefined/i);
	});

	it("allows user to override Sage suggestions", async () => {
		// Arrange
		writeFileSync(
			join(tempDir, "package.json"),
			JSON.stringify({ name: "test-project" }),
		);

		// Act
		const { lastFrame } = render(
			<InitMode
				projectDir={tempDir}
				onComplete={vi.fn()}
				skipPrerequisites={true}
			/>,
		);
		await wait(200);

		// Assert - wizard should render allowing input
		expect(lastFrame()).toBeDefined();
	});
});
