import { useState, useEffect } from 'react';
import { useStdout } from 'ink';

interface TerminalSize {
  width: number;
  height: number;
}

const DEFAULT_WIDTH = 80;
const DEFAULT_HEIGHT = 24;

export function useTerminalSize(): TerminalSize {
  const { stdout } = useStdout();

  const getSize = (): TerminalSize => ({
    width: stdout.columns ?? DEFAULT_WIDTH,
    height: stdout.rows ?? DEFAULT_HEIGHT,
  });

  const [size, setSize] = useState<TerminalSize>(getSize);

  useEffect(() => {
    const handleResize = () => {
      setSize(getSize());
    };

    stdout.on('resize', handleResize);

    return () => {
      stdout.off('resize', handleResize);
    };
  }, [stdout]);

  return size;
}
