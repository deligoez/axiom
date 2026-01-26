import * as fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type SectionState,
	SpecEvolutionTracker,
} from "./SpecEvolutionTracker.js";

vi.mock("node:fs", () => ({
	existsSync: vi.fn(),
	readFileSync: vi.fn(),
	writeFileSync: vi.fn(),
	mkdirSync: vi.fn(),
}));

const mockExistsSync = vi.mocked(fs.existsSync);
const mockReadFileSync = vi.mocked(fs.readFileSync);
const mockWriteFileSync = vi.mocked(fs.writeFileSync);

describe("SpecEvolutionTracker", () => {
	let tracker: SpecEvolutionTracker;
	const projectDir = "/test/project";

	beforeEach(() => {
		vi.clearAllMocks();
		tracker = new SpecEvolutionTracker(projectDir);
	});

	describe("loadSpec", () => {
		it("parses spec file and extracts sections", () => {
			// Arrange
			const specContent = `# Spec Title

## Authentication
Auth content here.

## Database
Database content here.

## API
API content here.
`;
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(specContent);

			// Act
			tracker.loadSpec("/test/spec.md");

			// Assert
			const unplanned = tracker.getUnplannedSections();
			expect(unplanned).toHaveLength(3);
			expect(unplanned).toContain("Authentication");
			expect(unplanned).toContain("Database");
			expect(unplanned).toContain("API");
		});

		it("parses markdown headings (## syntax) as sections", () => {
			// Arrange
			const specContent = `# Main Title

## First Section
Content 1

### Subsection
Subsection content (not tracked)

## Second Section
Content 2
`;
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(specContent);

			// Act
			tracker.loadSpec("/test/spec.md");

			// Assert - only ## level headings are tracked
			const sections = tracker.getUnplannedSections();
			expect(sections).toHaveLength(2);
			expect(sections).toContain("First Section");
			expect(sections).toContain("Second Section");
		});
	});

	describe("getSectionStatus", () => {
		it("returns section state (draft, planning, tasked, archived)", () => {
			// Arrange
			const specContent = "## Test Section\nContent";
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(specContent);
			tracker.loadSpec("/test/spec.md");

			// Act
			const status = tracker.getSectionStatus("Test Section");

			// Assert
			expect(status).toBe("draft");
		});

		it("returns undefined for non-existent section", () => {
			// Arrange
			const specContent = "## Test Section\nContent";
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(specContent);
			tracker.loadSpec("/test/spec.md");

			// Act
			const status = tracker.getSectionStatus("Non-Existent");

			// Assert
			expect(status).toBeUndefined();
		});
	});

	describe("markSectionTasked", () => {
		it("updates section to tasked state with task IDs", () => {
			// Arrange
			const specContent = "## Feature\nContent";
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(specContent);
			tracker.loadSpec("/test/spec.md");

			// Act
			tracker.markSectionTasked("Feature", ["ch-001", "ch-002"]);

			// Assert
			expect(tracker.getSectionStatus("Feature")).toBe("tasked");
		});
	});

	describe("getUnplannedSections", () => {
		it("returns array of draft sections", () => {
			// Arrange
			const specContent = "## Section A\n\n## Section B\n\n## Section C";
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(specContent);
			tracker.loadSpec("/test/spec.md");
			tracker.markSectionTasked("Section B", ["ch-001"]);

			// Act
			const unplanned = tracker.getUnplannedSections();

			// Assert
			expect(unplanned).toHaveLength(2);
			expect(unplanned).toContain("Section A");
			expect(unplanned).toContain("Section C");
			expect(unplanned).not.toContain("Section B");
		});
	});

	describe("getNextPlanningSection", () => {
		it("returns first draft section", () => {
			// Arrange
			const specContent = "## First\n\n## Second\n\n## Third";
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(specContent);
			tracker.loadSpec("/test/spec.md");

			// Act
			const next = tracker.getNextPlanningSection();

			// Assert
			expect(next).toBe("First");
		});

		it("returns undefined if no draft sections", () => {
			// Arrange
			const specContent = "## Only Section";
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(specContent);
			tracker.loadSpec("/test/spec.md");
			tracker.markSectionTasked("Only Section", ["ch-001"]);

			// Act
			const next = tracker.getNextPlanningSection();

			// Assert
			expect(next).toBeUndefined();
		});
	});

	describe("isSpecComplete", () => {
		it("returns true if all sections are tasked", () => {
			// Arrange
			const specContent = "## A\n\n## B";
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(specContent);
			tracker.loadSpec("/test/spec.md");
			tracker.markSectionTasked("A", ["ch-001"]);
			tracker.markSectionTasked("B", ["ch-002"]);

			// Act & Assert
			expect(tracker.isSpecComplete()).toBe(true);
		});

		it("returns false if any section is draft", () => {
			// Arrange
			const specContent = "## A\n\n## B";
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(specContent);
			tracker.loadSpec("/test/spec.md");
			tracker.markSectionTasked("A", ["ch-001"]);

			// Act & Assert
			expect(tracker.isSpecComplete()).toBe(false);
		});
	});

	describe("persistence", () => {
		it("saveProgress persists to spec-progress.json", () => {
			// Arrange
			const specContent = "## Section";
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockReturnValue(specContent);
			tracker.loadSpec("/test/spec.md");
			tracker.markSectionTasked("Section", ["ch-001"]);

			// Act
			tracker.saveProgress();

			// Assert
			expect(mockWriteFileSync).toHaveBeenCalledWith(
				"/test/project/.chorus/specs/spec-progress.json",
				expect.any(String),
				"utf-8",
			);
		});

		it("loadProgress loads from spec-progress.json", () => {
			// Arrange
			const progress = {
				"/test/spec.md": {
					"Section A": {
						status: "tasked" as SectionState,
						taskIds: ["ch-001"],
					},
				},
			};
			const specContent = "## Section A\nContent";
			mockExistsSync.mockReturnValue(true);
			mockReadFileSync.mockImplementation((filePath) => {
				if (String(filePath).includes("spec-progress.json")) {
					return JSON.stringify(progress);
				}
				return specContent;
			});

			// Act
			tracker.loadProgress();
			tracker.loadSpec("/test/spec.md");

			// Assert
			expect(tracker.getSectionStatus("Section A")).toBe("tasked");
		});
	});
});
