import { Box, Text } from 'ink';

interface AppProps {
  showVersion?: boolean;
  showHelp?: boolean;
}

export default function App({ showVersion, showHelp }: AppProps) {
  if (showVersion) {
    return <Text>0.1.0</Text>;
  }

  if (showHelp) {
    return (
      <Box flexDirection="column">
        <Text bold>Usage: chorus [options]</Text>
        <Text> </Text>
        <Text>Options:</Text>
        <Text>  -v, --version  Show version</Text>
        <Text>  -h, --help     Show help</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">Chorus</Text>
      <Text dimColor>Multi-agent development orchestration</Text>
    </Box>
  );
}
