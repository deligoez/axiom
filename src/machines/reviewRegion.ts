import { assign, setup } from "xstate";
import type { TaskCompletionResult } from "../types/review.js";

// ============================================================================
// Types
// ============================================================================

export interface PendingReview {
	taskId: string;
	result: TaskCompletionResult;
	addedAt: number;
}

export interface ReviewRegionContext {
	pendingReviews: PendingReview[];
	currentBatch: PendingReview[];
	currentIndex: number;
}

export type ReviewRegionEvent =
	| { type: "TASK_COMPLETED"; taskId: string; result: TaskCompletionResult }
	| { type: "START_REVIEW" }
	| { type: "START_REVIEW_SINGLE"; taskId: string }
	| { type: "START_ONE_BY_ONE" }
	| { type: "JUMP_TO_TASK"; index: number }
	| { type: "APPROVE" }
	| { type: "REDO" }
	| { type: "REJECT" }
	| { type: "NEXT" }
	| { type: "PREV" }
	| { type: "BACK" }
	| { type: "CANCEL" };

// ============================================================================
// Machine
// ============================================================================

export const reviewRegionMachine = setup({
	types: {
		context: {} as ReviewRegionContext,
		events: {} as ReviewRegionEvent,
	},
	guards: {
		hasPendingReviews: ({ context }) => context.pendingReviews.length > 0,
	},
	actions: {
		addToPending: assign({
			pendingReviews: (
				{ context },
				params: { taskId: string; result: TaskCompletionResult },
			) => [
				...context.pendingReviews,
				{ taskId: params.taskId, result: params.result, addedAt: Date.now() },
			],
		}),
		snapshotBatch: assign({
			currentBatch: ({ context }) => [...context.pendingReviews],
			currentIndex: () => 0,
		}),
		snapshotSingleTask: assign({
			currentBatch: ({ context }, params: { taskId: string }) => {
				const task = context.pendingReviews.find(
					(r) => r.taskId === params.taskId,
				);
				return task ? [task] : [];
			},
			currentIndex: () => 0,
		}),
		setCurrentIndex: assign({
			currentIndex: (_, params: { index: number }) => params.index,
		}),
		approveCurrentTask: assign({
			pendingReviews: ({ context }) => {
				const current = context.currentBatch[context.currentIndex];
				if (!current) return context.pendingReviews;
				return context.pendingReviews.filter(
					(r) => r.taskId !== current.taskId,
				);
			},
			currentBatch: ({ context }) => {
				const current = context.currentBatch[context.currentIndex];
				if (!current) return context.currentBatch;
				return context.currentBatch.filter((r) => r.taskId !== current.taskId);
			},
		}),
		rejectCurrentTask: assign({
			pendingReviews: ({ context }) => {
				const current = context.currentBatch[context.currentIndex];
				if (!current) return context.pendingReviews;
				return context.pendingReviews.filter(
					(r) => r.taskId !== current.taskId,
				);
			},
			currentBatch: ({ context }) => {
				const current = context.currentBatch[context.currentIndex];
				if (!current) return context.currentBatch;
				return context.currentBatch.filter((r) => r.taskId !== current.taskId);
			},
		}),
		nextIndex: assign({
			currentIndex: ({ context }) =>
				Math.min(context.currentIndex + 1, context.currentBatch.length - 1),
		}),
		prevIndex: assign({
			currentIndex: ({ context }) => Math.max(context.currentIndex - 1, 0),
		}),
		clearBatch: assign({
			currentBatch: () => [],
			currentIndex: () => 0,
		}),
	},
}).createMachine({
	id: "reviewRegion",
	initial: "idle",
	context: {
		pendingReviews: [],
		currentBatch: [],
		currentIndex: 0,
	},
	states: {
		idle: {
			on: {
				TASK_COMPLETED: {
					actions: {
						type: "addToPending",
						params: ({ event }) => ({
							taskId: event.taskId,
							result: event.result,
						}),
					},
				},
				START_REVIEW: {
					target: "reviewingSummary",
					guard: "hasPendingReviews",
					actions: "snapshotBatch",
				},
				START_REVIEW_SINGLE: {
					target: "reviewingTask",
					guard: "hasPendingReviews",
					actions: {
						type: "snapshotSingleTask",
						params: ({ event }) => ({ taskId: event.taskId }),
					},
				},
			},
		},
		reviewingSummary: {
			on: {
				TASK_COMPLETED: {
					actions: {
						type: "addToPending",
						params: ({ event }) => ({
							taskId: event.taskId,
							result: event.result,
						}),
					},
				},
				START_ONE_BY_ONE: {
					target: "reviewingTask",
					actions: assign({ currentIndex: () => 0 }),
				},
				JUMP_TO_TASK: {
					target: "reviewingTask",
					actions: {
						type: "setCurrentIndex",
						params: ({ event }) => ({ index: event.index }),
					},
				},
				CANCEL: {
					target: "idle",
					actions: "clearBatch",
				},
			},
		},
		reviewingTask: {
			on: {
				TASK_COMPLETED: {
					actions: {
						type: "addToPending",
						params: ({ event }) => ({
							taskId: event.taskId,
							result: event.result,
						}),
					},
				},
				APPROVE: {
					actions: "approveCurrentTask",
				},
				REDO: {
					target: "feedbackModal",
				},
				REJECT: {
					actions: "rejectCurrentTask",
				},
				NEXT: {
					actions: "nextIndex",
				},
				PREV: {
					actions: "prevIndex",
				},
				BACK: {
					target: "reviewingSummary",
				},
				CANCEL: {
					target: "idle",
					actions: "clearBatch",
				},
			},
		},
		feedbackModal: {
			on: {
				TASK_COMPLETED: {
					actions: {
						type: "addToPending",
						params: ({ event }) => ({
							taskId: event.taskId,
							result: event.result,
						}),
					},
				},
				BACK: {
					target: "reviewingTask",
				},
				CANCEL: {
					target: "idle",
					actions: "clearBatch",
				},
			},
		},
	},
});
