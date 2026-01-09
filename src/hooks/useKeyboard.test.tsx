import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { useKeyboard } from './useKeyboard.js';

// Test component that uses the hook
function TestComponent({ onQuit }: { onQuit: () => void }) {
  useKeyboard({ onQuit });
  return null;
}

describe('useKeyboard', () => {
  it('calls onQuit when q is pressed', () => {
    const onQuit = vi.fn();
    const { stdin } = render(<TestComponent onQuit={onQuit} />);

    stdin.write('q');

    expect(onQuit).toHaveBeenCalledTimes(1);
  });

  it('calls onQuit when ctrl+c is pressed', () => {
    const onQuit = vi.fn();
    const { stdin } = render(<TestComponent onQuit={onQuit} />);

    stdin.write('\x03'); // Ctrl+C

    expect(onQuit).toHaveBeenCalledTimes(1);
  });

  it('does not call onQuit for other keys', () => {
    const onQuit = vi.fn();
    const { stdin } = render(<TestComponent onQuit={onQuit} />);

    stdin.write('a');
    stdin.write('b');
    stdin.write('x');

    expect(onQuit).not.toHaveBeenCalled();
  });
});
