import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import MainContent from './MainContent.js';

describe('MainContent', () => {
  it('shows welcome message when no agents', () => {
    const { lastFrame } = render(<MainContent agents={[]} />);

    expect(lastFrame()).toContain('No agents running');
  });

  it('shows hint to start agents', () => {
    const { lastFrame } = render(<MainContent agents={[]} />);

    expect(lastFrame()).toContain('start');
  });

  it('renders agent output when agents exist', () => {
    const agents = [
      { id: '1', name: 'agent-1', output: 'Hello from agent 1' },
    ];
    const { lastFrame } = render(<MainContent agents={agents} />);

    expect(lastFrame()).toContain('agent-1');
    expect(lastFrame()).toContain('Hello from agent 1');
  });

  it('renders multiple agents', () => {
    const agents = [
      { id: '1', name: 'agent-1', output: 'Output 1' },
      { id: '2', name: 'agent-2', output: 'Output 2' },
    ];
    const { lastFrame } = render(<MainContent agents={agents} />);

    expect(lastFrame()).toContain('agent-1');
    expect(lastFrame()).toContain('agent-2');
  });
});
