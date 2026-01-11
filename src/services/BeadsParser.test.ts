import { describe, expect, it } from "vitest";
import type { Bead } from "../types/bead.js";
import {
	parseBeadLine,
	parseBeadsJSONL,
	serializeBeadLine,
} from "./BeadsParser.js";

describe("BeadsParser", () => {
	describe("parseBeadLine", () => {
		it("parses a single JSONL line into a Bead", () => {
			const line =
				'{"id":"bd-a1b2","title":"Test task","status":"open","priority":2,"type":"task","created":"2026-01-09T10:00:00Z","updated":"2026-01-09T10:00:00Z"}';
			const bead = parseBeadLine(line);

			expect(bead).toEqual({
				id: "bd-a1b2",
				title: "Test task",
				status: "open",
				priority: 2,
				type: "task",
				created: "2026-01-09T10:00:00Z",
				updated: "2026-01-09T10:00:00Z",
			});
		});

		it("parses line with optional fields", () => {
			const line =
				'{"id":"bd-c3d4","title":"Bug fix","status":"in_progress","priority":1,"type":"bug","assignee":"claude","description":"Fix the auth bug","created":"2026-01-09T10:00:00Z","updated":"2026-01-09T11:00:00Z"}';
			const bead = parseBeadLine(line);

			expect(bead).not.toBeNull();
			expect(bead?.assignee).toBe("claude");
			expect(bead?.description).toBe("Fix the auth bug");
		});

		it("parses closed issue with reason", () => {
			const line =
				'{"id":"bd-e5f6","title":"Done task","status":"closed","priority":3,"type":"task","created":"2026-01-09T10:00:00Z","updated":"2026-01-09T12:00:00Z","closed":"2026-01-09T12:00:00Z","closed_reason":"Completed successfully"}';
			const bead = parseBeadLine(line);

			expect(bead).not.toBeNull();
			expect(bead?.status).toBe("closed");
			expect(bead?.closed).toBe("2026-01-09T12:00:00Z");
			expect(bead?.closedReason).toBe("Completed successfully");
		});

		it("parses issue with dependencies", () => {
			const line =
				'{"id":"bd-g7h8","title":"Blocked task","status":"blocked","priority":2,"type":"task","dependencies":["bd-a1b2","bd-c3d4"],"created":"2026-01-09T10:00:00Z","updated":"2026-01-09T10:00:00Z"}';
			const bead = parseBeadLine(line);

			expect(bead).not.toBeNull();
			expect(bead?.status).toBe("blocked");
			expect(bead?.dependencies).toEqual(["bd-a1b2", "bd-c3d4"]);
		});

		it("parses ephemeral issue (wisp)", () => {
			const line =
				'{"id":"bd-i9j0","title":"Temp note","status":"open","priority":4,"type":"task","ephemeral":true,"created":"2026-01-09T10:00:00Z","updated":"2026-01-09T10:00:00Z"}';
			const bead = parseBeadLine(line);

			expect(bead).not.toBeNull();
			expect(bead?.ephemeral).toBe(true);
		});

		it("returns null for empty line", () => {
			expect(parseBeadLine("")).toBeNull();
			expect(parseBeadLine("   ")).toBeNull();
		});

		it("returns null for invalid JSON", () => {
			expect(parseBeadLine("not valid json")).toBeNull();
			expect(parseBeadLine("{invalid}")).toBeNull();
		});

		it("returns null for missing required fields", () => {
			expect(parseBeadLine('{"id":"bd-x"}')).toBeNull();
			expect(parseBeadLine('{"title":"No ID"}')).toBeNull();
		});

		it("returns null for negative priority values", () => {
			const line =
				'{"id":"bd-neg","title":"Negative","status":"open","priority":-1,"type":"task","created":"2026-01-09T10:00:00Z","updated":"2026-01-09T10:00:00Z"}';
			expect(parseBeadLine(line)).toBeNull();
		});

		it("returns null for out-of-range priority values", () => {
			const line =
				'{"id":"bd-high","title":"Too High","status":"open","priority":99,"type":"task","created":"2026-01-09T10:00:00Z","updated":"2026-01-09T10:00:00Z"}';
			expect(parseBeadLine(line)).toBeNull();
		});

		it("returns null when required fields are null", () => {
			expect(
				parseBeadLine(
					'{"id":null,"title":"Test","status":"open","priority":2,"type":"task","created":"2026-01-09T10:00:00Z","updated":"2026-01-09T10:00:00Z"}',
				),
			).toBeNull();
			expect(
				parseBeadLine(
					'{"id":"bd-x","title":null,"status":"open","priority":2,"type":"task","created":"2026-01-09T10:00:00Z","updated":"2026-01-09T10:00:00Z"}',
				),
			).toBeNull();
		});

		it("ignores optional fields when null", () => {
			const line =
				'{"id":"bd-null","title":"Null optionals","status":"open","priority":2,"type":"task","created":"2026-01-09T10:00:00Z","updated":"2026-01-09T10:00:00Z","assignee":null,"description":null}';
			const bead = parseBeadLine(line);

			expect(bead).not.toBeNull();
			expect(bead?.assignee).toBeUndefined();
			expect(bead?.description).toBeUndefined();
		});

		it("returns null when required fields are empty strings", () => {
			expect(
				parseBeadLine(
					'{"id":"","title":"Test","status":"open","priority":2,"type":"task","created":"2026-01-09T10:00:00Z","updated":"2026-01-09T10:00:00Z"}',
				),
			).toBeNull();
			expect(
				parseBeadLine(
					'{"id":"bd-x","title":"","status":"open","priority":2,"type":"task","created":"2026-01-09T10:00:00Z","updated":"2026-01-09T10:00:00Z"}',
				),
			).toBeNull();
		});

		it("ignores optional fields when empty strings", () => {
			const line =
				'{"id":"bd-empty","title":"Empty optionals","status":"open","priority":2,"type":"task","created":"2026-01-09T10:00:00Z","updated":"2026-01-09T10:00:00Z","assignee":"","description":""}';
			const bead = parseBeadLine(line);

			expect(bead).not.toBeNull();
			expect(bead?.assignee).toBeUndefined();
			expect(bead?.description).toBeUndefined();
		});
	});

	describe("parseBeadsJSONL", () => {
		it("parses multiple lines into array of Beads", () => {
			const jsonl = `{"id":"bd-a1b2","title":"Task 1","status":"open","priority":2,"type":"task","created":"2026-01-09T10:00:00Z","updated":"2026-01-09T10:00:00Z"}
{"id":"bd-c3d4","title":"Task 2","status":"in_progress","priority":1,"type":"bug","created":"2026-01-09T10:00:00Z","updated":"2026-01-09T10:00:00Z"}`;

			const beads = parseBeadsJSONL(jsonl);
			expect(beads).toHaveLength(2);
			expect(beads[0].id).toBe("bd-a1b2");
			expect(beads[1].id).toBe("bd-c3d4");
		});

		it("skips empty lines", () => {
			const jsonl = `{"id":"bd-a1b2","title":"Task 1","status":"open","priority":2,"type":"task","created":"2026-01-09T10:00:00Z","updated":"2026-01-09T10:00:00Z"}

{"id":"bd-c3d4","title":"Task 2","status":"open","priority":2,"type":"task","created":"2026-01-09T10:00:00Z","updated":"2026-01-09T10:00:00Z"}`;

			const beads = parseBeadsJSONL(jsonl);
			expect(beads).toHaveLength(2);
		});

		it("skips invalid lines gracefully", () => {
			const jsonl = `{"id":"bd-a1b2","title":"Valid","status":"open","priority":2,"type":"task","created":"2026-01-09T10:00:00Z","updated":"2026-01-09T10:00:00Z"}
invalid json line
{"id":"bd-c3d4","title":"Also Valid","status":"open","priority":2,"type":"task","created":"2026-01-09T10:00:00Z","updated":"2026-01-09T10:00:00Z"}`;

			const beads = parseBeadsJSONL(jsonl);
			expect(beads).toHaveLength(2);
		});

		it("returns empty array for empty input", () => {
			expect(parseBeadsJSONL("")).toEqual([]);
			expect(parseBeadsJSONL("   \n  \n  ")).toEqual([]);
		});

		it("filters out tombstone issues by default", () => {
			const jsonl = `{"id":"bd-a1b2","title":"Active","status":"open","priority":2,"type":"task","created":"2026-01-09T10:00:00Z","updated":"2026-01-09T10:00:00Z"}
{"id":"bd-c3d4","title":"Deleted","status":"tombstone","priority":2,"type":"task","created":"2026-01-09T10:00:00Z","updated":"2026-01-09T10:00:00Z"}`;

			const beads = parseBeadsJSONL(jsonl);
			expect(beads).toHaveLength(1);
			expect(beads[0].title).toBe("Active");
		});

		it("includes tombstone issues when includeTombstones is true", () => {
			const jsonl = `{"id":"bd-a1b2","title":"Active","status":"open","priority":2,"type":"task","created":"2026-01-09T10:00:00Z","updated":"2026-01-09T10:00:00Z"}
{"id":"bd-c3d4","title":"Deleted","status":"tombstone","priority":2,"type":"task","created":"2026-01-09T10:00:00Z","updated":"2026-01-09T10:00:00Z"}`;

			const beads = parseBeadsJSONL(jsonl, { includeTombstones: true });
			expect(beads).toHaveLength(2);
		});
	});

	describe("serializeBeadLine", () => {
		it("serializes a Bead to JSONL line", () => {
			const bead: Bead = {
				id: "bd-a1b2",
				title: "Test task",
				status: "open",
				priority: 2,
				type: "task",
				created: "2026-01-09T10:00:00Z",
				updated: "2026-01-09T10:00:00Z",
			};

			const line = serializeBeadLine(bead);
			const parsed = JSON.parse(line);

			expect(parsed.id).toBe("bd-a1b2");
			expect(parsed.title).toBe("Test task");
			expect(parsed.status).toBe("open");
		});

		it("converts closedReason to closed_reason for JSONL", () => {
			const bead: Bead = {
				id: "bd-a1b2",
				title: "Done",
				status: "closed",
				priority: 2,
				type: "task",
				created: "2026-01-09T10:00:00Z",
				updated: "2026-01-09T10:00:00Z",
				closed: "2026-01-09T12:00:00Z",
				closedReason: "Completed",
			};

			const line = serializeBeadLine(bead);
			const parsed = JSON.parse(line);

			expect(parsed.closed_reason).toBe("Completed");
			expect(parsed.closedReason).toBeUndefined();
		});
	});
});
