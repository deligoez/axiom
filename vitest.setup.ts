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
