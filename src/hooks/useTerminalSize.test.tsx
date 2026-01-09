import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { EventEmitter } from 'events';

// Create a mock stdout that's an EventEmitter with columns/rows
class MockStdout extends EventEmitter {
  columns: number | undefined = 120;
  rows: number | undefined = 40;
}

const mockStdout = new MockStdout();

vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    useStdout: () => ({
      stdout: mockStdout,
      write: vi.fn(),
    }),
  };
});

import { useTerminalSize } from './useTerminalSize.js';

// Test component that displays the terminal size
function TestComponent() {
  const { width, height } = useTerminalSize();
  return <Text>{`${width}x${height}`}</Text>;
}

describe('useTerminalSize', () => {
  beforeEach(() => {
    mockStdout.columns = 120;
    mockStdout.rows = 40;
    mockStdout.removeAllListeners();
  });

  it('returns terminal width and height', () => {
    const { lastFrame } = render(<TestComponent />);

    expect(lastFrame()).toBe('120x40');
  });

  it('returns default values when stdout dimensions are undefined', () => {
    mockStdout.columns = undefined;
    mockStdout.rows = undefined;

    const { lastFrame } = render(<TestComponent />);

    // Default to 80x24 (standard terminal size)
    expect(lastFrame()).toBe('80x24');
  });

  it('returns 0 values when stdout dimensions are 0', () => {
    mockStdout.columns = 0;
    mockStdout.rows = 0;

    const { lastFrame } = render(<TestComponent />);

    // 0 is a valid (if unusual) value, should be returned
    expect(lastFrame()).toBe('0x0');
  });

  it('updates on resize', async () => {
    const { lastFrame } = render(<TestComponent />);

    expect(lastFrame()).toBe('120x40');

    // Simulate resize
    mockStdout.columns = 200;
    mockStdout.rows = 60;
    mockStdout.emit('resize');

    // Wait for re-render
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(lastFrame()).toBe('200x60');
  });
});
