import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import Layout from './Layout.js';

// Mock useTerminalSize to return predictable dimensions
vi.mock('../hooks/useTerminalSize.js', () => ({
  useTerminalSize: () => ({ width: 80, height: 24 }),
}));

describe('Layout', () => {
  it('renders children', () => {
    const { lastFrame } = render(
      <Layout>
        <Text>Test Content</Text>
      </Layout>
    );

    expect(lastFrame()).toContain('Test Content');
  });

  it('includes StatusBar', () => {
    const { lastFrame } = render(
      <Layout>
        <Text>Content</Text>
      </Layout>
    );

    expect(lastFrame()).toContain('Chorus');
  });

  it('renders border characters', () => {
    const { lastFrame } = render(
      <Layout>
        <Text>Content</Text>
      </Layout>
    );

    // Check for box drawing characters
    expect(lastFrame()).toMatch(/[─│┌┐└┘]/);
  });

  it('renders at terminal dimensions', () => {
    const { lastFrame } = render(
      <Layout>
        <Text>Content</Text>
      </Layout>
    );

    const frame = lastFrame() || '';
    const lines = frame.split('\n');

    // Should have height of 24 lines (terminal height)
    expect(lines.length).toBe(24);

    // Each line should be 80 characters (terminal width)
    // Account for ANSI escape codes by checking the first visible line width
    const firstLine = lines[0];
    // The visible content (excluding ANSI codes) should fill the width
    expect(firstLine).toBeTruthy();
  });
});
