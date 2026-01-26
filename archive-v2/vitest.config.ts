import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    // Exclude integration tests and e2e tests from default run
    exclude: [
      'src/**/*.integration.test.{ts,tsx}',
      'src/e2e/**',
      'node_modules/**',
    ],
    setupFiles: ['./vitest.setup.ts'],
    // Performance optimizations for unit tests
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
