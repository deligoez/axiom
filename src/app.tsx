import { Box, Text, useApp } from 'ink';
import Layout from './components/Layout.js';
import MainContent from './components/MainContent.js';
import { useKeyboard } from './hooks/useKeyboard.js';
import { useAgentManager } from './hooks/useAgentManager.js';
import { useAgentStore } from './stores/agentStore.js';

interface AppProps {
  showVersion?: boolean;
  showHelp?: boolean;
  onExit?: () => void;
}

export default function App({ showVersion, showHelp, onExit }: AppProps) {
  const { exit } = useApp();
  const agents = useAgentStore((state) => state.agents);
  const { spawn, killAll } = useAgentManager();

  const handleExit = async () => {
    await killAll();
    onExit?.();
    exit();
  };

  const handleSpawn = () => {
    const agentNumber = agents.length + 1;
    spawn({
      name: `demo-agent-${agentNumber}`,
      command: 'bash',
      args: ['-c', 'for i in {1..5}; do echo "Output line $i"; sleep 1; done'],
    });
  };

  useKeyboard({ onQuit: handleExit, onSpawn: handleSpawn });

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
