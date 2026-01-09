import { useState, useEffect } from 'react';
import { Box } from 'ink';
import type { ReactNode } from 'react';
import StatusBar from './StatusBar.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';

interface LayoutProps {
  children: ReactNode;
  agentCount?: number;
  taskCount?: number;
  status?: string;
}

export default function Layout({ children, agentCount, taskCount, status }: LayoutProps) {
  const { height } = useTerminalSize();
  const [isFirstRender, setIsFirstRender] = useState(true);

  // Workaround for Ink's initial render newline bug (GitHub issue #808)
  // Initial render has extra newline that scrolls content up.
  // After first render, Ink behaves correctly so we remove the compensation.
  useEffect(() => {
    const timer = setTimeout(() => setIsFirstRender(false), 50);
    return () => clearTimeout(timer);
  }, []);

  const marginTop = isFirstRender ? 1 : 0;
  const adjustedHeight = Math.max(height - marginTop, 10);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      paddingX={1}
      width="100%"
      height={adjustedHeight}
      marginTop={marginTop}
    >
      <StatusBar agentCount={agentCount} taskCount={taskCount} status={status} />
      <Box borderStyle="single" borderTop={false} borderLeft={false} borderRight={false}>
        {/* Separator line */}
      </Box>
      <Box flexGrow={1} paddingY={1}>
        {children}
      </Box>
    </Box>
  );
}
