import { Box, Text } from 'ink';

interface StatusBarProps {
  agentCount?: number;
  status?: string;
}

export default function StatusBar({ agentCount, status }: StatusBarProps) {
  return (
    <Box justifyContent="space-between" paddingX={1}>
      <Box gap={2}>
        <Text bold color="cyan">Chorus</Text>
        {agentCount !== undefined && (
          <Text dimColor>{agentCount} agent{agentCount !== 1 ? 's' : ''}</Text>
        )}
        {status && <Text color="yellow">{status}</Text>}
      </Box>
      <Text dimColor>Press q to quit</Text>
    </Box>
  );
}
