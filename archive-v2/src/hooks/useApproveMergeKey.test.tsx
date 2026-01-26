import { Box, Text } from "ink";
import { render } from "ink-testing-library";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { useApproveMergeKey } from "./useApproveMergeKey.js";

// Mock merge request type
interface MergeRequest {
	id: string;
	taskId: string;
	status: "pending" | "approved" | "rejected" | "in_progress";
}

// Test component that uses the hook
function TestComponent({
	isPanelFocused,
	selectedMergeRequest,
	onApprove,
	onError,
}: {
	isPanelFocused: boolean;
	selectedMergeRequest: MergeRequest | null;
	onApprove?: (requestId: string) => void;
	onError?: (error: string) => void;
}) {
	useApproveMergeKey({
		isPanelFocused,
		selectedMergeRequest,
		onApprove,
		onError,
	});

	return (
		<Box flexDirection="column">
			<Text>
				Panel: {isPanelFocused ? "focused" : "not focused"}, Selected:{" "}
				{selectedMergeRequest?.id ?? "none"}
			</Text>
		</Box>
	);
}

describe("useApproveMergeKey", () => {
	const originalIsTTY = process.stdin.isTTY;

	beforeAll(() => {
		Object.defineProperty(process.stdin, "isTTY", {
			value: true,
			writable: true,
			configurable: true,
		});
	});

	afterAll(() => {
		Object.defineProperty(process.stdin, "isTTY", {
			value: originalIsTTY,
			writable: true,
			configurable: true,
		});
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	// Helper to create merge request
	const createMergeRequest = (
		id: string,
		status: MergeRequest["status"] = "pending",
	): MergeRequest => ({
		id,
		taskId: `task-${id}`,
		status,
	});

	describe("Approve Action", () => {
		it("'a' key triggers approval when panel focused and request selected", () => {
			// Arrange
			const onApprove = vi.fn();
			const request = createMergeRequest("mr-1", "pending");
			const { stdin } = render(
				<TestComponent
					isPanelFocused={true}
					selectedMergeRequest={request}
					onApprove={onApprove}
				/>,
			);

			// Act
			stdin.write("a");

			// Assert
			expect(onApprove).toHaveBeenCalledWith("mr-1");
		});

		it("'a' key does nothing when panel not focused", () => {
			// Arrange
			const onApprove = vi.fn();
			const request = createMergeRequest("mr-2", "pending");
			const { stdin } = render(
				<TestComponent
					isPanelFocused={false}
					selectedMergeRequest={request}
					onApprove={onApprove}
				/>,
			);

			// Act
			stdin.write("a");

			// Assert
			expect(onApprove).not.toHaveBeenCalled();
		});

		it("'a' key calls onError when no request selected", () => {
			// Arrange
			const onApprove = vi.fn();
			const onError = vi.fn();
			const { stdin } = render(
				<TestComponent
					isPanelFocused={true}
					selectedMergeRequest={null}
					onApprove={onApprove}
					onError={onError}
				/>,
			);

			// Act
			stdin.write("a");

			// Assert
			expect(onApprove).not.toHaveBeenCalled();
			expect(onError).toHaveBeenCalledWith("No merge request selected");
		});

		it("'a' key calls onError when request already approved", () => {
			// Arrange
			const onApprove = vi.fn();
			const onError = vi.fn();
			const request = createMergeRequest("mr-3", "approved");
			const { stdin } = render(
				<TestComponent
					isPanelFocused={true}
					selectedMergeRequest={request}
					onApprove={onApprove}
					onError={onError}
				/>,
			);

			// Act
			stdin.write("a");

			// Assert
			expect(onApprove).not.toHaveBeenCalled();
			expect(onError).toHaveBeenCalledWith("Merge request not pending");
		});

		it("'a' key calls onError when request in progress", () => {
			// Arrange
			const onApprove = vi.fn();
			const onError = vi.fn();
			const request = createMergeRequest("mr-4", "in_progress");
			const { stdin } = render(
				<TestComponent
					isPanelFocused={true}
					selectedMergeRequest={request}
					onApprove={onApprove}
					onError={onError}
				/>,
			);

			// Act
			stdin.write("a");

			// Assert
			expect(onApprove).not.toHaveBeenCalled();
			expect(onError).toHaveBeenCalledWith("Merge request not pending");
		});
	});

	describe("Key Detection", () => {
		it("other keys do not trigger approval", () => {
			// Arrange
			const onApprove = vi.fn();
			const request = createMergeRequest("mr-5", "pending");
			const { stdin } = render(
				<TestComponent
					isPanelFocused={true}
					selectedMergeRequest={request}
					onApprove={onApprove}
				/>,
			);

			// Act
			stdin.write("A"); // uppercase
			stdin.write("b");
			stdin.write("x");

			// Assert
			expect(onApprove).not.toHaveBeenCalled();
		});

		it("works without callbacks (graceful no-op)", () => {
			// Arrange - no callbacks provided
			const request = createMergeRequest("mr-6", "pending");
			const { stdin } = render(
				<TestComponent isPanelFocused={true} selectedMergeRequest={request} />,
			);

			// Act & Assert - should not throw
			expect(() => stdin.write("a")).not.toThrow();
		});
	});
});
