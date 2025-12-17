import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      lines: 100,
      functions: 100,
      branches: 100,
      statements: 100,
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
        'src/config/database.ts',
        'src/config/redis.ts',
        'src/__tests__/helpers/test-server.ts',
      ],
    },
    globals: true,
    environment: 'node',
  },
});

