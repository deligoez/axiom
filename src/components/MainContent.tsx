import { Box, Text } from 'ink';
import type { Agent, AgentStatus } from '../types/agent.js';

interface MainContentProps {
  agents: Agent[];
}

function StatusIndicator({ status }: { status: AgentStatus }) {
  switch (status) {
    case 'running':
      return <Text color="green">●</Text>;
    case 'stopped':
      return <Text color="gray">○</Text>;
    case 'error':
      return <Text color="red">✗</Text>;
    default:
      return <Text color="yellow">◌</Text>;
  }
}

export default function MainContent({ agents }: MainContentProps) {
  if (agents.length === 0) {
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center">
        <Text dimColor>No agents running</Text>
        <Text dimColor>Press 's' to start an agent</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={1}>
      {agents.map((agent) => (
        <Box key={agent.id} flexDirection="column" borderStyle="single" paddingX={1}>
          <Box gap={1}>
            <StatusIndicator status={agent.status} />
            <Text bold color="green">{agent.name}</Text>
          </Box>
          <Box flexDirection="column">
            {agent.output.map((line, index) => (
              <Text key={index}>{line}</Text>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
