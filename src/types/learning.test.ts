import { describe, expect, it } from "vitest";
import type {
	Learning,
	LearningScope,
	LearningsFile,
	LearningsMeta,
	Scratchpad,
} from "./learning.js";

describe("Learning Types", () => {
	it("LearningScope union type accepts valid values", () => {
		// Arrange & Act
		const local: LearningScope = "local";
		const crossCutting: LearningScope = "cross-cutting";
		const architectural: LearningScope = "architectural";

		// Assert
		expect(local).toBe("local");
		expect(crossCutting).toBe("cross-cutting");
		expect(architectural).toBe("architectural");
	});

	it("Learning interface has all required fields", () => {
		// Arrange & Act
		const learning: Learning = {
			id: "learn-1",
			content: "Test content",
			scope: "local",
			category: "testing",
			source: {
				taskId: "task-1",
				agentType: "claude",
				timestamp: new Date(),
			},
			suggestPattern: false,
		};

		// Assert
		expect(learning.id).toBe("learn-1");
		expect(learning.content).toBe("Test content");
		expect(learning.scope).toBe("local");
		expect(learning.category).toBe("testing");
		expect(learning.suggestPattern).toBe(false);
	});

	it("Scratchpad interface has required fields", () => {
		// Arrange & Act
		const scratchpad: Scratchpad = {
			path: "/path/to/scratchpad",
			content: "scratchpad content",
			modifiedAt: new Date(),
		};

		// Assert
		expect(scratchpad.path).toBe("/path/to/scratchpad");
		expect(scratchpad.content).toBe("scratchpad content");
		expect(scratchpad.modifiedAt).toBeInstanceOf(Date);
	});

	it("LearningsFile interface has required fields", () => {
		// Arrange & Act
		const file: LearningsFile = {
			path: "/path/to/learnings.json",
			learnings: [],
		};

		// Assert
		expect(file.path).toBe("/path/to/learnings.json");
		expect(file.learnings).toEqual([]);
	});

	it("LearningsMeta interface has required fields", () => {
		// Arrange & Act
		const meta: LearningsMeta = {
			path: "/path/to/meta",
			hashes: new Set(["hash1", "hash2"]),
			reviewed: new Set(["learn-1"]),
			lastUpdated: new Date(),
		};

		// Assert
		expect(meta.path).toBe("/path/to/meta");
		expect(meta.hashes.has("hash1")).toBe(true);
		expect(meta.reviewed.has("learn-1")).toBe(true);
		expect(meta.lastUpdated).toBeInstanceOf(Date);
	});

	it("Source type is correct", () => {
		// Arrange & Act
		const learning: Learning = {
			id: "learn-1",
			content: "content",
			scope: "local",
			category: "test",
			source: {
				taskId: "task-123",
				agentType: "claude",
				timestamp: new Date("2024-01-01"),
			},
			suggestPattern: true,
		};

		// Assert
		expect(learning.source.taskId).toBe("task-123");
		expect(learning.source.agentType).toBe("claude");
		expect(learning.source.timestamp).toEqual(new Date("2024-01-01"));
	});

	it("suggestPattern is boolean", () => {
		// Arrange & Act
		const learning1: Learning = {
			id: "1",
			content: "c",
			scope: "local",
			category: "c",
			source: { taskId: "t", agentType: "claude", timestamp: new Date() },
			suggestPattern: true,
		};
		const learning2: Learning = {
			id: "2",
			content: "c",
			scope: "local",
			category: "c",
			source: { taskId: "t", agentType: "claude", timestamp: new Date() },
			suggestPattern: false,
		};

		// Assert
		expect(typeof learning1.suggestPattern).toBe("boolean");
		expect(typeof learning2.suggestPattern).toBe("boolean");
		expect(learning1.suggestPattern).toBe(true);
		expect(learning2.suggestPattern).toBe(false);
	});
});
