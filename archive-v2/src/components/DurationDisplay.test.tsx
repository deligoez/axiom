import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { DurationDisplay } from "./DurationDisplay.js";

describe("DurationDisplay", () => {
	const NOW = 1000000000000; // Fixed reference time

	it('shows "< 1m" for 30 seconds', () => {
		// Arrange
		const startTime = NOW - 30 * 1000; // 30 seconds ago

		// Act
		const { lastFrame } = render(
			<DurationDisplay startTime={startTime} now={NOW} />,
		);

		// Assert
		expect(lastFrame()).toContain("< 1m");
	});

	it('shows "1m" for 60 seconds', () => {
		// Arrange
		const startTime = NOW - 60 * 1000; // 60 seconds ago

		// Act
		const { lastFrame } = render(
			<DurationDisplay startTime={startTime} now={NOW} />,
		);

		// Assert
		expect(lastFrame()).toContain("1m");
	});

	it('shows "12m" for 720 seconds', () => {
		// Arrange
		const startTime = NOW - 720 * 1000; // 12 minutes ago

		// Act
		const { lastFrame } = render(
			<DurationDisplay startTime={startTime} now={NOW} />,
		);

		// Assert
		expect(lastFrame()).toContain("12m");
	});

	it('shows "1h 0m" for 3600 seconds', () => {
		// Arrange
		const startTime = NOW - 3600 * 1000; // 1 hour ago

		// Act
		const { lastFrame } = render(
			<DurationDisplay startTime={startTime} now={NOW} />,
		);

		// Assert
		expect(lastFrame()).toContain("1h 0m");
	});

	it('shows "1h 15m" for 4500 seconds', () => {
		// Arrange
		const startTime = NOW - 4500 * 1000; // 1 hour 15 minutes ago

		// Act
		const { lastFrame } = render(
			<DurationDisplay startTime={startTime} now={NOW} />,
		);

		// Assert
		expect(lastFrame()).toContain("1h 15m");
	});

	it('shows "1d 2h" for 93600 seconds', () => {
		// Arrange
		const startTime = NOW - 93600 * 1000; // 26 hours ago = 1 day 2 hours

		// Act
		const { lastFrame } = render(
			<DurationDisplay startTime={startTime} now={NOW} />,
		);

		// Assert
		expect(lastFrame()).toContain("1d 2h");
	});

	it('handles future startTime (returns "0m")', () => {
		// Arrange
		const startTime = NOW + 1000; // 1 second in the future

		// Act
		const { lastFrame } = render(
			<DurationDisplay startTime={startTime} now={NOW} />,
		);

		// Assert
		expect(lastFrame()).toContain("0m");
	});
});
