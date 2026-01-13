#!/usr/bin/env node
import { FullScreenBox } from "fullscreen-ink";
import { Box, render, Text } from "ink";
// biome-ignore lint/correctness/noUnusedImports: Required for tsx JSX runtime
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
					<Text> chorus [command] [options]</Text>
				</Box>

				{/* Commands */}
				<Box flexDirection="column">
					<Text bold>COMMANDS</Text>
					<Text>
						{" "}
						<Text color="green">init</Text>
						{"          "}Initialize Chorus in current directory
					</Text>
					<Text>
						{" "}
						<Text color="green">plan</Text>
						{"          "}Start planning mode
					</Text>
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
					<Text>
						{" "}
						<Text color="yellow">--mode &lt;mode&gt;</Text>
						{"  "}Execution mode (semi-auto | autopilot)
					</Text>
					<Text>
						{" "}
						<Text color="yellow">--ci</Text>
						{"            "}Run in CI mode (non-interactive)
					</Text>
				</Box>

				{/* Examples */}
				<Box flexDirection="column">
					<Text bold>EXAMPLES</Text>
					<Text dimColor> $ chorus</Text>
					<Text> Start interactive session</Text>
					<Text dimColor> $ chorus init</Text>
					<Text> Initialize new project</Text>
					<Text dimColor> $ chorus --mode autopilot</Text>
					<Text> Start in fully autonomous mode</Text>
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

	// CI mode: non-interactive render for E2E testing (no TTY required)
	if (parsed.ci) {
		const { waitUntilExit } = render(
			<App
				projectRoot={projectRoot}
				cliArgs={{
					command: parsed.command as "init" | "plan" | undefined,
					mode: parsed.mode as "semi-auto" | "autopilot" | undefined,
				}}
			/>,
		);
		await waitUntilExit();
		return;
	}

	// Enter alternate screen and position cursor at top-left
	process.stdout.write(ENTER_ALT_SCREEN + CLEAR_SCREEN + CURSOR_HOME);

	const { waitUntilExit } = render(
		<FullScreenBox>
			<App
				projectRoot={projectRoot}
				cliArgs={{
					command: parsed.command as "init" | "plan" | undefined,
					mode: parsed.mode as "semi-auto" | "autopilot" | undefined,
				}}
			/>
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
