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

  it('emits exit event when process exits naturally', async () => {
    const exitEvents: { id: string; code: number | null }[] = [];
    manager.on('exit', (id, code) => {
      exitEvents.push({ id, code });
    });

    const agent = await manager.spawn({
      name: 'exit-test',
      command: 'echo',
      args: ['done'],
    });

    // Wait for process to exit
    await new Promise(r => setTimeout(r, 150));

    expect(exitEvents).toHaveLength(1);
    expect(exitEvents[0].id).toBe(agent.id);
    expect(exitEvents[0].code).toBe(0);
  });

  it('sets exitCode after process exits', async () => {
    const agent = await manager.spawn({
      name: 'exitcode-test',
      command: 'echo',
      args: ['test'],
    });

    // Wait for process to exit
    await new Promise(r => setTimeout(r, 150));

    const found = manager.get(agent.id);
    expect(found?.exitCode).toBe(0);
    expect(found?.status).toBe('stopped');
  });

  it('emits error event for invalid command', async () => {
    const errors: { id: string; error: Error }[] = [];
    manager.on('error', (id, error) => {
      errors.push({ id, error });
    });

    const agent = await manager.spawn({
      name: 'error-test',
      command: 'nonexistent-command-that-does-not-exist',
    });

    // Wait for error
    await new Promise(r => setTimeout(r, 150));

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].id).toBe(agent.id);
  });

  it('captures stderr output', async () => {
    const outputs: string[] = [];
    manager.on('output', (id, line) => {
      outputs.push(line);
    });

    await manager.spawn({
      name: 'stderr-test',
      command: 'sh',
      args: ['-c', 'echo "error message" >&2'],
    });

    // Wait for output
    await new Promise(r => setTimeout(r, 150));

    expect(outputs).toContain('error message');
  });

  it('handles killing non-existent agent gracefully', async () => {
    // Should not throw
    await expect(manager.kill('non-existent-id')).resolves.toBeUndefined();
  });

  it('stores agent pid after spawn', async () => {
    const agent = await manager.spawn({
      name: 'pid-test',
      command: 'sleep',
      args: ['10'],
    });

    expect(agent.pid).toBeDefined();
    expect(typeof agent.pid).toBe('number');
  });
});
