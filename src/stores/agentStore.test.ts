import { describe, it, expect, beforeEach } from 'vitest';
import { useAgentStore, type AgentStore } from './agentStore.js';

describe('agentStore', () => {
  beforeEach(() => {
    // Reset store between tests
    useAgentStore.setState({
      agents: [],
      selectedAgentId: null,
    });
  });

  it('starts with empty agents', () => {
    const { agents } = useAgentStore.getState();
    expect(agents).toEqual([]);
  });

  it('adds an agent', () => {
    const { addAgent } = useAgentStore.getState();

    addAgent({
      id: 'agent-1',
      name: 'test-agent',
      status: 'idle',
      output: [],
      createdAt: new Date(),
    });

    const { agents } = useAgentStore.getState();
    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe('test-agent');
  });

  it('updates agent status', () => {
    const { addAgent, updateAgent } = useAgentStore.getState();

    addAgent({
      id: 'agent-1',
      name: 'test',
      status: 'idle',
      output: [],
      createdAt: new Date(),
    });

    updateAgent('agent-1', { status: 'running' });

    const { agents } = useAgentStore.getState();
    expect(agents[0].status).toBe('running');
  });

  it('appends output to agent', () => {
    const { addAgent, appendOutput } = useAgentStore.getState();

    addAgent({
      id: 'agent-1',
      name: 'test',
      status: 'running',
      output: [],
      createdAt: new Date(),
    });

    appendOutput('agent-1', 'line 1');
    appendOutput('agent-1', 'line 2');

    const { agents } = useAgentStore.getState();
    expect(agents[0].output).toEqual(['line 1', 'line 2']);
  });

  it('removes an agent', () => {
    const { addAgent, removeAgent } = useAgentStore.getState();

    addAgent({
      id: 'agent-1',
      name: 'test',
      status: 'idle',
      output: [],
      createdAt: new Date(),
    });

    removeAgent('agent-1');

    const { agents } = useAgentStore.getState();
    expect(agents).toHaveLength(0);
  });

  it('selects an agent', () => {
    const { addAgent, selectAgent } = useAgentStore.getState();

    addAgent({
      id: 'agent-1',
      name: 'test',
      status: 'idle',
      output: [],
      createdAt: new Date(),
    });

    selectAgent('agent-1');

    const { selectedAgentId } = useAgentStore.getState();
    expect(selectedAgentId).toBe('agent-1');
  });

  it('gets selected agent', () => {
    const { addAgent, selectAgent, getSelectedAgent } = useAgentStore.getState();

    addAgent({
      id: 'agent-1',
      name: 'selected-agent',
      status: 'idle',
      output: [],
      createdAt: new Date(),
    });

    selectAgent('agent-1');

    const selected = getSelectedAgent();
    expect(selected?.name).toBe('selected-agent');
  });
});
