import { render } from 'ink';
import { FullScreenBox } from 'fullscreen-ink';
import App from './app.js';
import { parseArgs } from './cli.js';

// ANSI escape codes
const ENTER_ALT_SCREEN = '\x1b[?1049h';
const LEAVE_ALT_SCREEN = '\x1b[?1049l';
const CURSOR_HOME = '\x1b[H';
const CLEAR_SCREEN = '\x1b[2J';

export async function run(args: string[]): Promise<void> {
  const parsed = parseArgs(args);

  // For --version and --help, use regular render (no fullscreen)
  if (parsed.version || parsed.help) {
    const { waitUntilExit } = render(
      <App showVersion={parsed.version} showHelp={parsed.help} />
    );
    await waitUntilExit();
    return;
  }

  // Enter alternate screen and position cursor at top-left
  process.stdout.write(ENTER_ALT_SCREEN + CLEAR_SCREEN + CURSOR_HOME);

  const { waitUntilExit } = render(
    <FullScreenBox>
      <App />
    </FullScreenBox>
  );

  await waitUntilExit();
  process.stdout.write(LEAVE_ALT_SCREEN);
}

// Run if called directly
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  run(process.argv.slice(2));
}
