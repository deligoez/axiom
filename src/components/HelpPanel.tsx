import { Box, Text } from 'ink';

interface Shortcut {
  key: string;
  description: string;
}

const shortcuts: Shortcut[] = [
  { key: 'q', description: 'Quit' },
  { key: 's', description: 'Spawn new agent' },
  { key: 'j', description: 'Select next agent' },
  { key: 'k', description: 'Select previous agent' },
  { key: '?', description: 'Toggle this help' },
];

interface HelpPanelProps {
  visible: boolean;
}

export default function HelpPanel({ visible }: HelpPanelProps) {
  if (!visible) return null;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="yellow"
      paddingX={2}
      paddingY={1}
    >
      <Box marginBottom={1}>
        <Text bold color="yellow">Keyboard Shortcuts</Text>
      </Box>
      {shortcuts.map((shortcut) => (
        <Box key={shortcut.key}>
          <Box width={6}>
            <Text color="cyan" bold>{shortcut.key}</Text>
          </Box>
          <Text dimColor>{shortcut.description}</Text>
        </Box>
      ))}
      <Box marginTop={1}>
        <Text dimColor italic>Press ? to close</Text>
      </Box>
    </Box>
  );
}
