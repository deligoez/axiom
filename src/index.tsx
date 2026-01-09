import { render } from 'ink';
import App from './app.js';
import { parseArgs } from './cli.js';

// ANSI escape codes for alternate screen buffer (like vim, htop)
const ENTER_ALT_SCREEN = '\x1b[?1049h';
const LEAVE_ALT_SCREEN = '\x1b[?1049l';
const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';

export async function run(args: string[]): Promise<void> {
  const parsed = parseArgs(args);

  // For --version and --help, don't use alternate screen
  const useAltScreen = !parsed.version && !parsed.help;

  const restoreTerminal = () => {
    if (useAltScreen) {
      process.stdout.write(SHOW_CURSOR + LEAVE_ALT_SCREEN);
    }
  };

  // Ensure terminal is restored on unexpected exit
  const handleExit = () => {
    restoreTerminal();
    process.exit(0);
  };

  if (useAltScreen) {
    process.stdout.write(ENTER_ALT_SCREEN + HIDE_CURSOR);
    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);
  }

  const { waitUntilExit } = render(
    <App showVersion={parsed.version} showHelp={parsed.help} />
  );

  await waitUntilExit();
  restoreTerminal();
}

// Run if called directly
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  run(process.argv.slice(2));
}
