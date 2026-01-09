import { render } from 'ink';
import { withFullScreen } from 'fullscreen-ink';
import App from './app.js';
import { parseArgs } from './cli.js';

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

  // Use fullscreen mode for main TUI
  const app = withFullScreen(<App />);
  await app.start();
  await app.waitUntilExit();
}

// Run if called directly
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  run(process.argv.slice(2));
}
