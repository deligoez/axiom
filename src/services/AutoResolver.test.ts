import { beforeEach, describe, expect, it } from "vitest";
import { AutoResolver } from "./AutoResolver.js";
import { MockFileService } from "./MockFileService.js";
import { MockProcessRunner } from "./MockProcessRunner.js";

describe("AutoResolver", () => {
	let resolver: AutoResolver;
	let mockFiles: MockFileService;
	let mockProcess: MockProcessRunner;

	beforeEach(() => {
		mockFiles = new MockFileService();
		mockProcess = new MockProcessRunner();
		resolver = new AutoResolver(mockFiles, mockProcess);
	});

	// F27: resolveSpecialFile() - 4 tests
	describe("resolveSpecialFile()", () => {
		it(".beads/issues.jsonl: concatenates both JSONL versions, dedupes by id", async () => {
			// Arrange
			const conflictContent = `<<<<<<< HEAD
{"id": "ch-abc", "title": "Task A"}
=======
{"id": "ch-xyz", "title": "Task B"}
>>>>>>> feature`;
			mockFiles.setFile(".beads/issues.jsonl", conflictContent);

			// Act
			await resolver.resolveSpecialFile(".beads/issues.jsonl");

			// Assert
			const writeCall = mockFiles.writeCalls[0];
			expect(writeCall.path).toBe(".beads/issues.jsonl");
			expect(writeCall.content).toContain('{"id": "ch-abc"');
			expect(writeCall.content).toContain('{"id": "ch-xyz"');
		});

		it("package-lock.json: calls files.delete() then process.exec('npm install')", async () => {
			// Arrange
			mockFiles.setFile("package-lock.json", "conflicted content");

			// Act
			await resolver.resolveSpecialFile("package-lock.json");

			// Assert
			expect(mockFiles.deleteCalls).toContain("package-lock.json");
			expect(
				mockProcess.execCalls.some((c) => c.command === "npm install"),
			).toBe(true);
		});

		it(".agent/learnings.md: parses markdown, merges sections, dedupes by heading", async () => {
			// Arrange
			const conflictContent = `<<<<<<< HEAD
## Pattern: Config Loading
Load config from file...
=======
## Pattern: Error Handling
Handle errors gracefully...
>>>>>>> feature`;
			mockFiles.setFile(".agent/learnings.md", conflictContent);

			// Act
			await resolver.resolveSpecialFile(".agent/learnings.md");

			// Assert
			const writeCall = mockFiles.writeCalls[0];
			expect(writeCall.path).toBe(".agent/learnings.md");
			expect(writeCall.content).toContain("## Pattern: Config Loading");
			expect(writeCall.content).toContain("## Pattern: Error Handling");
		});

		it("auto-generated file: calls process.exec() with configured command", async () => {
			// Arrange
			mockFiles.setFile("src/generated/types.ts", "conflicted content");

			// Act
			await resolver.resolveSpecialFile("src/generated/types.ts");

			// Assert
			expect(
				mockProcess.execCalls.some((c) => c.command.includes("generate")),
			).toBe(true);
		});
	});

	// F27: canResolve() - 2 tests
	describe("canResolve()", () => {
		it("returns true for SIMPLE conflict types", () => {
			// Arrange
			const type = "SIMPLE" as const;

			// Act
			const result = resolver.canResolve(type);

			// Assert
			expect(result).toBe(true);
		});

		it("returns true when filepath matches key in SIMPLE_FILES", () => {
			// Arrange
			const filepath = "package-lock.json";

			// Act
			const result = resolver.canResolve("MEDIUM", filepath);

			// Assert
			expect(result).toBe(true);
		});
	});

	// F27: resolve() - 4 tests
	describe("resolve()", () => {
		it("returns { success: true } when SIMPLE file resolved", async () => {
			// Arrange
			mockFiles.setFile("package-lock.json", "conflicted content");

			// Act
			const result = await resolver.resolve("package-lock.json", "SIMPLE");

			// Assert
			expect(result.success).toBe(true);
		});

		it("returns { success: false } for non-SIMPLE conflicts", async () => {
			// Arrange
			const filepath = "src/core/engine.ts";

			// Act
			const result = await resolver.resolve(filepath, "COMPLEX");

			// Assert
			expect(result.success).toBe(false);
		});

		it("returns { success: false, error: message } when FileService throws", async () => {
			// Arrange
			mockFiles.setFile("package-lock.json", "content");
			mockFiles.setThrowOnDelete(new Error("Permission denied"));

			// Act
			const result = await resolver.resolve("package-lock.json", "SIMPLE");

			// Assert
			expect(result.success).toBe(false);
			expect(result.error).toContain("Permission denied");
		});

		it("returns { success: false, error: message } when ProcessRunner throws", async () => {
			// Arrange
			mockFiles.setFile("package-lock.json", "content");
			mockProcess.setThrowError(new Error("npm not found"));

			// Act
			const result = await resolver.resolve("package-lock.json", "SIMPLE");

			// Assert
			expect(result.success).toBe(false);
			expect(result.error).toContain("npm not found");
		});
	});
});
