import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SpecArchiver } from "./SpecArchiver.js";
import { SpecEvolutionTracker } from "./SpecEvolutionTracker.js";

// Mock BeadsCLI
const mockBeadsCLI = {
	getIssue: vi.fn(),
};

describe("SpecArchiver", () => {
	let tempDir: string;
	let specPath: string;
	let archiver: SpecArchiver;
	let tracker: SpecEvolutionTracker;

	beforeEach(() => {
		vi.clearAllMocks();
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "spec-archiver-test-"));

		// Create .chorus/specs directory
		const specsDir = path.join(tempDir, ".chorus", "specs");
		fs.mkdirSync(specsDir, { recursive: true });

		specPath = path.join(specsDir, "test-spec.md");
		tracker = new SpecEvolutionTracker(tempDir);
		archiver = new SpecArchiver(tempDir, tracker, mockBeadsCLI as any);
	});

	afterEach(() => {
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	describe("shouldArchive()", () => {
		it("returns true if all sections tasked AND all tasks closed", async () => {
			// Arrange
			const content = `# Test Spec

## ✅ 1. Overview (TASKED)

Content.

## ✅ 2. Requirements (TASKED)

More content.
`;
			fs.writeFileSync(specPath, content);
			tracker.loadSpec(specPath);
			tracker.markSectionTasked("✅ 1. Overview (TASKED)", ["ch-001"]);
			tracker.markSectionTasked("✅ 2. Requirements (TASKED)", ["ch-002"]);
			tracker.saveProgress();

			// Mock all tasks as closed
			mockBeadsCLI.getIssue.mockImplementation((id: string) => ({
				id,
				status: "closed",
			}));

			// Act
			const result = await archiver.shouldArchive(specPath);

			// Assert
			expect(result).toBe(true);
		});

		it("returns false if some tasks are still open", async () => {
			// Arrange
			const content = `# Test Spec

## ✅ 1. Overview (TASKED)

Content.
`;
			fs.writeFileSync(specPath, content);
			tracker.loadSpec(specPath);
			tracker.markSectionTasked("✅ 1. Overview (TASKED)", [
				"ch-001",
				"ch-002",
			]);
			tracker.saveProgress();

			// Mock one task as open
			mockBeadsCLI.getIssue
				.mockResolvedValueOnce({ id: "ch-001", status: "closed" })
				.mockResolvedValueOnce({ id: "ch-002", status: "open" });

			// Act
			const result = await archiver.shouldArchive(specPath);

			// Assert
			expect(result).toBe(false);
		});
	});

	describe("archive()", () => {
		it("moves spec to .chorus/specs/archive/", async () => {
			// Arrange
			const content = "# Test Spec\n\n## ✅ Content\n";
			fs.writeFileSync(specPath, content);
			tracker.loadSpec(specPath);
			tracker.markSectionTasked("✅ Content", ["ch-001"]);
			tracker.saveProgress();

			// Act
			await archiver.archive(specPath);

			// Assert
			const archivePath = path.join(
				tempDir,
				".chorus",
				"specs",
				"archive",
				"test-spec.md",
			);
			expect(fs.existsSync(archivePath)).toBe(true);
			expect(fs.existsSync(specPath)).toBe(false);
		});

		it("preserves original filename in archive folder", async () => {
			// Arrange
			const customSpecPath = path.join(
				tempDir,
				".chorus",
				"specs",
				"my-feature-spec.md",
			);
			fs.writeFileSync(customSpecPath, "# My Feature\n\n## ✅ Content\n");
			tracker.loadSpec(customSpecPath);
			tracker.markSectionTasked("✅ Content", ["ch-001"]);
			tracker.saveProgress();

			// Act
			await archiver.archive(customSpecPath);

			// Assert
			const archivePath = path.join(
				tempDir,
				".chorus",
				"specs",
				"archive",
				"my-feature-spec.md",
			);
			expect(fs.existsSync(archivePath)).toBe(true);
		});

		it("creates archive folder if it doesn't exist", async () => {
			// Arrange
			const content = "# Test Spec\n";
			fs.writeFileSync(specPath, content);

			// Verify archive folder doesn't exist
			const archiveDir = path.join(tempDir, ".chorus", "specs", "archive");
			expect(fs.existsSync(archiveDir)).toBe(false);

			// Act
			await archiver.archive(specPath);

			// Assert
			expect(fs.existsSync(archiveDir)).toBe(true);
		});

		it("updates spec-progress.json with archived status", async () => {
			// Arrange
			const content = "# Test Spec\n\n## ✅ Content\n";
			fs.writeFileSync(specPath, content);
			tracker.loadSpec(specPath);
			tracker.markSectionTasked("✅ Content", ["ch-001"]);
			tracker.saveProgress();

			// Act
			await archiver.archive(specPath);

			// Assert
			const progressPath = path.join(
				tempDir,
				".chorus",
				"specs",
				"spec-progress.json",
			);
			const progress = JSON.parse(fs.readFileSync(progressPath, "utf-8"));
			// The archived spec should have archived status
			const archivedPath = path.join(
				tempDir,
				".chorus",
				"specs",
				"archive",
				"test-spec.md",
			);
			expect(progress[archivedPath]?.["✅ Content"]?.status).toBe("archived");
		});
	});

	describe("getArchivedSpecs()", () => {
		it("lists all specs in archive folder", async () => {
			// Arrange
			const archiveDir = path.join(tempDir, ".chorus", "specs", "archive");
			fs.mkdirSync(archiveDir, { recursive: true });
			fs.writeFileSync(path.join(archiveDir, "spec1.md"), "# Spec 1");
			fs.writeFileSync(path.join(archiveDir, "spec2.md"), "# Spec 2");
			fs.writeFileSync(path.join(archiveDir, "spec3.md"), "# Spec 3");

			// Act
			const result = archiver.getArchivedSpecs();

			// Assert
			expect(result).toHaveLength(3);
			expect(result).toContain(path.join(archiveDir, "spec1.md"));
			expect(result).toContain(path.join(archiveDir, "spec2.md"));
			expect(result).toContain(path.join(archiveDir, "spec3.md"));
		});

		it("returns empty array if archive folder doesn't exist", () => {
			// Arrange - archive folder doesn't exist by default

			// Act
			const result = archiver.getArchivedSpecs();

			// Assert
			expect(result).toEqual([]);
		});
	});

	describe("unarchive()", () => {
		it("moves spec back from archive", async () => {
			// Arrange
			const archiveDir = path.join(tempDir, ".chorus", "specs", "archive");
			fs.mkdirSync(archiveDir, { recursive: true });
			const archivedPath = path.join(archiveDir, "test-spec.md");
			fs.writeFileSync(archivedPath, "# Restored Spec");

			// Act
			await archiver.unarchive(archivedPath);

			// Assert
			const restoredPath = path.join(
				tempDir,
				".chorus",
				"specs",
				"test-spec.md",
			);
			expect(fs.existsSync(restoredPath)).toBe(true);
			expect(fs.existsSync(archivedPath)).toBe(false);
		});
	});
});
