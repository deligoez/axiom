import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/e2e/**/*.e2e.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
    // Use forks pool for E2E tests to avoid node-pty native module conflicts
    pool: 'forks',
    // Run E2E tests sequentially to prevent node-pty resource conflicts
    maxConcurrency: 1,
    // Longer timeout for E2E tests that spawn PTY processes
    testTimeout: 30000,
  },
});
