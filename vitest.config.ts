import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // The auth integration suite's beforeAll imports the whole server module
    // graph (routes -> services -> Prisma -> AI templates) through Vite's
    // module runner. On a cold cache that transform alone exceeds vitest's
    // 10s default, so the hook was timing out before buildApp() ever ran.
    hookTimeout: 60_000,
    testTimeout: 30_000,
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
