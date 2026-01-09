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
  const selectedAgentId = useAgentStore((state) => state.selectedAgentId);
  const selectAgent = useAgentStore((state) => state.selectAgent);
  const { spawn, killAll } = useAgentManager();

  const handleExit = async () => {
    await killAll();
    onExit?.();
    exit();
  };

  const handleSpawn = async () => {
    const agentNumber = agents.length + 1;
    const agent = await spawn({
      name: `demo-agent-${agentNumber}`,
      command: 'bash',
      args: ['-c', 'for i in {1..5}; do echo "Output line $i"; sleep 1; done'],
    });
    // Auto-select the new agent if none selected
    if (!selectedAgentId) {
      selectAgent(agent.id);
    }
  };

  const handleNavigate = (direction: 'next' | 'prev') => {
    if (agents.length === 0) return;

    const currentIndex = agents.findIndex((a) => a.id === selectedAgentId);
    let nextIndex: number;

    if (currentIndex === -1) {
      // No selection, select first
      nextIndex = 0;
    } else if (direction === 'next') {
      nextIndex = (currentIndex + 1) % agents.length;
    } else {
      nextIndex = (currentIndex - 1 + agents.length) % agents.length;
    }

    selectAgent(agents[nextIndex].id);
  };

  useKeyboard({ onQuit: handleExit, onSpawn: handleSpawn, onNavigate: handleNavigate });

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
      <MainContent agents={agents} selectedAgentId={selectedAgentId} />
    </Layout>
  );
}
