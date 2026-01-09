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
  const { height } = useTerminalSize();

  // Compensate for Ink's initial render newline bug (GitHub issue #808)
  // - marginTop: 1 pushes content down so top border is visible
  // - height - 1: accounts for top margin
  const adjustedHeight = Math.max(height - 1, 10);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      paddingX={1}
      width="100%"
      height={adjustedHeight}
      marginTop={1}
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
