import { describe, it, expect, vi } from 'vitest';
import { run } from './index.js';

// Mock ink's render
vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    render: vi.fn(() => ({
      unmount: vi.fn(),
      waitUntilExit: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

describe('run', () => {
  it('exports a run function', () => {
    expect(typeof run).toBe('function');
  });

  it('returns a promise', () => {
    const result = run([]);
    expect(result).toBeInstanceOf(Promise);
  });
});
