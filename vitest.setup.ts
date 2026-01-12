/**
 * Vitest setup file
 *
 * This file runs before all tests to set up the test environment.
 */

// Mock process.stdin.isTTY to enable keyboard input handlers in tests
// The ink useInput hook checks for TTY before enabling input handling
Object.defineProperty(process.stdin, "isTTY", {
	value: true,
	configurable: true,
});

// Suppress DEP0190 deprecation warnings from cli-testing-library
// This is an upstream issue where cli-testing-library uses shell: true with args
// See: https://nodejs.org/api/deprecations.html#DEP0190
const originalEmit = process.emit;
// @ts-expect-error - TypeScript doesn't like overriding process.emit
process.emit = function (event: string, ...args: unknown[]) {
	if (
		event === "warning" &&
		args[0] &&
		typeof args[0] === "object" &&
		"name" in args[0] &&
		args[0].name === "DeprecationWarning" &&
		"code" in args[0] &&
		args[0].code === "DEP0190"
	) {
		return false;
	}
	// @ts-expect-error - forwarding arguments to original emit
	return originalEmit.apply(process, [event, ...args]);
};
