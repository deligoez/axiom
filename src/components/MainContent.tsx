import { Box, Text } from 'ink';
import type { Agent, AgentStatus } from '../types/agent.js';

interface MainContentProps {
  agents: Agent[];
  selectedAgentId?: string | null;
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

export default function MainContent({ agents, selectedAgentId }: MainContentProps) {
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
      {agents.map((agent) => {
        const isSelected = agent.id === selectedAgentId;
        return (
          <Box
            key={agent.id}
            flexDirection="column"
            borderStyle={isSelected ? 'double' : 'single'}
            borderColor={isSelected ? 'cyan' : undefined}
            paddingX={1}
          >
            <Box gap={1}>
              {isSelected && <Text color="cyan">►</Text>}
              <StatusIndicator status={agent.status} />
              <Text bold color={isSelected ? 'cyan' : 'green'}>{agent.name}</Text>
            </Box>
            <Box flexDirection="column">
              {agent.output.map((line, index) => (
                <Text key={index}>{line}</Text>
              ))}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
