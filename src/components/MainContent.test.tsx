import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import MainContent from './MainContent.js';
import type { Agent } from '../types/agent.js';

const createTestAgent = (overrides: Partial<Agent> = {}): Agent => ({
  id: 'test-1',
  name: 'test-agent',
  status: 'running',
  output: [],
  createdAt: new Date(),
  ...overrides,
});

describe('MainContent', () => {
  it('shows welcome message when no agents', () => {
    const { lastFrame } = render(<MainContent agents={[]} />);

    expect(lastFrame()).toContain('No agents running');
  });

  it('shows hint to start agents', () => {
    const { lastFrame } = render(<MainContent agents={[]} />);

    expect(lastFrame()).toContain('start');
  });

  it('renders agent name when agents exist', () => {
    const agents = [createTestAgent({ id: '1', name: 'agent-1' })];
    const { lastFrame } = render(<MainContent agents={agents} />);

    expect(lastFrame()).toContain('agent-1');
  });

  it('renders agent output lines', () => {
    const agents = [
      createTestAgent({
        id: '1',
        name: 'agent-1',
        output: ['Line 1', 'Line 2', 'Line 3'],
      }),
    ];
    const { lastFrame } = render(<MainContent agents={agents} />);

    expect(lastFrame()).toContain('Line 1');
    expect(lastFrame()).toContain('Line 2');
    expect(lastFrame()).toContain('Line 3');
  });

  it('renders multiple agents', () => {
    const agents = [
      createTestAgent({ id: '1', name: 'agent-1', output: ['Output 1'] }),
      createTestAgent({ id: '2', name: 'agent-2', output: ['Output 2'] }),
    ];
    const { lastFrame } = render(<MainContent agents={agents} />);

    expect(lastFrame()).toContain('agent-1');
    expect(lastFrame()).toContain('agent-2');
  });

  it('shows status indicator for running agent', () => {
    const agents = [createTestAgent({ status: 'running' })];
    const { lastFrame } = render(<MainContent agents={agents} />);

    expect(lastFrame()).toMatch(/running|●/i);
  });

  it('shows status indicator for stopped agent', () => {
    const agents = [createTestAgent({ status: 'stopped' })];
    const { lastFrame } = render(<MainContent agents={agents} />);

    expect(lastFrame()).toMatch(/stopped|○/i);
  });

  it('shows status indicator for error agent', () => {
    const agents = [createTestAgent({ status: 'error' })];
    const { lastFrame } = render(<MainContent agents={agents} />);

    expect(lastFrame()).toMatch(/error|✗/i);
  });
});
