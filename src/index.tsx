#!/usr/bin/env node
import { FullScreenBox } from "fullscreen-ink";
import { Box, render, Text } from "ink";
// biome-ignore lint/correctness/noUnusedImports: React must be in scope for tsx JSX runtime
import React from "react";
import { App } from "./App.js";
import { parseArgs } from "./cli.js";

// ANSI escape codes
const ENTER_ALT_SCREEN = "\x1b[?1049h";
const LEAVE_ALT_SCREEN = "\x1b[?1049l";
const CURSOR_HOME = "\x1b[H";
const CLEAR_SCREEN = "\x1b[2J";

export async function run(args: string[]): Promise<void> {
	const parsed = parseArgs(args);
	const projectRoot = process.cwd();

	// For --version, show version and exit
	if (parsed.version) {
		const { waitUntilExit } = render(<Text>0.1.0</Text>);
		await waitUntilExit();
		return;
	}

	// For --help, show usage and exit
	if (parsed.help) {
		const { waitUntilExit } = render(
			<Box flexDirection="column" gap={1}>
				{/* Header */}
				<Box flexDirection="column">
					<Text bold color="cyan">
						Chorus v0.1.0
					</Text>
					<Text dimColor>
						Multi-agent TUI orchestrator for AI coding agents
					</Text>
				</Box>

				{/* Usage */}
				<Box flexDirection="column">
					<Text bold>USAGE</Text>
					<Text> chorus [options]</Text>
				</Box>

				{/* Options */}
				<Box flexDirection="column">
					<Text bold>OPTIONS</Text>
					<Text>
						{" "}
						<Text color="yellow">-v, --version</Text>
						{"   "}Show version
					</Text>
					<Text>
						{" "}
						<Text color="yellow">-h, --help</Text>
						{"      "}Show this help
					</Text>
				</Box>

				{/* Examples */}
				<Box flexDirection="column">
					<Text bold>EXAMPLES</Text>
					<Text dimColor> $ chorus</Text>
					<Text> Start interactive TUI</Text>
					<Text dimColor> $ chorus --version</Text>
					<Text> Show version number</Text>
				</Box>

				{/* Footer */}
				<Box flexDirection="column">
					<Text bold>DOCUMENTATION</Text>
					<Text color="blue"> https://github.com/deligoez/chorus</Text>
				</Box>
			</Box>,
		);
		await waitUntilExit();
		return;
	}

	// Check for interactive terminal before starting TUI
	// Ink requires raw mode which only works in TTY
	const isTTY = process.stdin?.isTTY || process.stdout?.isTTY;
	if (!isTTY) {
		console.error(
			"Error: Chorus requires an interactive terminal.\n" +
				"Run 'chorus' directly in a terminal, not in a pipe or script.",
		);
		process.exit(1);
	}

	// Enter alternate screen and position cursor at top-left
	process.stdout.write(ENTER_ALT_SCREEN + CLEAR_SCREEN + CURSOR_HOME);

	const { waitUntilExit } = render(
		<FullScreenBox>
			<App projectRoot={projectRoot} />
		</FullScreenBox>,
	);

	await waitUntilExit();
	process.stdout.write(LEAVE_ALT_SCREEN);
}

// Run if called directly
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
	run(process.argv.slice(2));
}
