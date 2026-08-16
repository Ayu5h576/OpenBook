/**
 * Global test setup — loads environment before any test module imports env.ts
 */
import 'dotenv/config';

// Ensure test-specific database URL takes priority so we never hit the prod DB
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
} else if (process.env.DATABASE_URL) {
  // Integration tests write real rows. Without TEST_DATABASE_URL they land in
  // whatever DATABASE_URL points at — usually the local dev database.
  console.warn(
    '[test setup] TEST_DATABASE_URL is not set — integration tests will run against ' +
      'DATABASE_URL (your dev database) and will create rows in it. ' +
      'Set TEST_DATABASE_URL in .env to use a throwaway database instead.'
  );
}

// Minimal required env for tests that don't hit the DB
process.env.JWT_SECRET ??= 'test-secret-for-vitest-only-do-not-use-in-production';
process.env.ACCESS_TOKEN_TTL ??= '15m';
process.env.REFRESH_TOKEN_TTL_DAYS ??= '30';
process.env.API_PORT ??= '3099';
process.env.NODE_ENV ??= 'test';
process.env.APP_URL ??= 'http://localhost:3099';
