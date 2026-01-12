import { FullScreenBox } from "fullscreen-ink";
import { Box, render, Text } from "ink";
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
			<Box flexDirection="column">
				<Text bold>Usage: chorus [options] [command]</Text>
				<Text> </Text>
				<Text>Commands:</Text>
				<Text> init Initialize Chorus in current directory</Text>
				<Text> plan Start planning mode</Text>
				<Text> </Text>
				<Text>Options:</Text>
				<Text> -v, --version Show version</Text>
				<Text> -h, --help Show help</Text>
				<Text>
					{" "}
					--mode &lt;mode&gt; Set execution mode (semi-auto | autopilot)
				</Text>
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
