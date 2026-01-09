import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import Layout from './Layout.js';

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
});
