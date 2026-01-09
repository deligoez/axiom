import { render } from 'ink';
import App from './app.js';
import { parseArgs } from './cli.js';

export async function run(args: string[]): Promise<void> {
  const parsed = parseArgs(args);

  const { waitUntilExit } = render(
    <App showVersion={parsed.version} showHelp={parsed.help} />
  );

  await waitUntilExit();
}

// Run if called directly
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  run(process.argv.slice(2));
}
