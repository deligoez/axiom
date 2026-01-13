import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import type { LogEntry } from "../services/AgentLogger.js";
import { AgentLogPanel } from "./AgentLogPanel.js";

/**
 * Helper to create a mock log entry.
 */
function createEntry(
	persona: string,
	instanceId: string,
	message: string,
	timestamp?: string,
): LogEntry {
	return {
		persona,
		instanceId,
		timestamp: timestamp ?? new Date().toISOString(),
		level: "info",
		message,
	};
}

describe("AgentLogPanel", () => {
	it("renders null when isOpen is false", () => {
		// Arrange
		const entries: LogEntry[] = [createEntry("chip", "chip-001", "Hello")];
		const onClose = vi.fn();

		// Act
		const { lastFrame } = render(
			<AgentLogPanel isOpen={false} entries={entries} onClose={onClose} />,
		);

		// Assert
		expect(lastFrame()).toBe("");
	});

	it("renders last 50 log entries by default", () => {
		// Arrange - Create 60 entries
		const entries: LogEntry[] = [];
		for (let i = 1; i <= 60; i++) {
			entries.push(
				createEntry(
					"chip",
					`chip-${i.toString().padStart(3, "0")}`,
					`Entry-${i}`,
				),
			);
		}
		const onClose = vi.fn();

		// Act
		const { lastFrame } = render(
			<AgentLogPanel
				isOpen={true}
				entries={entries}
				onClose={onClose}
				visibleLines={50}
			/>,
		);

		// Assert - Should show entries 11-60 (last 50)
		const frame = lastFrame() ?? "";
		expect(frame).toContain("50 of 50"); // Shows 50 entries
		expect(frame).toContain("[chip-011]"); // Entry 11 should be first
		expect(frame).not.toContain("[chip-001]"); // Entry 1 should be excluded
		expect(frame).toContain("Entry-60"); // Entry 60 should be included
	});

	it("shows [HH:MM:SS] [persona-id] message format", () => {
		// Arrange
		const timestamp = "2024-01-15T10:30:45.123Z";
		const entries: LogEntry[] = [
			createEntry("chip", "chip-001", "Test message", timestamp),
		];
		const onClose = vi.fn();

		// Act
		const { lastFrame } = render(
			<AgentLogPanel isOpen={true} entries={entries} onClose={onClose} />,
		);

		// Assert - Check format
		const frame = lastFrame() ?? "";
		expect(frame).toContain("[chip-001]");
		expect(frame).toContain("Test message");
		// Time format depends on locale, so just check it has brackets
		expect(frame).toMatch(/\[\d{2}:\d{2}:\d{2}\]/);
	});

	it("filters entries by persona name", () => {
		// Arrange
		const entries: LogEntry[] = [
			createEntry("chip", "chip-001", "Chip task"),
			createEntry("archie", "archie", "Archie task"),
			createEntry("chip", "chip-002", "Another chip task"),
		];
		const onClose = vi.fn();

		// Act
		const { lastFrame } = render(
			<AgentLogPanel
				isOpen={true}
				entries={entries}
				onClose={onClose}
				filterPersona="chip"
			/>,
		);

		// Assert
		const frame = lastFrame() ?? "";
		expect(frame).toContain("chip-001");
		expect(frame).toContain("chip-002");
		expect(frame).not.toContain("[archie]"); // Archie entry should be filtered out
		expect(frame).toContain("(chip)"); // Filter indicator in header
	});

	it("displays persona background color from PERSONA_COLORS", () => {
		// Arrange
		const entries: LogEntry[] = [
			createEntry("chip", "chip-001", "Cyan background"),
		];
		const onClose = vi.fn();

		// Act
		const { lastFrame } = render(
			<AgentLogPanel isOpen={true} entries={entries} onClose={onClose} />,
		);

		// Assert - Check persona identifier renders (color testing limited in ink-testing-library)
		const frame = lastFrame() ?? "";
		expect(frame).toContain("[chip-001]");
		expect(frame).toContain("Cyan background");
	});

	it("shows 'No log entries' when entries array is empty", () => {
		// Arrange
		const onClose = vi.fn();

		// Act
		const { lastFrame } = render(
			<AgentLogPanel isOpen={true} entries={[]} onClose={onClose} />,
		);

		// Assert
		const frame = lastFrame() ?? "";
		expect(frame).toContain("No log entries");
		expect(frame).toContain("0 entries");
	});
});
