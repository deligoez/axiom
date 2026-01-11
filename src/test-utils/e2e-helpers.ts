/**
 * E2E testing helpers for Chorus TUI
 *
 * Uses cli-testing-library for spawning and testing the CLI application.
 */

import { resolve } from "node:path";
import type { RenderResult } from "cli-testing-library";
import {
	cleanup as cliCleanup,
	render as cliRender,
	waitFor,
} from "cli-testing-library";

// Default timeout for E2E tests (longer than unit tests)
const DEFAULT_TIMEOUT = 10000;
const DEFAULT_INTERVAL = 100;

export type AppRenderResult = RenderResult;

/**
 * Renders the Chorus app for E2E testing.
 *
 * @param args - Optional CLI arguments to pass to chorus
 * @param cwd - Working directory for the app (defaults to current working dir)
 * @returns RenderResult with process and query helpers
 */
export async function renderApp(
	args: string[] = [],
	cwd?: string,
): Promise<AppRenderResult> {
	// Use dist/index.js as the entry point (compiled from src/index.tsx)
	const chorusPath = resolve(process.cwd(), "dist/index.js");

	return cliRender("node", [chorusPath, ...args], {
		cwd: cwd ?? process.cwd(),
	});
}

/**
 * Waits for specific text to appear in the app output.
 *
 * @param result - The render result from renderApp
 * @param text - Text to wait for
 * @param timeout - Optional timeout in ms (default: 10000)
 */
export async function waitForText(
	result: AppRenderResult,
	text: string,
	timeout = DEFAULT_TIMEOUT,
): Promise<void> {
	await waitFor(
		() => {
			const output = result.getStdallStr();
			if (!output.includes(text)) {
				throw new Error(`Text "${text}" not found in output`);
			}
		},
		{
			instance: result,
			timeout,
			interval: DEFAULT_INTERVAL,
		},
	);
}

/**
 * Presses a single key in the app.
 *
 * @param result - The render result from renderApp
 * @param key - Key to press (e.g., 'j', 'k', 'Enter', 'Escape')
 */
export async function pressKey(
	result: AppRenderResult,
	key: string,
): Promise<void> {
	await result.userEvent.keyboard(key);
}

/**
 * Presses a sequence of keys in the app.
 *
 * @public - Used in E2E tests (E2E-01 through E2E-40)
 * @param result - The render result from renderApp
 * @param keys - Array of keys to press in sequence
 * @param delayMs - Optional delay between keys in ms (default: 50)
 */
export async function pressKeys(
	result: AppRenderResult,
	keys: string[],
	delayMs = 50,
): Promise<void> {
	for (const key of keys) {
		await pressKey(result, key);
		if (delayMs > 0) {
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
	}
}

/**
 * Gets the current output of the app.
 *
 * @param result - The render result from renderApp
 * @returns Current stdout + stderr content
 */
export function getOutput(result: AppRenderResult): string {
	return result.getStdallStr();
}

/**
 * Checks if the app has exited.
 *
 * @param result - The render result from renderApp
 * @returns Exit info or null if still running
 */
export function hasExited(
	result: AppRenderResult,
): { exitCode: number } | null {
	return result.hasExit();
}

/**
 * Waits for the app to exit.
 *
 * @public - Used in E2E tests (E2E-16, E2E-39, E2E-40)
 * @param result - The render result from renderApp
 * @param timeout - Optional timeout in ms (default: 10000)
 * @returns Exit code
 */
export async function waitForExit(
	result: AppRenderResult,
	timeout = DEFAULT_TIMEOUT,
): Promise<number> {
	let exitInfo: { exitCode: number } | null = null;

	await waitFor(
		() => {
			exitInfo = result.hasExit();
			if (!exitInfo) {
				throw new Error("App has not exited yet");
			}
		},
		{
			instance: result,
			timeout,
			interval: DEFAULT_INTERVAL,
		},
	);

	// exitInfo is guaranteed to be set after waitFor resolves
	if (!exitInfo) {
		throw new Error("Unexpected: exitInfo is null after waitFor");
	}
	return (exitInfo as { exitCode: number }).exitCode;
}

/**
 * Cleans up all spawned processes.
 * Should be called in afterEach or test teardown.
 */
export async function cleanup(): Promise<void> {
	await cliCleanup();
}

/**
 * Debug helper - prints current output to console.
 *
 * @public - Used for debugging E2E tests
 * @param result - The render result from renderApp
 * @param maxLength - Optional max output length (default: 7000)
 */
export function debug(result: AppRenderResult, maxLength = 7000): void {
	result.debug(maxLength);
}
