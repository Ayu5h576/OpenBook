import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/server/**/*.ts'],
      exclude: [
        'src/server/__tests__/**',
        'src/server/config/prisma.ts',
        'src/server/types/**',
      ],
    },
    // Load .env before any test so env.ts validation passes
    setupFiles: ['./src/server/__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
