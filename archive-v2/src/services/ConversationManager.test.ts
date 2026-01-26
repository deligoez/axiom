import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConversationManager } from "./ConversationManager.js";

describe("ConversationManager", () => {
	let manager: ConversationManager;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-11T10:00:00Z"));
		manager = new ConversationManager();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("addUserMessage", () => {
		it("adds user message with timestamp", () => {
			// Act
			manager.addUserMessage("Hello agent");

			// Assert
			const history = manager.getHistory();
			expect(history).toHaveLength(1);
			expect(history[0]).toEqual({
				role: "user",
				content: "Hello agent",
				timestamp: "2026-01-11T10:00:00.000Z",
			});
		});
	});

	describe("addAgentMessage", () => {
		it("adds agent response with timestamp", () => {
			// Act
			manager.addAgentMessage("Hello user");

			// Assert
			const history = manager.getHistory();
			expect(history).toHaveLength(1);
			expect(history[0]).toEqual({
				role: "assistant",
				content: "Hello user",
				timestamp: "2026-01-11T10:00:00.000Z",
			});
		});
	});

	describe("addSystemMessage", () => {
		it("adds system message with timestamp", () => {
			// Act
			manager.addSystemMessage("System initialization");

			// Assert
			const history = manager.getHistory();
			expect(history).toHaveLength(1);
			expect(history[0]).toEqual({
				role: "system",
				content: "System initialization",
				timestamp: "2026-01-11T10:00:00.000Z",
			});
		});
	});

	describe("getHistory", () => {
		it("returns all messages array", () => {
			// Arrange
			manager.addUserMessage("First");
			manager.addAgentMessage("Second");
			manager.addSystemMessage("Third");

			// Act
			const history = manager.getHistory();

			// Assert
			expect(history).toHaveLength(3);
			expect(history.map((m) => m.content)).toEqual([
				"First",
				"Second",
				"Third",
			]);
		});
	});

	describe("getLastN", () => {
		it("returns last N messages", () => {
			// Arrange
			manager.addUserMessage("First");
			manager.addAgentMessage("Second");
			manager.addUserMessage("Third");
			manager.addAgentMessage("Fourth");

			// Act
			const lastTwo = manager.getLastN(2);

			// Assert
			expect(lastTwo).toHaveLength(2);
			expect(lastTwo[0].content).toBe("Third");
			expect(lastTwo[1].content).toBe("Fourth");
		});

		it("returns all messages if N exceeds history length", () => {
			// Arrange
			manager.addUserMessage("Only message");

			// Act
			const result = manager.getLastN(10);

			// Assert
			expect(result).toHaveLength(1);
		});
	});

	describe("clear", () => {
		it("resets conversation to empty", () => {
			// Arrange
			manager.addUserMessage("Hello");
			manager.addAgentMessage("Hi");

			// Act
			manager.clear();

			// Assert
			expect(manager.getHistory()).toHaveLength(0);
		});
	});

	describe("toPromptFormat", () => {
		it("formats messages for agent input", () => {
			// Arrange
			manager.addSystemMessage("You are a helpful assistant");
			manager.addUserMessage("Hello");
			manager.addAgentMessage("Hi there!");

			// Act
			const formatted = manager.toPromptFormat();

			// Assert
			expect(formatted).toContain("[system]");
			expect(formatted).toContain("[user]");
			expect(formatted).toContain("[assistant]");
		});
	});

	describe("message fields", () => {
		it("each message has role, content, timestamp fields", () => {
			// Act
			manager.addUserMessage("Test");

			// Assert
			const msg = manager.getHistory()[0];
			expect(msg).toHaveProperty("role");
			expect(msg).toHaveProperty("content");
			expect(msg).toHaveProperty("timestamp");
		});
	});

	describe("context window limits", () => {
		it("truncates oldest when > limit", () => {
			// Arrange
			const smallManager = new ConversationManager(3);
			smallManager.addUserMessage("First");
			smallManager.addAgentMessage("Second");
			smallManager.addUserMessage("Third");

			// Act
			smallManager.addAgentMessage("Fourth"); // Exceeds limit

			// Assert
			const history = smallManager.getHistory();
			expect(history).toHaveLength(3);
			expect(history[0].content).toBe("Second"); // First was truncated
		});
	});

	describe("serialize", () => {
		it("returns JSON string for persistence", () => {
			// Arrange
			manager.addUserMessage("Hello");
			manager.addAgentMessage("Hi");

			// Act
			const json = manager.serialize();

			// Assert
			const parsed = JSON.parse(json);
			expect(parsed.messages).toHaveLength(2);
		});
	});

	describe("restore", () => {
		it("restores from serialized state", () => {
			// Arrange
			manager.addUserMessage("Hello");
			manager.addAgentMessage("Hi");
			const json = manager.serialize();

			// Act
			const restored = new ConversationManager();
			restored.restore(json);

			// Assert
			expect(restored.getHistory()).toHaveLength(2);
			expect(restored.getHistory()[0].content).toBe("Hello");
		});
	});
});
