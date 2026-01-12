import { useInput } from "ink";

// Check if stdin supports raw mode (safe check)
// Using a getter to allow test mocking
const getIsTTY = () => Boolean(process.stdin?.isTTY);

export interface UseCheckpointKeyOptions {
	checkpointer: {
		create: (type: string) => Promise<{ tag: string }>;
	};
	onCreated?: (tag: string) => void;
	onError?: (error: string) => void;
}

/**
 * useCheckpointKey - Hook for handling 'c' key to create manual checkpoint
 *
 * Handles:
 * - c: Create manual checkpoint (git tag)
 *
 * Note: Manual checkpoints are user-triggered safety points.
 * Can rollback to any checkpoint via 'R' key.
 */
export function useCheckpointKey({
	checkpointer,
	onCreated,
	onError,
}: UseCheckpointKeyOptions): void {
	// Handle keyboard input
	useInput(
		(input) => {
			// Only respond to lowercase 'c'
			if (input !== "c") {
				return;
			}

			// Create manual checkpoint
			handleCreateCheckpoint();
		},
		{ isActive: getIsTTY() },
	);

	async function handleCreateCheckpoint() {
		try {
			const checkpoint = await checkpointer.create("manual");
			onCreated?.(checkpoint.tag);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to create checkpoint";
			onError?.(message);
		}
	}
}
