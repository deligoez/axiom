import * as fs from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Learning, LearningsMeta } from "../types/learning.js";
import { LearningStore } from "./LearningStore.js";

// Mock fs/promises
vi.mock("node:fs/promises", () => ({
	readFile: vi.fn(),
	writeFile: vi.fn(),
	mkdir: vi.fn(),
	access: vi.fn(),
}));

// Mock child_process for git commands using vi.hoisted (hoisted mocks need hoisted variables)
const { mockExec } = vi.hoisted(() => ({
	mockExec: vi.fn(),
}));

vi.mock("node:child_process", () => ({
	exec: mockExec,
}));

const mockReadFile = vi.mocked(fs.readFile);
const mockWriteFile = vi.mocked(fs.writeFile);
const mockMkdir = vi.mocked(fs.mkdir);
const mockAccess = vi.mocked(fs.access);

describe("LearningStore", () => {
	let store: LearningStore;
	const repoPath = "/test/repo";

	const createLearning = (
		content: string,
		scope: Learning["scope"] = "local",
		category = "general",
	): Learning => ({
		id: `learn-${Math.random().toString(36).slice(2, 8)}`,
		content,
		scope,
		category,
		source: {
			taskId: "ch-test",
			agentType: "claude",
			timestamp: new Date("2026-01-11T12:00:00Z"),
		},
		suggestPattern: false,
	});

	beforeEach(() => {
		vi.clearAllMocks();
		// Configure mockExec to call callback for promisify compatibility
		mockExec.mockImplementation(
			(
				_cmd: string,
				_opts: unknown,
				cb?: (
					err: Error | null,
					result: { stdout: string; stderr: string },
				) => void,
			) => {
				if (cb) cb(null, { stdout: "", stderr: "" });
			},
		);
		store = new LearningStore(repoPath);
	});

	// F41: Core Operations - 4 tests
	describe("Core Operations", () => {
		it("append() adds formatted learnings to end of file", async () => {
			// Arrange
			const existing = "# Project Learnings\n\n## General\n";
			mockReadFile.mockResolvedValueOnce(existing); // learnings.md
			mockReadFile.mockResolvedValueOnce(
				JSON.stringify({ hashes: [], reviewed: [], lastUpdated: null }),
			); // meta
			mockWriteFile.mockResolvedValue(undefined);
			mockAccess.mockResolvedValue(undefined);

			const learnings = [createLearning("New learning content")];

			// Act
			const result = await store.append(learnings);

			// Assert
			expect(result.added).toHaveLength(1);
			expect(mockWriteFile).toHaveBeenCalledWith(
				expect.stringContaining("learnings.md"),
				expect.stringContaining("New learning content"),
				"utf-8",
			);
		});

		it("append() preserves existing content", async () => {
			// Arrange
			const existing =
				"# Project Learnings\n\n## General\n- [LOCAL] Existing learning\n";
			mockReadFile.mockResolvedValueOnce(existing);
			mockReadFile.mockResolvedValueOnce(
				JSON.stringify({ hashes: [], reviewed: [], lastUpdated: null }),
			);
			mockWriteFile.mockResolvedValue(undefined);
			mockAccess.mockResolvedValue(undefined);

			const learnings = [createLearning("New learning")];

			// Act
			await store.append(learnings);

			// Assert
			const writeCall = mockWriteFile.mock.calls.find((call) =>
				(call[0] as string).includes("learnings.md"),
			);
			expect(writeCall?.[1]).toContain("Existing learning");
			expect(writeCall?.[1]).toContain("New learning");
		});

		it('commit() creates commit with "learn: extract from {taskId} ({agent})"', async () => {
			// Arrange - mockExec already returns { stdout: "", stderr: "" }

			// Act
			await store.commit("ch-abc", "claude");

			// Assert - exec is called with 3 args: command, options, callback
			const commitCall = mockExec.mock.calls.find(
				(call) => typeof call[0] === "string" && call[0].includes("git commit"),
			);
			expect(commitCall?.[0]).toContain("learn: extract from ch-abc (claude)");
		});

		it("commit() includes both learnings.md and learnings-meta.json", async () => {
			// Arrange - mockExec already returns { stdout: "", stderr: "" }

			// Act
			await store.commit("ch-abc", "claude");

			// Assert - exec is called with 3 args: command, options, callback
			const addCall = mockExec.mock.calls.find(
				(call) => typeof call[0] === "string" && call[0].includes("git add"),
			);
			expect(addCall?.[0]).toContain("learnings.md");
			expect(addCall?.[0]).toContain("learnings-meta.json");
		});
	});

	// F41: Deduplication - 8 tests
	describe("Deduplication", () => {
		it("isDuplicate() returns true for exact hash match", async () => {
			// Arrange
			const content = "Use dependency injection";
			const hash = store.calculateHash(content);
			mockReadFile.mockResolvedValueOnce(
				JSON.stringify({
					hashes: [hash],
					reviewed: [],
					lastUpdated: null,
				}),
			);

			const learning = createLearning(content);

			// Act
			const result = await store.isDuplicate(learning);

			// Assert
			expect(result.isDuplicate).toBe(true);
			expect(result.reason).toBe("exact");
		});

		it("isDuplicate() returns true for similarity > threshold", async () => {
			// Arrange
			// Use a store with lower threshold to test similarity detection
			const lowThresholdStore = new LearningStore(repoPath, { threshold: 0.5 });

			// isDuplicate calls: 1. loadMeta(), 2. readAll() for similarity check
			mockReadFile.mockResolvedValueOnce(
				JSON.stringify({ hashes: [], reviewed: [], lastUpdated: null }),
			);
			mockReadFile.mockResolvedValueOnce(
				"# Learnings\n\n- [LOCAL] Add rate limiting to API endpoints\n",
			);

			const learning = createLearning(
				"Implement rate limiting for API endpoints",
			);

			// Act
			const result = await lowThresholdStore.isDuplicate(learning);

			// Assert - Jaccard similarity ~0.67 exceeds threshold 0.5
			expect(result.isDuplicate).toBe(true);
			expect(result.reason).toBe("similar");
			expect(result.similarity).toBeGreaterThanOrEqual(0.5);
		});

		it("isDuplicate() returns false for new learning", async () => {
			// Arrange
			mockReadFile.mockResolvedValueOnce(
				JSON.stringify({ hashes: [], reviewed: [], lastUpdated: null }),
			);
			mockReadFile.mockResolvedValueOnce(
				"# Learnings\n\n- [LOCAL] Something completely different\n",
			);

			const learning = createLearning("Use TypeScript strict mode");

			// Act
			const result = await store.isDuplicate(learning);

			// Assert
			expect(result.isDuplicate).toBe(false);
		});

		it("append() skips duplicates when action='skip'", async () => {
			// Arrange
			const content = "Existing learning";
			const hash = store.calculateHash(content);
			const metaJson = JSON.stringify({
				hashes: [hash],
				reviewed: [],
				lastUpdated: null,
			});
			// append() calls: 1. readFile(learningsPath), 2. loadMeta()
			// isDuplicate() calls: 3. loadMeta() again
			mockReadFile.mockResolvedValueOnce("# Learnings\n");
			mockReadFile.mockResolvedValueOnce(metaJson);
			mockReadFile.mockResolvedValueOnce(metaJson); // isDuplicate also calls loadMeta
			mockWriteFile.mockResolvedValue(undefined);
			mockAccess.mockResolvedValue(undefined);

			const learnings = [createLearning(content)];

			// Act
			const result = await store.append(learnings);

			// Assert
			expect(result.added).toHaveLength(0);
			expect(result.skipped).toHaveLength(1);
		});

		it("append() returns skipped learnings in result", async () => {
			// Arrange
			const content = "Duplicate content";
			const hash = store.calculateHash(content);
			const metaJson = JSON.stringify({
				hashes: [hash],
				reviewed: [],
				lastUpdated: null,
			});
			// append() calls: 1. readFile(learningsPath), 2. loadMeta()
			// isDuplicate() calls: 3. loadMeta() again
			mockReadFile.mockResolvedValueOnce("# Learnings\n");
			mockReadFile.mockResolvedValueOnce(metaJson);
			mockReadFile.mockResolvedValueOnce(metaJson); // isDuplicate also calls loadMeta
			mockWriteFile.mockResolvedValue(undefined);
			mockAccess.mockResolvedValue(undefined);

			const learning = createLearning(content);

			// Act
			const result = await store.append([learning]);

			// Assert
			expect(result.skipped[0].content).toBe(content);
		});

		it("calculateHash() normalizes content before hashing", () => {
			// Arrange & Act
			const hash1 = store.calculateHash("  Use Dependency Injection  ");
			const hash2 = store.calculateHash("use dependency injection");

			// Assert
			expect(hash1).toBe(hash2);
		});

		it("checkSimilarity() uses Jaccard index for similarity calculation", async () => {
			// Arrange
			const existing = [createLearning("Add rate limiting to API endpoints")];

			// Act
			const result = await store.checkSimilarity(
				"Implement rate limiting for API endpoints",
				existing,
			);

			// Assert
			expect(result).not.toBeNull();
			expect(result?.similarity).toBeGreaterThan(0);
			expect(result?.similarity).toBeLessThanOrEqual(1);
		});

		it("Constructor accepts configurable dedup threshold (default 0.85)", () => {
			// Arrange & Act
			const defaultStore = new LearningStore(repoPath);
			const customStore = new LearningStore(repoPath, { threshold: 0.9 });

			// Assert
			expect(defaultStore.dedupConfig.threshold).toBe(0.85);
			expect(customStore.dedupConfig.threshold).toBe(0.9);
		});
	});

	// F41: Metadata - 4 tests
	describe("Metadata", () => {
		it("loadMeta() returns LearningsMeta from JSON file", async () => {
			// Arrange
			const metaData = {
				hashes: ["hash1", "hash2"],
				reviewed: ["id1"],
				lastUpdated: "2026-01-11T12:00:00Z",
			};
			mockReadFile.mockResolvedValueOnce(JSON.stringify(metaData));

			// Act
			const result = await store.loadMeta();

			// Assert
			expect(result.hashes).toContain("hash1");
			expect(result.reviewed).toContain("id1");
		});

		it("saveMeta() persists to JSON file", async () => {
			// Arrange
			mockWriteFile.mockResolvedValue(undefined);
			const meta: LearningsMeta = {
				path: store.metaPath,
				hashes: new Set(["hash1"]),
				reviewed: new Set(["id1"]),
				lastUpdated: new Date("2026-01-11T12:00:00Z"),
			};

			// Act
			await store.saveMeta(meta);

			// Assert
			expect(mockWriteFile).toHaveBeenCalledWith(
				expect.stringContaining("learnings-meta.json"),
				expect.any(String),
				"utf-8",
			);
		});

		it("markReviewed() updates reviewed status in meta", async () => {
			// Arrange
			mockReadFile.mockResolvedValueOnce(
				JSON.stringify({
					hashes: [],
					reviewed: [],
					lastUpdated: null,
				}),
			);
			mockWriteFile.mockResolvedValue(undefined);

			// Act
			await store.markReviewed("learn-123", "developer");

			// Assert
			const writeCall = mockWriteFile.mock.calls.find((call) =>
				(call[0] as string).includes("learnings-meta.json"),
			);
			const written = JSON.parse(writeCall?.[1] as string);
			expect(written.reviewed).toContain("learn-123");
		});

		it("getUnreviewed() returns learnings without reviewed status", async () => {
			// Arrange
			mockReadFile.mockResolvedValueOnce(
				JSON.stringify({
					hashes: [],
					reviewed: ["learn-001"],
					lastUpdated: null,
				}),
			);
			mockReadFile.mockResolvedValueOnce(
				"# Learnings\n\n- [LOCAL] First\n  <!-- id: learn-001 -->\n\n- [LOCAL] Second\n  <!-- id: learn-002 -->\n",
			);

			// Act
			const result = await store.getUnreviewed();

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("learn-002");
		});
	});

	// Multi-agent learning tracking - 4 tests
	describe("Multi-agent tracking", () => {
		it("formatLearning includes agentType in stored format", () => {
			// Arrange
			const learning: Learning = {
				id: "learn-multi-1",
				content: "Test learning content",
				scope: "local",
				category: "general",
				source: {
					taskId: "ch-test1",
					agentType: "claude",
					timestamp: new Date("2026-01-11T12:00:00Z"),
				},
				suggestPattern: false,
			};

			// Act - access private method via any
			const formatted = (store as any).formatLearning(learning);

			// Assert
			expect(formatted).toContain("claude");
			expect(formatted).toContain("ch-test1");
			expect(formatted).toContain("learn-multi-1");
		});

		it("deduplication works across different agents", async () => {
			// Arrange
			const content = "Always use TypeScript strict mode";
			const hash = store.calculateHash(content);
			const metaJson = JSON.stringify({
				hashes: [hash],
				reviewed: [],
				lastUpdated: null,
			});

			// First learning was added by claude
			mockReadFile.mockResolvedValueOnce("# Learnings\n");
			mockReadFile.mockResolvedValueOnce(metaJson);
			mockReadFile.mockResolvedValueOnce(metaJson);
			mockWriteFile.mockResolvedValue(undefined);
			mockAccess.mockResolvedValue(undefined);

			// Same content from codex agent
			const codexLearning: Learning = {
				id: "learn-codex-1",
				content,
				scope: "local",
				category: "general",
				source: {
					taskId: "ch-test2",
					agentType: "codex",
					timestamp: new Date(),
				},
				suggestPattern: false,
			};

			// Act
			const result = await store.append([codexLearning]);

			// Assert - should be skipped as duplicate
			expect(result.skipped).toHaveLength(1);
			expect(result.added).toHaveLength(0);
		});

		it("unique content from different agents is both added", async () => {
			// Arrange
			mockReadFile.mockResolvedValueOnce("# Learnings\n");
			mockReadFile.mockResolvedValueOnce(
				JSON.stringify({ hashes: [], reviewed: [], lastUpdated: null }),
			);
			mockReadFile.mockResolvedValueOnce("# Learnings\n"); // For similarity check
			mockReadFile.mockResolvedValueOnce(
				JSON.stringify({ hashes: [], reviewed: [], lastUpdated: null }),
			);
			mockReadFile.mockResolvedValueOnce("# Learnings\n"); // For second similarity check
			mockWriteFile.mockResolvedValue(undefined);
			mockAccess.mockResolvedValue(undefined);

			const claudeLearning: Learning = {
				id: "learn-claude-1",
				content: "Use dependency injection for testability",
				scope: "cross-cutting",
				category: "testing",
				source: {
					taskId: "ch-test1",
					agentType: "claude",
					timestamp: new Date(),
				},
				suggestPattern: true,
			};

			const codexLearning: Learning = {
				id: "learn-codex-1",
				content: "Prefer composition over inheritance",
				scope: "architectural",
				category: "patterns",
				source: {
					taskId: "ch-test2",
					agentType: "codex",
					timestamp: new Date(),
				},
				suggestPattern: true,
			};

			// Act
			const result = await store.append([claudeLearning, codexLearning]);

			// Assert - both should be added
			expect(result.added).toHaveLength(2);
			expect(result.skipped).toHaveLength(0);
		});

		it("commit message includes agent type", async () => {
			// Arrange - mockExec already returns { stdout: "", stderr: "" }

			// Act
			await store.commit("ch-multi", "codex");

			// Assert - exec is called with 3 args: command, options, callback
			const commitCall = mockExec.mock.calls.find(
				(call) => typeof call[0] === "string" && call[0].includes("git commit"),
			);
			expect(commitCall?.[0]).toContain("learn: extract from ch-multi (codex)");
		});
	});

	// F41: Initialization - 2 tests
	describe("Initialization", () => {
		it("ensureExists() creates .claude/rules/ directory if needed", async () => {
			// Arrange
			mockAccess.mockRejectedValueOnce(new Error("ENOENT"));
			mockMkdir.mockResolvedValue(undefined);
			mockWriteFile.mockResolvedValue(undefined);

			// Act
			await store.ensureExists();

			// Assert
			expect(mockMkdir).toHaveBeenCalledWith(
				expect.stringContaining(".claude/rules"),
				expect.objectContaining({ recursive: true }),
			);
		});

		it("ensureExists() is idempotent", async () => {
			// Arrange
			mockAccess.mockResolvedValue(undefined); // Directory exists

			// Act
			await store.ensureExists();
			await store.ensureExists();

			// Assert
			expect(mockMkdir).not.toHaveBeenCalled();
		});
	});
});
