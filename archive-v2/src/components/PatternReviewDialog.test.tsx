import { render } from "ink-testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PendingPatternStore } from "../services/PendingPatternStore.js";
import { PatternReviewDialog } from "./PatternReviewDialog.js";

describe("PatternReviewDialog", () => {
	const defaultSuggestion = {
		id: "pattern-001",
		category: "API Design",
		sourceTask: "ch-005",
		sourceAgent: "claude",
		content: "Always use dependency injection for external services",
		createdAt: new Date("2026-01-01"),
		expiresAt: new Date("2026-01-08"),
	};

	const defaultProps = {
		isOpen: true,
		suggestion: defaultSuggestion,
		onApprove: vi.fn(),
		onEdit: vi.fn(),
		onReject: vi.fn(),
		onLater: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("rendering", () => {
		it("should render pattern category and source task", () => {
			// Arrange & Act
			const { lastFrame } = render(<PatternReviewDialog {...defaultProps} />);

			// Assert
			const output = lastFrame();
			expect(output).toContain("API Design");
			expect(output).toContain("ch-005");
		});

		it("should render suggested content", () => {
			// Arrange & Act
			const { lastFrame } = render(<PatternReviewDialog {...defaultProps} />);

			// Assert
			expect(lastFrame()).toContain("dependency injection");
		});

		it("should show action buttons", () => {
			// Arrange & Act
			const { lastFrame } = render(<PatternReviewDialog {...defaultProps} />);

			// Assert
			const output = lastFrame();
			expect(output).toContain("Approve");
			expect(output).toContain("Reject");
			expect(output).toContain("Later");
		});

		it("should not render when isOpen is false", () => {
			// Arrange
			const props = { ...defaultProps, isOpen: false };

			// Act
			const { lastFrame } = render(<PatternReviewDialog {...props} />);

			// Assert
			expect(lastFrame()).toBe("");
		});
	});

	describe("keyboard shortcuts", () => {
		it("should call onApprove when 'a' is pressed", () => {
			// Arrange
			const onApprove = vi.fn();
			const { stdin } = render(
				<PatternReviewDialog {...defaultProps} onApprove={onApprove} />,
			);

			// Act
			stdin.write("a");

			// Assert
			expect(onApprove).toHaveBeenCalledWith(defaultSuggestion);
		});

		it("should call onReject when 'r' is pressed", () => {
			// Arrange
			const onReject = vi.fn();
			const { stdin } = render(
				<PatternReviewDialog {...defaultProps} onReject={onReject} />,
			);

			// Act
			stdin.write("r");

			// Assert
			expect(onReject).toHaveBeenCalledWith(defaultSuggestion);
		});

		it("should call onLater when 'l' is pressed", () => {
			// Arrange
			const onLater = vi.fn();
			const { stdin } = render(
				<PatternReviewDialog {...defaultProps} onLater={onLater} />,
			);

			// Act
			stdin.write("l");

			// Assert
			expect(onLater).toHaveBeenCalledWith(defaultSuggestion);
		});

		it("should call onEdit when 'e' is pressed", () => {
			// Arrange
			const onEdit = vi.fn();
			const { stdin } = render(
				<PatternReviewDialog {...defaultProps} onEdit={onEdit} />,
			);

			// Act
			stdin.write("e");

			// Assert
			expect(onEdit).toHaveBeenCalledWith(defaultSuggestion, "");
		});
	});

	describe("source display", () => {
		it("should show source agent type", () => {
			// Arrange & Act
			const { lastFrame } = render(<PatternReviewDialog {...defaultProps} />);

			// Assert
			expect(lastFrame()).toContain("claude");
		});
	});
});

describe("PendingPatternStore", () => {
	let store: PendingPatternStore;
	let testDir: string;

	beforeEach(() => {
		testDir = `/tmp/chorus-test-${Date.now()}`;
		store = new PendingPatternStore(testDir);
	});

	afterEach(async () => {
		// Clean up
		const fs = await import("node:fs/promises");
		try {
			await fs.rm(testDir, { recursive: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	it("should add patterns to pending queue", async () => {
		// Arrange
		const pattern = {
			id: "pattern-001",
			category: "Testing",
			sourceTask: "ch-001",
			sourceAgent: "claude",
			content: "Always write tests first",
			createdAt: new Date(),
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
		};

		// Act
		await store.add(pattern);
		const pending = await store.getPending();

		// Assert
		expect(pending).toHaveLength(1);
		expect(pending[0].id).toBe("pattern-001");
	});

	it("should remove patterns from pending queue", async () => {
		// Arrange
		const pattern = {
			id: "pattern-002",
			category: "Testing",
			sourceTask: "ch-002",
			sourceAgent: "claude",
			content: "Test pattern",
			createdAt: new Date(),
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
		};
		await store.add(pattern);

		// Act
		await store.remove("pattern-002");
		const pending = await store.getPending();

		// Assert
		expect(pending).toHaveLength(0);
	});

	it("should return pending count", async () => {
		// Arrange
		const pattern1 = {
			id: "pattern-003",
			category: "Testing",
			sourceTask: "ch-003",
			sourceAgent: "claude",
			content: "Pattern 1",
			createdAt: new Date(),
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
		};
		const pattern2 = {
			id: "pattern-004",
			category: "Testing",
			sourceTask: "ch-004",
			sourceAgent: "claude",
			content: "Pattern 2",
			createdAt: new Date(),
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
		};

		// Act
		await store.add(pattern1);
		await store.add(pattern2);
		const count = await store.getCount();

		// Assert
		expect(count).toBe(2);
	});
});
