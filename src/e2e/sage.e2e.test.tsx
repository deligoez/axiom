import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { render } from "ink-testing-library";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AgentIntroduction } from "../components/AgentIntroduction.js";
import { ProjectDetector } from "../services/ProjectDetector.js";

describe("E2E: Sage Analysis", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = join(tmpdir(), `sage-test-${Date.now()}`);
		mkdirSync(tempDir, { recursive: true });
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("detects Node.js + TypeScript project", () => {
		// Arrange - create Node.js project with TypeScript
		writeFileSync(
			join(tempDir, "package.json"),
			JSON.stringify({
				name: "test-project",
				devDependencies: {
					typescript: "^5.0.0",
				},
			}),
		);
		writeFileSync(join(tempDir, "tsconfig.json"), "{}");

		const detector = new ProjectDetector(tempDir);

		// Act
		const projectType = detector.detect();

		// Assert
		expect(projectType).toBe("node");
	});

	it("detects Vitest test framework", () => {
		// Arrange - create Node.js project with Vitest
		writeFileSync(
			join(tempDir, "package.json"),
			JSON.stringify({
				name: "test-project",
				devDependencies: {
					vitest: "^1.0.0",
				},
				scripts: {
					test: "vitest run",
				},
			}),
		);

		const detector = new ProjectDetector(tempDir);

		// Act
		const projectType = detector.detect();
		const qualityCommands = detector.suggestQualityCommands(projectType);

		// Assert
		expect(projectType).toBe("node");
		expect(qualityCommands.some((c) => c.name === "test")).toBe(true);
	});

	it("suggests correct quality commands for Node.js project", () => {
		// Arrange
		writeFileSync(
			join(tempDir, "package.json"),
			JSON.stringify({ name: "test" }),
		);

		const detector = new ProjectDetector(tempDir);

		// Act
		const projectType = detector.detect();
		const commands = detector.suggestQualityCommands(projectType);

		// Assert
		expect(commands).toContainEqual(
			expect.objectContaining({
				name: "test",
				command: "npm test",
				required: true,
			}),
		);
		expect(commands).toContainEqual(
			expect.objectContaining({
				name: "typecheck",
				command: "npm run typecheck",
			}),
		);
		expect(commands).toContainEqual(
			expect.objectContaining({
				name: "lint",
				command: "npm run lint",
			}),
		);
	});

	it("handles missing README gracefully", () => {
		// Arrange - project without README
		writeFileSync(
			join(tempDir, "package.json"),
			JSON.stringify({ name: "test" }),
		);
		// No README.md created

		const detector = new ProjectDetector(tempDir);

		// Act - should not throw
		const projectType = detector.detect();
		const projectName = detector.getProjectName();

		// Assert
		expect(projectType).toBe("node");
		expect(projectName).toBe("test");
	});

	it("shows project analysis in detection result", () => {
		// Arrange
		writeFileSync(
			join(tempDir, "package.json"),
			JSON.stringify({
				name: "my-awesome-project",
				scripts: {
					test: "vitest",
					typecheck: "tsc --noEmit",
					lint: "eslint .",
				},
			}),
		);

		const detector = new ProjectDetector(tempDir);

		// Act
		const projectType = detector.detect();
		const projectName = detector.getProjectName();
		const qualityCommands = detector.suggestQualityCommands(projectType);

		// Assert - this is what InitWizard would receive from Sage
		expect(projectName).toBe("my-awesome-project");
		expect(projectType).toBe("node");
		expect(qualityCommands.length).toBeGreaterThan(0);
	});

	it("agent introduction screen shows all personas when requested", () => {
		// Arrange & Act
		const { lastFrame } = render(
			<AgentIntroduction projectDir={tempDir} onFinish={() => {}} />,
		);

		// Assert
		const output = lastFrame() ?? "";
		expect(output).toContain("Sage");
		expect(output).toContain("Chip");
		expect(output).toContain("Archie");
		expect(output).toContain("Patch");
		expect(output).toContain("Scout");
		expect(output).toContain("Echo");
		expect(output).toContain(".chorus/agents/");
		expect(output).toContain(".chorus/rules/");
	});
});
