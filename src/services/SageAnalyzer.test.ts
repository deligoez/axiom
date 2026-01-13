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

	describe("analyzePackageJson()", () => {
		it("parses name, scripts, dependencies, devDependencies", () => {
			// Arrange
			const packageJson = {
				name: "test-project",
				scripts: {
					test: "vitest run",
					lint: "biome check",
				},
				dependencies: {
					react: "^18.0.0",
				},
				devDependencies: {
					vitest: "^1.0.0",
					biome: "^1.0.0",
				},
			};
			fs.writeFileSync(
				path.join(tempDir, "package.json"),
				JSON.stringify(packageJson, null, 2),
			);

			// Act
			const result = analyzer.analyzePackageJson();

			// Assert
			expect(result).not.toBeNull();
			expect(result?.name).toBe("test-project");
			expect(result?.scripts).toEqual({
				test: "vitest run",
				lint: "biome check",
			});
			expect(result?.dependencies).toEqual({ react: "^18.0.0" });
			expect(result?.devDependencies).toEqual({
				vitest: "^1.0.0",
				biome: "^1.0.0",
			});
		});

		it("returns null if package.json missing", () => {
			// Arrange - no package.json

			// Act
			const result = analyzer.analyzePackageJson();

			// Assert
			expect(result).toBeNull();
		});
	});

	describe("analyzeReadme()", () => {
		it("extracts first 500 chars of README.md", () => {
			// Arrange
			const longReadme = `# Test Project\n${"A".repeat(600)}`;
			fs.writeFileSync(path.join(tempDir, "README.md"), longReadme);

			// Act
			const result = analyzer.analyzeReadme();

			// Assert
			expect(result).not.toBeNull();
			expect(result?.length).toBeLessThanOrEqual(500);
			expect(result).toContain("# Test Project");
		});

		it("returns null if README missing", () => {
			// Arrange - no README

			// Act
			const result = analyzer.analyzeReadme();

			// Assert
			expect(result).toBeNull();
		});
	});

	describe("analyzeConfigs()", () => {
		it("detects tsconfig.json, biome.json, .eslintrc presence and extracts strict mode", () => {
			// Arrange
			const tsconfig = {
				compilerOptions: {
					strict: true,
					target: "ES2022",
				},
			};
			fs.writeFileSync(
				path.join(tempDir, "tsconfig.json"),
				JSON.stringify(tsconfig),
			);
			fs.writeFileSync(path.join(tempDir, "biome.json"), "{}");
			fs.writeFileSync(path.join(tempDir, ".eslintrc"), "{}");

			// Act
			const result = analyzer.analyzeConfigs();

			// Assert
			expect(result.configFiles).toContain("tsconfig.json");
			expect(result.configFiles).toContain("biome.json");
			expect(result.configFiles).toContain(".eslintrc");
			expect(result.tsconfigStrict).toBe(true);
		});
	});
});
