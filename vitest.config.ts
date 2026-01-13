import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    // Exclude integration tests from default run - they call real Claude CLI
    exclude: ['src/**/*.integration.test.{ts,tsx}', 'node_modules/**'],
    setupFiles: ['./vitest.setup.ts'],
    // Performance optimizations
    pool: 'threads', // Faster than 'forks' for most cases
    maxConcurrency: 20, // Allow more concurrent tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/test-utils/**',
        '**/e2e/**',
        '**/integration/**',
        '**/*.integration.test.ts',
      ],
      thresholds: {
        branches: 60,
        lines: 60,
        functions: 60,
        statements: 60,
      },
      all: true,
    },
  },
});
