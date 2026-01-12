import { defineConfig } from 'vitest/config';

/**
 * Vitest config for integration tests that call real Claude CLI.
 *
 * These tests are SLOW and require:
 * - Claude CLI installed and configured
 * - Valid API key
 * - Network access
 *
 * Run with: npm run test:integration
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.integration.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
    // Longer timeout for real CLI calls
    testTimeout: 60000,
    // Run sequentially to avoid rate limits
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
