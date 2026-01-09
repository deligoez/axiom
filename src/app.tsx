import { Box, Text, useApp } from 'ink';
import Layout from './components/Layout.js';
import MainContent from './components/MainContent.js';
import { useKeyboard } from './hooks/useKeyboard.js';
import { useAgentStore } from './stores/agentStore.js';

interface AppProps {
  showVersion?: boolean;
  showHelp?: boolean;
  onExit?: () => void;
}

export default function App({ showVersion, showHelp, onExit }: AppProps) {
  const { exit } = useApp();
  const agents = useAgentStore((state) => state.agents);

  const handleExit = () => {
    onExit?.();
    exit();
  };

  useKeyboard({ onQuit: handleExit });

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
    <Layout>
      <MainContent agents={agents} />
    </Layout>
  );
}
