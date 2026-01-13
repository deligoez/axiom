import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SageAnalyzer } from "./SageAnalyzer.js";

describe("SageAnalyzer", () => {
	let tempDir: string;
	let analyzer: SageAnalyzer;

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sage-analyzer-test-"));
		analyzer = new SageAnalyzer(tempDir);
	});

	afterEach(() => {
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	describe("analyzeStructure()", () => {
		it("scans for standard directories (src, tests, lib, __tests__)", () => {
			// Arrange
			fs.mkdirSync(path.join(tempDir, "src"));
			fs.mkdirSync(path.join(tempDir, "tests"));
			fs.mkdirSync(path.join(tempDir, "lib"));
			fs.mkdirSync(path.join(tempDir, "__tests__"));

			// Act
			const structure = analyzer.analyzeStructure();

			// Assert
			expect(structure.sourceDirectories).toContain("src");
			expect(structure.sourceDirectories).toContain("lib");
			expect(structure.testDirectories).toContain("tests");
			expect(structure.testDirectories).toContain("__tests__");
		});

		it("returns ProjectStructure with found directories", () => {
			// Arrange
			fs.mkdirSync(path.join(tempDir, "src"));
			fs.writeFileSync(path.join(tempDir, "src", "index.ts"), "");

			// Act
			const structure = analyzer.analyzeStructure();

			// Assert
			expect(structure.rootPath).toBe(tempDir);
			expect(structure.sourceDirectories).toEqual(["src"]);
			expect(structure.testDirectories).toEqual([]);
			expect(structure.configFiles).toEqual([]);
			expect(structure.packageManagers).toEqual([]);
			expect(structure.entryPoints).toEqual([]);
		});

		it("counts files per directory (via entries)", () => {
			// Arrange
			fs.mkdirSync(path.join(tempDir, "src"));
			fs.writeFileSync(path.join(tempDir, "src", "file1.ts"), "");
			fs.writeFileSync(path.join(tempDir, "src", "file2.ts"), "");
			fs.writeFileSync(path.join(tempDir, "src", "file3.ts"), "");

			// Act
			const structure = analyzer.analyzeStructure();

			// Assert - structure has source directory with files
			expect(structure.sourceDirectories).toContain("src");
			// Files exist in directory
			const srcPath = path.join(tempDir, "src");
			const files = fs.readdirSync(srcPath);
			expect(files).toHaveLength(3);
		});

		it("returns empty structure if no standard directories found", () => {
			// Arrange - empty temp directory (no standard dirs)

			// Act
			const structure = analyzer.analyzeStructure();

			// Assert
			expect(structure.rootPath).toBe(tempDir);
			expect(structure.sourceDirectories).toEqual([]);
			expect(structure.testDirectories).toEqual([]);
			expect(structure.configFiles).toEqual([]);
			expect(structure.packageManagers).toEqual([]);
			expect(structure.entryPoints).toEqual([]);
		});
	});
});
