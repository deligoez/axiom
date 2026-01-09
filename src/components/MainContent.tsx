import { Box, Text } from 'ink';

export interface Agent {
  id: string;
  name: string;
  output: string;
}

interface MainContentProps {
  agents: Agent[];
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
          <Text bold color="green">{agent.name}</Text>
          <Text>{agent.output}</Text>
        </Box>
      ))}
    </Box>
  );
}
