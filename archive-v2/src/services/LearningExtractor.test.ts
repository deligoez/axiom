import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentType, Learning } from "../types/learning.js";
import type { AgentLogger, LogInput } from "./AgentLogger.js";
import { LearningExtractor } from "./LearningExtractor.js";
import { LearningStore } from "./LearningStore.js";

describe("LearningExtractor", () => {
	let extractor: LearningExtractor;
	const testTaskId = "ch-abc";
	const testAgentType: AgentType = "claude";

	beforeEach(() => {
		vi.clearAllMocks();
		extractor = new LearningExtractor();
	});

	// F40: detectScope() tests (5)
	describe("detectScope", () => {
		it("parses [LOCAL] prefix", () => {
			// Arrange
			const text = "[LOCAL] This is a local learning";

			// Act
			const result = extractor.detectScope(text);

			// Assert
			expect(result.scope).toBe("local");
			expect(result.content).toBe("This is a local learning");
		});

		it("parses [CROSS-CUTTING] prefix", () => {
			// Arrange
			const text = "[CROSS-CUTTING] This affects multiple features";

			// Act
			const result = extractor.detectScope(text);

			// Assert
			expect(result.scope).toBe("cross-cutting");
			expect(result.content).toBe("This affects multiple features");
		});

		it("parses [ARCHITECTURAL] prefix", () => {
			// Arrange
			const text = "[ARCHITECTURAL] Use dependency injection";

			// Act
			const result = extractor.detectScope(text);

			// Assert
			expect(result.scope).toBe("architectural");
			expect(result.content).toBe("Use dependency injection");
		});

		it("defaults to local without prefix", () => {
			// Arrange
			const text = "Simple learning without prefix";

			// Act
			const result = extractor.detectScope(text);

			// Assert
			expect(result.scope).toBe("local");
			expect(result.content).toBe("Simple learning without prefix");
		});

		it("is case-insensitive", () => {
			// Arrange
			const text = "[cross-cutting] Lowercase prefix";

			// Act
			const result = extractor.detectScope(text);

			// Assert
			expect(result.scope).toBe("cross-cutting");
			expect(result.content).toBe("Lowercase prefix");
		});
	});

	// F40: detectCategory() tests (4)
	describe("detectCategory", () => {
		it("returns performance for heading containing performance", () => {
			// Arrange & Act
			const result = extractor.detectCategory("### Performance Optimizations");

			// Assert
			expect(result).toBe("performance");
		});

		it("returns testing for heading containing test", () => {
			// Arrange & Act
			const result = extractor.detectCategory("### Testing Notes");

			// Assert
			expect(result).toBe("testing");
		});

		it("returns general for unrecognized heading", () => {
			// Arrange & Act
			const result = extractor.detectCategory("### Random Stuff");

			// Assert
			expect(result).toBe("general");
		});

		it("is case-insensitive", () => {
			// Arrange & Act
			const result = extractor.detectCategory("### PERFORMANCE issues");

			// Assert
			expect(result).toBe("performance");
		});
	});

	// F40: parse() tests (7)
	describe("parse", () => {
		it("extracts single bullet as learning", () => {
			// Arrange
			const content = "- [LOCAL] Single learning item";

			// Act
			const result = extractor.parse(content, testTaskId, testAgentType);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0].content).toBe("Single learning item");
			expect(result[0].scope).toBe("local");
		});

		it("extracts multiple bullets as separate learnings", () => {
			// Arrange
			const content = `- [LOCAL] First learning
- [CROSS-CUTTING] Second learning
- [ARCHITECTURAL] Third learning`;

			// Act
			const result = extractor.parse(content, testTaskId, testAgentType);

			// Assert
			expect(result).toHaveLength(3);
			expect(result[0].scope).toBe("local");
			expect(result[1].scope).toBe("cross-cutting");
			expect(result[2].scope).toBe("architectural");
		});

		it("joins multi-line bullet into one learning", () => {
			// Arrange
			const content = `- [LOCAL] First line
  continued on second line
  and third line`;

			// Act
			const result = extractor.parse(content, testTaskId, testAgentType);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0].content).toContain("First line");
			expect(result[0].content).toContain("continued on second line");
		});

		it("assigns category from heading", () => {
			// Arrange
			const content = `### Performance
- [LOCAL] Performance-related learning`;

			// Act
			const result = extractor.parse(content, testTaskId, testAgentType);

			// Assert
			expect(result[0].category).toBe("performance");
		});

		it("assigns general for bullets before heading", () => {
			// Arrange
			const content = `- [LOCAL] Learning before any heading

### Performance
- [LOCAL] Learning after heading`;

			// Act
			const result = extractor.parse(content, testTaskId, testAgentType);

			// Assert
			expect(result[0].category).toBe("general");
			expect(result[1].category).toBe("performance");
		});

		it("sets source fields correctly", () => {
			// Arrange
			const content = "- [LOCAL] Test learning";
			const beforeParse = new Date();

			// Act
			const result = extractor.parse(content, testTaskId, testAgentType);

			// Assert
			const afterParse = new Date();
			expect(result[0].source.taskId).toBe(testTaskId);
			expect(result[0].source.agentType).toBe(testAgentType);
			expect(result[0].source.timestamp.getTime()).toBeGreaterThanOrEqual(
				beforeParse.getTime(),
			);
			expect(result[0].source.timestamp.getTime()).toBeLessThanOrEqual(
				afterParse.getTime(),
			);
		});

		it("returns empty array for empty content", () => {
			// Arrange & Act
			const result = extractor.parse("", testTaskId, testAgentType);

			// Assert
			expect(result).toEqual([]);
		});
	});

	// F40: requiresPlanReview() / requiresAlert() tests (3)
	describe("requiresPlanReview and requiresAlert", () => {
		const createLearning = (scope: Learning["scope"]): Learning => ({
			id: "test-id",
			content: "Test content",
			scope,
			category: "general",
			source: { taskId: "ch-test", agentType: "claude", timestamp: new Date() },
			suggestPattern: false,
		});

		it("requiresPlanReview returns true for cross-cutting or architectural", () => {
			// Arrange
			const learnings = [
				createLearning("local"),
				createLearning("cross-cutting"),
			];

			// Act
			const result = extractor.requiresPlanReview(learnings);

			// Assert
			expect(result).toBe(true);
		});

		it("requiresPlanReview returns false for all local", () => {
			// Arrange
			const learnings = [createLearning("local"), createLearning("local")];

			// Act
			const result = extractor.requiresPlanReview(learnings);

			// Assert
			expect(result).toBe(false);
		});

		it("requiresAlert returns true only for architectural", () => {
			// Arrange
			const localLearnings = [createLearning("local")];
			const crossCuttingLearnings = [createLearning("cross-cutting")];
			const architecturalLearnings = [createLearning("architectural")];

			// Act & Assert
			expect(extractor.requiresAlert(localLearnings)).toBe(false);
			expect(extractor.requiresAlert(crossCuttingLearnings)).toBe(false);
			expect(extractor.requiresAlert(architecturalLearnings)).toBe(true);
		});
	});

	// F40: formatForStorage() test (1)
	describe("formatForStorage", () => {
		it("outputs markdown with scope prefix and attribution comment", () => {
			// Arrange
			const learning: Learning = {
				id: "test-id",
				content: "Test learning content",
				scope: "cross-cutting",
				category: "performance",
				source: {
					taskId: "ch-abc",
					agentType: "claude",
					timestamp: new Date("2026-01-10T12:00:00Z"),
				},
				suggestPattern: false,
			};

			// Act
			const result = extractor.formatForStorage(learning);

			// Assert
			expect(result).toContain("[CROSS-CUTTING]");
			expect(result).toContain("Test learning content");
			expect(result).toContain("ch-abc");
			expect(result).toContain("claude");
			expect(result).toContain("performance");
		});
	});

	// Echo persona logging tests (AP16)
	describe("Echo persona logging", () => {
		let tempDir: string;

		const createMockAgentLogger = (): {
			logger: AgentLogger;
			logs: LogInput[];
		} => {
			const logs: LogInput[] = [];
			const logger = {
				log: vi.fn((input: LogInput) => logs.push(input)),
			} as unknown as AgentLogger;
			return { logger, logs };
		};

		beforeEach(() => {
			tempDir = join(
				tmpdir(),
				`learning-extractor-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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

		it("logs with persona: 'echo' and instanceId: 'echo'", () => {
			// Arrange
			const { logger, logs } = createMockAgentLogger();
			const echoExtractor = new LearningExtractor({ agentLogger: logger });
			const content = "- [LOCAL] Test learning";

			// Act
			echoExtractor.parse(content, testTaskId, testAgentType);

			// Assert
			expect(logs.length).toBeGreaterThan(0);
			for (const log of logs) {
				expect(log.persona).toBe("echo");
				expect(log.instanceId).toBe("echo");
			}
		});

		it("logs '[echo] Found N learnings in agent output'", () => {
			// Arrange
			const { logger, logs } = createMockAgentLogger();
			const echoExtractor = new LearningExtractor({ agentLogger: logger });
			const content = `- [LOCAL] First learning
- [CROSS-CUTTING] Second learning`;

			// Act
			echoExtractor.parse(content, testTaskId, testAgentType);

			// Assert
			const extractionLog = logs.find((l) =>
				l.message.includes("Found 2 learnings"),
			);
			expect(extractionLog).toBeDefined();
			expect(extractionLog?.message).toContain(
				"[echo] Found 2 learnings in agent output",
			);
		});

		it("loads config from .chorus/agents/echo/config.json when present", () => {
			// Arrange
			const configDir = join(tempDir, ".chorus", "agents", "echo");
			mkdirSync(configDir, { recursive: true });
			const configContent = { dedupThreshold: 0.9, categories: ["testing"] };
			writeFileSync(
				join(configDir, "config.json"),
				JSON.stringify(configContent),
			);

			const echoExtractor = new LearningExtractor({ projectDir: tempDir });

			// Act
			const config = echoExtractor.loadEchoConfig();

			// Assert
			expect(config).toBeDefined();
			expect(config?.dedupThreshold).toBe(0.9);
			expect(config?.categories).toEqual(["testing"]);
		});

		it("LearningStore logs '[echo] Stored learning to learnings.md (scope: X)'", async () => {
			// Arrange
			const { logger, logs } = createMockAgentLogger();
			const store = new LearningStore(tempDir, { agentLogger: logger });
			const learning: Learning = {
				id: "test-id",
				content: "Test learning content",
				scope: "cross-cutting",
				category: "testing",
				source: {
					taskId: "ch-test",
					agentType: "claude",
					timestamp: new Date(),
				},
				suggestPattern: false,
			};

			// Act
			await store.append([learning]);

			// Assert
			const storageLog = logs.find((l) =>
				l.message.includes("Stored learning"),
			);
			expect(storageLog).toBeDefined();
			expect(storageLog?.message).toContain(
				"[echo] Stored learning to learnings.md (scope: cross-cutting)",
			);
			expect(storageLog?.persona).toBe("echo");
			expect(storageLog?.instanceId).toBe("echo");
		});
	});
});
