/**
 * PTY-based E2E testing helpers for Chorus TUI
 *
 * Uses node-pty to create a real pseudo-terminal, enabling proper testing
 * of Ink's useInput hook which requires TTY.
 *
 * Based on Ink's own testing approach:
 * https://github.com/vadimdemedes/ink/blob/master/test/hooks.tsx
 */

import { resolve } from "node:path";
import { type IPty, spawn } from "node-pty";

/**
 * Strip ANSI escape codes from a string.
 * This is essential for text matching in PTY output.
 * Exported for use in unit tests that need to match text with ANSI codes.
 */
export function stripAnsi(str: string): string {
	// Use String.fromCharCode to avoid biome lint errors about control characters
	const ESC = String.fromCharCode(0x1b);
	const BEL = String.fromCharCode(0x07);
	// Remove CSI sequences (ESC[...X) and OSC sequences (ESC]...BEL)
	return str
		.replace(new RegExp(`${ESC}\\[[0-9;]*[a-zA-Z]`, "g"), "")
		.replace(new RegExp(`${ESC}\\].*?${BEL}`, "g"), "");
}

// Default timeout for PTY tests
const DEFAULT_TIMEOUT = 15000;
const STARTUP_DELAY = 2000;

/** Maximum output size (10MB) to prevent memory exhaustion in tests */
const MAX_OUTPUT_SIZE = 10 * 1024 * 1024;

export interface PtyTestResult {
	/** Write input to the terminal */
	write: (input: string) => void;
	/** Get current output (raw with ANSI codes) */
	getOutput: () => string;
	/** Get current output stripped of ANSI codes */
	getCleanOutput: () => string;
	/** Wait for process to exit */
	waitForExit: () => Promise<number>;
	/** Wait for text to appear in output (ANSI codes stripped automatically) */
	waitForText: (text: string, timeout?: number) => Promise<void>;
	/** Kill the process */
	kill: () => void;
	/** The underlying PTY instance */
	pty: IPty;
}

export interface PtyRenderOptions {
	/** Working directory for the app */
	cwd?: string;
	/** Terminal columns (default: 100) */
	cols?: number;
	/** Terminal rows (default: 30) */
	rows?: number;
	/** Environment variables */
	env?: Record<string, string>;
	/** Delay before sending input (default: 2000ms for app startup) */
	startupDelay?: number;
}

/**
 * Renders the Chorus app in a real PTY for E2E testing.
 *
 * Unlike cli-testing-library, this creates a real pseudo-terminal,
 * so useInput works properly.
 *
 * @param args - CLI arguments to pass to chorus
 * @param options - PTY render options
 * @returns PtyTestResult with helpers for interaction
 */
export function renderAppWithPty(
	args: string[] = [],
	options: PtyRenderOptions = {},
): PtyTestResult {
	const {
		cwd = process.cwd(),
		cols = 100,
		rows = 30,
		env = {},
		startupDelay = STARTUP_DELAY,
	} = options;

	const chorusPath = resolve(process.cwd(), "dist/index.js");

	let output = "";
	let exitCode: number | null = null;
	let exitResolve: ((code: number) => void) | null = null;

	// Build full argument list for node-pty
	// node-pty expects file and args separately
	const nodeArgs = [chorusPath, ...args];

	let pty: ReturnType<typeof spawn>;
	let spawnError: Error | null = null;

	try {
		pty = spawn("node", nodeArgs, {
			name: "xterm-color",
			cols,
			rows,
			cwd,
			env: {
				...process.env,
				...env,
				// Disable Node.js warnings for cleaner output
				NODE_NO_WARNINGS: "1",
				// Ensure we're not in CI mode for TTY detection
				CI: "false",
				// Force color output
				FORCE_COLOR: "1",
			},
		});

		pty.onData((data) => {
			// Limit output size to prevent memory exhaustion
			if (output.length < MAX_OUTPUT_SIZE) {
				output += data;
			}
		});

		pty.onExit(({ exitCode: code }) => {
			exitCode = code;
			if (exitResolve) {
				exitResolve(code);
			}
		});
	} catch (error) {
		// Handle spawn failures (e.g., node binary not found)
		spawnError = error instanceof Error ? error : new Error(String(error));
		output = `PTY spawn error: ${spawnError.message}`;
		exitCode = 1;
	}

	const result: PtyTestResult = {
		write(input: string) {
			if (spawnError) return; // No-op if spawn failed
			// Delay input to allow app to start up
			setTimeout(() => {
				pty.write(input);
			}, startupDelay);
		},

		getOutput() {
			return output;
		},

		getCleanOutput() {
			return stripAnsi(output);
		},

		waitForExit() {
			return new Promise((resolve) => {
				if (exitCode !== null) {
					resolve(exitCode);
				} else {
					exitResolve = resolve;
				}
			});
		},

		async waitForText(text: string, timeout = DEFAULT_TIMEOUT) {
			// If spawn failed, throw immediately with the error
			if (spawnError) {
				throw new Error(
					`PTY spawn failed: ${spawnError.message}\nCannot wait for text "${text}"`,
				);
			}

			const startTime = Date.now();

			while (Date.now() - startTime < timeout) {
				// Strip ANSI codes for reliable text matching
				const cleanOutput = stripAnsi(output);
				if (cleanOutput.includes(text)) {
					return;
				}
				await new Promise((r) => setTimeout(r, 100));
			}

			// Include both raw and clean output in error for debugging
			const cleanOutput = stripAnsi(output);
			throw new Error(
				`Timeout waiting for text "${text}" after ${timeout}ms.\nClean output:\n${cleanOutput}`,
			);
		},

		kill() {
			if (spawnError) return; // No-op if spawn failed
			pty.kill();
		},

		// biome-ignore lint/style/noNonNullAssertion: pty is undefined only when spawnError is set
		pty: pty!,
	};

	return result;
}

/**
 * Key codes for common keyboard inputs.
 * Use with pty.write() to simulate keyboard input.
 */
export const Keys = {
	// Navigation
	UP: "\u001B[A",
	DOWN: "\u001B[B",
	LEFT: "\u001B[D",
	RIGHT: "\u001B[C",
	HOME: "\u001B[H",
	END: "\u001B[F",
	PAGE_UP: "\u001B[5~",
	PAGE_DOWN: "\u001B[6~",

	// Actions
	ENTER: "\r",
	TAB: "\t",
	SHIFT_TAB: "\u001B[Z",
	ESCAPE: "\u001B",
	BACKSPACE: "\u0008",
	DELETE: "\u007F",
	REMOVE: "\u001B[3~", // Delete key on some terminals

	// Modifiers
	CTRL_C: "\u0003",
	CTRL_D: "\u0004",
	CTRL_F: "\u0006",
	CTRL_L: "\u000C",

	// Arrow keys with modifiers
	CTRL_UP: "\u001B[1;5A",
	CTRL_DOWN: "\u001B[1;5B",
	CTRL_LEFT: "\u001B[1;5D",
	CTRL_RIGHT: "\u001B[1;5C",
	META_UP: "\u001B\u001B[A",
	META_DOWN: "\u001B\u001B[B",
	META_LEFT: "\u001B\u001B[D",
	META_RIGHT: "\u001B\u001B[C",
} as const;

/**
 * Helper to send a key after a delay.
 * Useful for chaining multiple key presses.
 */
export async function sendKey(
	result: PtyTestResult,
	key: string,
	delay = 100,
): Promise<void> {
	result.pty.write(key);
	await new Promise((r) => setTimeout(r, delay));
}

/**
 * Helper to send multiple keys in sequence.
 * @internal Used for complex key sequences (export when needed)
 */
async function sendKeys(
	result: PtyTestResult,
	keys: string[],
	delay = 100,
): Promise<void> {
	for (const key of keys) {
		await sendKey(result, key, delay);
	}
}

// Suppress unused warning - intentionally keeping for future tests
void sendKeys;

/**
 * Cleanup helper - kills PTY if still running.
 */
export function cleanupPty(result: PtyTestResult): void {
	try {
		result.kill();
	} catch {
		// Ignore errors if already exited
	}
}
