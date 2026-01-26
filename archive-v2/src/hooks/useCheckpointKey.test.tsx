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
import { useCheckpointKey } from "./useCheckpointKey.js";

// Test component that uses the hook
function TestComponent({
	checkpointer,
	onCreated,
	onError,
}: {
	checkpointer: {
		create: (type: string) => Promise<{ tag: string }>;
	};
	onCreated?: (tag: string) => void;
	onError?: (error: string) => void;
}) {
	useCheckpointKey({
		checkpointer,
		onCreated,
		onError,
	});

	return (
		<Box flexDirection="column">
			<Text>Checkpoint handler active</Text>
		</Box>
	);
}

describe("useCheckpointKey", () => {
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

	describe("Create Checkpoint", () => {
		it("calls checkpointer.create with manual type when c pressed", async () => {
			// Arrange
			const checkpointer = {
				create: vi
					.fn()
					.mockResolvedValue({ tag: "chorus-checkpoint-1704067200000" }),
			};
			const { stdin } = render(<TestComponent checkpointer={checkpointer} />);

			// Act
			stdin.write("c");
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Assert
			expect(checkpointer.create).toHaveBeenCalledWith("manual");
		});

		it("calls onCreated with tag after successful checkpoint", async () => {
			// Arrange
			const tag = "chorus-checkpoint-1704067200001";
			const checkpointer = {
				create: vi.fn().mockResolvedValue({ tag }),
			};
			const onCreated = vi.fn();
			const { stdin } = render(
				<TestComponent checkpointer={checkpointer} onCreated={onCreated} />,
			);

			// Act
			stdin.write("c");
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Assert
			expect(onCreated).toHaveBeenCalledWith(tag);
		});

		it("creates git tag with timestamp format", async () => {
			// Arrange
			const timestamp = Date.now();
			const expectedTagPattern = /^chorus-checkpoint-\d+$/;
			const checkpointer = {
				create: vi
					.fn()
					.mockResolvedValue({ tag: `chorus-checkpoint-${timestamp}` }),
			};
			const onCreated = vi.fn();
			const { stdin } = render(
				<TestComponent checkpointer={checkpointer} onCreated={onCreated} />,
			);

			// Act
			stdin.write("c");
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Assert
			expect(onCreated).toHaveBeenCalled();
			const createdTag = onCreated.mock.calls[0][0];
			expect(createdTag).toMatch(expectedTagPattern);
		});
	});

	describe("Error Handling", () => {
		it("calls onError when git tag fails", async () => {
			// Arrange
			const errorMessage = "Cannot create tag: dirty working directory";
			const checkpointer = {
				create: vi.fn().mockRejectedValue(new Error(errorMessage)),
			};
			const onError = vi.fn();
			const { stdin } = render(
				<TestComponent checkpointer={checkpointer} onError={onError} />,
			);

			// Act
			stdin.write("c");
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Assert
			expect(onError).toHaveBeenCalledWith(errorMessage);
		});

		it("calls onError when no commits to checkpoint", async () => {
			// Arrange
			const errorMessage = "No commits to checkpoint";
			const checkpointer = {
				create: vi.fn().mockRejectedValue(new Error(errorMessage)),
			};
			const onError = vi.fn();
			const { stdin } = render(
				<TestComponent checkpointer={checkpointer} onError={onError} />,
			);

			// Act
			stdin.write("c");
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Assert
			expect(onError).toHaveBeenCalledWith(errorMessage);
		});
	});

	describe("Idempotency", () => {
		it("creates distinct checkpoints on multiple c presses", async () => {
			// Arrange
			let callCount = 0;
			const checkpointer = {
				create: vi.fn().mockImplementation(() => {
					callCount++;
					return Promise.resolve({
						tag: `chorus-checkpoint-${Date.now()}-${callCount}`,
					});
				}),
			};
			const onCreated = vi.fn();
			const { stdin } = render(
				<TestComponent checkpointer={checkpointer} onCreated={onCreated} />,
			);

			// Act - press c twice
			stdin.write("c");
			await new Promise((resolve) => setTimeout(resolve, 10));
			stdin.write("c");
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Assert - should create two distinct checkpoints
			expect(checkpointer.create).toHaveBeenCalledTimes(2);
			expect(onCreated).toHaveBeenCalledTimes(2);
		});

		it("ignores other keys", () => {
			// Arrange
			const checkpointer = {
				create: vi.fn().mockResolvedValue({ tag: "test-tag" }),
			};
			const { stdin } = render(<TestComponent checkpointer={checkpointer} />);

			// Act
			stdin.write("a");
			stdin.write("C"); // uppercase
			stdin.write("x");

			// Assert
			expect(checkpointer.create).not.toHaveBeenCalled();
		});
	});
});
