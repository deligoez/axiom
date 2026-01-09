import { describe, it, expect } from 'vitest';
import { createAgent, type Agent, type AgentStatus, type AgentConfig } from './agent.js';

describe('Agent types', () => {
  it('Agent has required properties', () => {
    const agent: Agent = {
      id: 'agent-1',
      name: 'test-agent',
      status: 'running',
      output: [],
      createdAt: new Date(),
    };

    expect(agent.id).toBe('agent-1');
    expect(agent.name).toBe('test-agent');
    expect(agent.status).toBe('running');
    expect(agent.output).toEqual([]);
  });

  it('AgentStatus includes all states', () => {
    const statuses: AgentStatus[] = ['idle', 'running', 'stopped', 'error'];

    expect(statuses).toContain('idle');
    expect(statuses).toContain('running');
    expect(statuses).toContain('stopped');
    expect(statuses).toContain('error');
  });

  it('AgentConfig has command and optional args', () => {
    const config: AgentConfig = {
      name: 'my-agent',
      command: 'echo',
      args: ['hello'],
      cwd: '/tmp',
    };

    expect(config.command).toBe('echo');
    expect(config.args).toEqual(['hello']);
  });

  it('AgentConfig works without optional fields', () => {
    const config: AgentConfig = {
      name: 'simple-agent',
      command: 'node',
    };

    expect(config.name).toBe('simple-agent');
    expect(config.args).toBeUndefined();
  });

  it('createAgent creates agent with defaults', () => {
    const agent = createAgent({
      name: 'test',
      command: 'echo',
    });

    expect(agent.id).toBeDefined();
    expect(agent.name).toBe('test');
    expect(agent.status).toBe('idle');
    expect(agent.output).toEqual([]);
    expect(agent.createdAt).toBeInstanceOf(Date);
  });
});
