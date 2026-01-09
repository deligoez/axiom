import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentManager } from './AgentManager.js';

describe('AgentManager', () => {
  let manager: AgentManager;

  beforeEach(() => {
    manager = new AgentManager();
  });

  afterEach(async () => {
    await manager.killAll();
  });

  it('starts with no agents', () => {
    expect(manager.list()).toEqual([]);
  });

  it('spawns an agent', async () => {
    const agent = await manager.spawn({
      name: 'test-agent',
      command: 'echo',
      args: ['hello'],
    });

    expect(agent.name).toBe('test-agent');
    expect(agent.status).toBe('running');
    expect(manager.list()).toHaveLength(1);
  });

  it('gets agent by id', async () => {
    const agent = await manager.spawn({
      name: 'find-me',
      command: 'echo',
      args: ['test'],
    });

    const found = manager.get(agent.id);
    expect(found?.name).toBe('find-me');
  });

  it('returns undefined for unknown id', () => {
    expect(manager.get('unknown')).toBeUndefined();
  });

  it('kills an agent', async () => {
    const agent = await manager.spawn({
      name: 'kill-me',
      command: 'sleep',
      args: ['10'],
    });

    await manager.kill(agent.id);

    const found = manager.get(agent.id);
    expect(found?.status).toBe('stopped');
  });

  it('kills all agents', async () => {
    await manager.spawn({ name: 'a1', command: 'sleep', args: ['10'] });
    await manager.spawn({ name: 'a2', command: 'sleep', args: ['10'] });

    await manager.killAll();

    const agents = manager.list();
    expect(agents.every(a => a.status === 'stopped')).toBe(true);
  });

  it('emits output events', async () => {
    const outputs: string[] = [];
    manager.on('output', (id, line) => {
      outputs.push(line);
    });

    await manager.spawn({
      name: 'output-test',
      command: 'echo',
      args: ['hello world'],
    });

    // Wait for output
    await new Promise(r => setTimeout(r, 100));

    expect(outputs).toContain('hello world');
  });
});
