import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import App from './app.js';
import { useAgentStore } from './stores/agentStore.js';
import type { Agent } from './types/agent.js';

const createTestAgent = (overrides: Partial<Agent> = {}): Agent => ({
  id: 'test-1',
  name: 'test-agent',
  status: 'running',
  output: [],
  createdAt: new Date(),
  ...overrides,
});

describe('App', () => {
  beforeEach(() => {
    useAgentStore.setState({ agents: [], selectedAgentId: null });
  });
  it('renders welcome message', () => {
    const { lastFrame } = render(<App />);

    expect(lastFrame()).toContain('Chorus');
  });

  it('displays version when showVersion is true', () => {
    const { lastFrame } = render(<App showVersion />);

    expect(lastFrame()).toContain('0.1.0');
  });

  it('displays help when showHelp is true', () => {
    const { lastFrame } = render(<App showHelp />);

    expect(lastFrame()).toContain('Usage');
  });

  it('shows empty state in TUI mode', () => {
    const { lastFrame } = render(<App />);

    expect(lastFrame()).toContain('No agents running');
  });

  it('shows quit hint in TUI mode', () => {
    const { lastFrame } = render(<App />);

    expect(lastFrame()).toContain('q');
  });

  it('calls onExit when q is pressed', () => {
    const onExit = vi.fn();
    const { stdin } = render(<App onExit={onExit} />);

    stdin.write('q');

    expect(onExit).toHaveBeenCalled();
  });

  it('displays agents from store', () => {
    useAgentStore.setState({
      agents: [createTestAgent({ name: 'my-agent', output: ['Hello'] })],
      selectedAgentId: null,
    });

    const { lastFrame } = render(<App />);

    expect(lastFrame()).toContain('my-agent');
    expect(lastFrame()).toContain('Hello');
  });
});
