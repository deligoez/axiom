import * as fs from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PatternSuggestion } from "../components/PatternReviewDialog.js";
import { PendingPatternStore } from "./PendingPatternStore.js";

// Mock fs/promises
vi.mock("node:fs/promises", () => ({
	readFile: vi.fn(),
	writeFile: vi.fn(),
	access: vi.fn(),
}));

const mockReadFile = vi.mocked(fs.readFile);
const mockWriteFile = vi.mocked(fs.writeFile);
const mockAccess = vi.mocked(fs.access);

describe("PendingPatternStore", () => {
	let store: PendingPatternStore;
	const projectDir = "/test/project";

	const createTestPattern = (
		overrides: Partial<PatternSuggestion> = {},
	): PatternSuggestion => {
		const now = new Date();
		return {
			id: `pattern-${Math.random().toString(36).slice(2, 8)}`,
			category: "Testing",
			sourceTask: "ch-test1",
			sourceAgent: "claude",
			content: "Test pattern content",
			createdAt: now,
			expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
			...overrides,
		};
	};

	beforeEach(() => {
		vi.clearAllMocks();
		store = new PendingPatternStore(projectDir);
	});

	describe("add()", () => {
		it("adds pattern to empty store", async () => {
			// Arrange
			mockReadFile.mockRejectedValueOnce(new Error("ENOENT")); // Empty store
			mockWriteFile.mockResolvedValue(undefined);
			mockAccess.mockResolvedValue(undefined);

			const pattern = createTestPattern({ id: "pattern-1" });

			// Act
			await store.add(pattern);

			// Assert
			expect(mockWriteFile).toHaveBeenCalledWith(
				expect.stringContaining("pending-patterns.json"),
				expect.stringContaining("pattern-1"),
			);
		});

		it("appends pattern to existing patterns", async () => {
			// Arrange
			const existingPattern = {
				id: "existing-1",
				category: "API",
				sourceTask: "ch-old",
				sourceAgent: "claude",
				content: "Existing pattern",
				createdAt: new Date().toISOString(),
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
			};
			mockReadFile.mockResolvedValueOnce(JSON.stringify([existingPattern]));
			mockWriteFile.mockResolvedValue(undefined);
			mockAccess.mockResolvedValue(undefined);

			const newPattern = createTestPattern({ id: "pattern-new" });

			// Act
			await store.add(newPattern);

			// Assert
			const writeCall = mockWriteFile.mock.calls[0];
			const written = JSON.parse(writeCall[1] as string);
			expect(written).toHaveLength(2);
			expect(written[0].id).toBe("existing-1");
			expect(written[1].id).toBe("pattern-new");
		});
	});

	describe("remove()", () => {
		it("removes pattern by ID", async () => {
			// Arrange
			const patterns = [
				{
					id: "keep-1",
					category: "A",
					sourceTask: "ch-a",
					sourceAgent: "claude",
					content: "Keep this",
					createdAt: new Date().toISOString(),
					expiresAt: new Date(
						Date.now() + 7 * 24 * 60 * 60 * 1000,
					).toISOString(),
				},
				{
					id: "remove-1",
					category: "B",
					sourceTask: "ch-b",
					sourceAgent: "claude",
					content: "Remove this",
					createdAt: new Date().toISOString(),
					expiresAt: new Date(
						Date.now() + 7 * 24 * 60 * 60 * 1000,
					).toISOString(),
				},
			];
			mockReadFile.mockResolvedValueOnce(JSON.stringify(patterns));
			mockWriteFile.mockResolvedValue(undefined);
			mockAccess.mockResolvedValue(undefined);

			// Act
			await store.remove("remove-1");

			// Assert
			const writeCall = mockWriteFile.mock.calls[0];
			const written = JSON.parse(writeCall[1] as string);
			expect(written).toHaveLength(1);
			expect(written[0].id).toBe("keep-1");
		});

		it("handles removing non-existent pattern gracefully", async () => {
			// Arrange
			const patterns = [
				{
					id: "keep-1",
					category: "A",
					sourceTask: "ch-a",
					sourceAgent: "claude",
					content: "Keep this",
					createdAt: new Date().toISOString(),
					expiresAt: new Date(
						Date.now() + 7 * 24 * 60 * 60 * 1000,
					).toISOString(),
				},
			];
			mockReadFile.mockResolvedValueOnce(JSON.stringify(patterns));
			mockWriteFile.mockResolvedValue(undefined);
			mockAccess.mockResolvedValue(undefined);

			// Act - should not throw
			await store.remove("non-existent");

			// Assert - original pattern still there
			const writeCall = mockWriteFile.mock.calls[0];
			const written = JSON.parse(writeCall[1] as string);
			expect(written).toHaveLength(1);
		});
	});

	describe("getPending()", () => {
		it("returns empty array when no patterns exist", async () => {
			// Arrange
			mockReadFile.mockRejectedValueOnce(new Error("ENOENT"));

			// Act
			const result = await store.getPending();

			// Assert
			expect(result).toEqual([]);
		});

		it("filters out expired patterns", async () => {
			// Arrange
			const now = new Date();
			const patterns = [
				{
					id: "valid-1",
					category: "A",
					sourceTask: "ch-a",
					sourceAgent: "claude",
					content: "Valid pattern",
					createdAt: now.toISOString(),
					expiresAt: new Date(
						now.getTime() + 1 * 24 * 60 * 60 * 1000,
					).toISOString(), // Future
				},
				{
					id: "expired-1",
					category: "B",
					sourceTask: "ch-b",
					sourceAgent: "claude",
					content: "Expired pattern",
					createdAt: new Date(
						now.getTime() - 10 * 24 * 60 * 60 * 1000,
					).toISOString(),
					expiresAt: new Date(
						now.getTime() - 1 * 24 * 60 * 60 * 1000,
					).toISOString(), // Past
				},
			];
			mockReadFile.mockResolvedValueOnce(JSON.stringify(patterns));
			mockWriteFile.mockResolvedValue(undefined);
			mockAccess.mockResolvedValue(undefined);

			// Act
			const result = await store.getPending();

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("valid-1");
		});

		it("saves cleaned list after filtering expired patterns", async () => {
			// Arrange
			const now = new Date();
			const patterns = [
				{
					id: "valid-1",
					category: "A",
					sourceTask: "ch-a",
					sourceAgent: "claude",
					content: "Valid",
					createdAt: now.toISOString(),
					expiresAt: new Date(
						now.getTime() + 1 * 24 * 60 * 60 * 1000,
					).toISOString(),
				},
				{
					id: "expired-1",
					category: "B",
					sourceTask: "ch-b",
					sourceAgent: "claude",
					content: "Expired",
					createdAt: new Date(
						now.getTime() - 10 * 24 * 60 * 60 * 1000,
					).toISOString(),
					expiresAt: new Date(
						now.getTime() - 1 * 24 * 60 * 60 * 1000,
					).toISOString(),
				},
			];
			mockReadFile.mockResolvedValueOnce(JSON.stringify(patterns));
			mockWriteFile.mockResolvedValue(undefined);
			mockAccess.mockResolvedValue(undefined);

			// Act
			await store.getPending();

			// Assert - expired pattern removed from saved file
			const writeCall = mockWriteFile.mock.calls[0];
			const written = JSON.parse(writeCall[1] as string);
			expect(written).toHaveLength(1);
			expect(written[0].id).toBe("valid-1");
		});
	});

	describe("getCount()", () => {
		it("returns count of pending patterns", async () => {
			// Arrange
			const now = new Date();
			const patterns = [
				{
					id: "p1",
					category: "A",
					sourceTask: "ch-a",
					sourceAgent: "claude",
					content: "Pattern 1",
					createdAt: now.toISOString(),
					expiresAt: new Date(
						now.getTime() + 7 * 24 * 60 * 60 * 1000,
					).toISOString(),
				},
				{
					id: "p2",
					category: "B",
					sourceTask: "ch-b",
					sourceAgent: "codex",
					content: "Pattern 2",
					createdAt: now.toISOString(),
					expiresAt: new Date(
						now.getTime() + 7 * 24 * 60 * 60 * 1000,
					).toISOString(),
				},
			];
			mockReadFile.mockResolvedValueOnce(JSON.stringify(patterns));
			mockAccess.mockResolvedValue(undefined);

			// Act
			const count = await store.getCount();

			// Assert
			expect(count).toBe(2);
		});

		it("returns 0 for empty store", async () => {
			// Arrange
			mockReadFile.mockRejectedValueOnce(new Error("ENOENT"));

			// Act
			const count = await store.getCount();

			// Assert
			expect(count).toBe(0);
		});
	});

	describe("createSuggestion()", () => {
		it("creates pattern with 7 day expiry", () => {
			// Arrange
			const before = Date.now();

			// Act
			const pattern = PendingPatternStore.createSuggestion(
				"pattern-1",
				"Security",
				"ch-sec1",
				"claude",
				"Always validate input",
			);

			const after = Date.now();

			// Assert
			expect(pattern.id).toBe("pattern-1");
			expect(pattern.category).toBe("Security");
			expect(pattern.sourceTask).toBe("ch-sec1");
			expect(pattern.sourceAgent).toBe("claude");
			expect(pattern.content).toBe("Always validate input");

			// Verify expiry is ~7 days from now
			const expectedExpiry = 7 * 24 * 60 * 60 * 1000;
			const actualExpiry =
				pattern.expiresAt.getTime() - pattern.createdAt.getTime();
			expect(actualExpiry).toBe(expectedExpiry);

			// Verify createdAt is within test execution window
			expect(pattern.createdAt.getTime()).toBeGreaterThanOrEqual(before);
			expect(pattern.createdAt.getTime()).toBeLessThanOrEqual(after);
		});
	});
});
