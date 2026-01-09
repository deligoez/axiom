import { Box } from 'ink';
import type { ReactNode } from 'react';
import StatusBar from './StatusBar.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';

interface LayoutProps {
  children: ReactNode;
  agentCount?: number;
  status?: string;
}

export default function Layout({ children, agentCount, status }: LayoutProps) {
  const { width, height } = useTerminalSize();

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      paddingX={1}
      width={width}
      height={height}
    >
      <StatusBar agentCount={agentCount} status={status} />
      <Box borderStyle="single" borderTop={false} borderLeft={false} borderRight={false}>
        {/* Separator line */}
      </Box>
      <Box flexGrow={1} paddingY={1}>
        {children}
      </Box>
    </Box>
  );
}
