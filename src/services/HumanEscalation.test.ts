import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EscalationRequest } from "./HumanEscalation.js";
import { HumanEscalation } from "./HumanEscalation.js";

describe("HumanEscalation", () => {
	let escalation: HumanEscalation;

	beforeEach(() => {
		escalation = new HumanEscalation();
	});

	const createRequest = (
		overrides: Partial<EscalationRequest> = {},
	): EscalationRequest => ({
		taskId: "task-1",
		worktreePath: "/worktrees/task-1",
		conflictFiles: ["src/index.ts"],
		retryCount: 3,
		lastAttempt: "agent",
		...overrides,
	});

	// F30: shouldEscalate() - 2 tests
	describe("shouldEscalate()", () => {
		it("returns true when retryCount >= 3", () => {
			// Arrange
			const request = createRequest({ retryCount: 3 });

			// Act
			const result = escalation.shouldEscalate(request);

			// Assert
			expect(result).toBe(true);
		});

		it("returns false when retryCount < 3", () => {
			// Arrange
			const request = createRequest({ retryCount: 2 });

			// Act
			const result = escalation.shouldEscalate(request);

			// Assert
			expect(result).toBe(false);
		});
	});

	// F30: escalate() - 3 tests
	describe("escalate()", () => {
		it("emits 'escalated' event with request details", async () => {
			// Arrange
			const request = createRequest();
			const handler = vi.fn();
			escalation.on("escalated", handler);

			// Act
			const promise = escalation.escalate(request);
			await new Promise((r) => setTimeout(r, 0)); // Let event emit

			// Assert
			expect(handler).toHaveBeenCalledWith(request);

			// Cleanup
			escalation.markResolved();
			await promise;
		});

		it("returns Promise that waits for human action", async () => {
			// Arrange
			const request = createRequest();
			let resolved = false;

			// Act
			const promise = escalation.escalate(request);
			promise.then(() => {
				resolved = true;
			});
			await new Promise((r) => setTimeout(r, 10));

			// Assert - should not resolve until marked
			expect(resolved).toBe(false);

			// Cleanup - mark resolved so promise completes
			escalation.markResolved();
			await promise;
			expect(resolved).toBe(true);
		});

		it("sets pending state with request", async () => {
			// Arrange
			const request = createRequest();

			// Act
			const promise = escalation.escalate(request);
			await new Promise((r) => setTimeout(r, 0));

			// Assert
			expect(escalation.hasPending()).toBe(true);
			expect(escalation.getPending()).toEqual(request);

			// Cleanup
			escalation.markResolved();
			await promise;
		});
	});

	// F30: markResolved() - 1 test
	describe("markResolved()", () => {
		it("clears pending, emits 'resolved', resolves with action: 'merged'", async () => {
			// Arrange
			const request = createRequest();
			const handler = vi.fn();
			escalation.on("resolved", handler);
			const promise = escalation.escalate(request);
			await new Promise((r) => setTimeout(r, 0));

			// Act
			escalation.markResolved();
			const result = await promise;

			// Assert
			expect(result).toEqual({ action: "merged" });
			expect(handler).toHaveBeenCalledOnce();
			expect(escalation.hasPending()).toBe(false);
		});
	});

	// F30: markSkipped() - 1 test
	describe("markSkipped()", () => {
		it("clears pending, emits 'skipped', resolves with action: 'skipped'", async () => {
			// Arrange
			const request = createRequest();
			const handler = vi.fn();
			escalation.on("skipped", handler);
			const promise = escalation.escalate(request);
			await new Promise((r) => setTimeout(r, 0));

			// Act
			escalation.markSkipped();
			const result = await promise;

			// Assert
			expect(result).toEqual({ action: "skipped" });
			expect(handler).toHaveBeenCalledOnce();
			expect(escalation.hasPending()).toBe(false);
		});
	});

	// F30: markCancelled() - 1 test
	describe("markCancelled()", () => {
		it("clears pending, emits 'cancelled', resolves with action: 'cancelled'", async () => {
			// Arrange
			const request = createRequest();
			const handler = vi.fn();
			escalation.on("cancelled", handler);
			const promise = escalation.escalate(request);
			await new Promise((r) => setTimeout(r, 0));

			// Act
			escalation.markCancelled();
			const result = await promise;

			// Assert
			expect(result).toEqual({ action: "cancelled" });
			expect(handler).toHaveBeenCalledOnce();
			expect(escalation.hasPending()).toBe(false);
		});
	});

	// F30: hasPending() / getPending() - 1 test
	describe("hasPending() / getPending()", () => {
		it("returns true/request when pending, false/null when not", () => {
			// Arrange - initially no pending
			expect(escalation.hasPending()).toBe(false);
			expect(escalation.getPending()).toBeNull();

			// Act - escalate to set pending
			const request = createRequest();
			escalation.escalate(request);

			// Assert
			expect(escalation.hasPending()).toBe(true);
			expect(escalation.getPending()).toEqual(request);

			// Act - mark resolved to clear pending
			escalation.markResolved();

			// Assert
			expect(escalation.hasPending()).toBe(false);
			expect(escalation.getPending()).toBeNull();
		});
	});
});
