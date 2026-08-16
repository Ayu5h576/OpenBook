/**
 * Auth routes — integration tests
 *
 * These tests run against the real Express app (built via buildApp()).
 * They need a DATABASE_URL (set TEST_DATABASE_URL in your .env for local dev,
 * or the GitHub Actions CI sets it via the Postgres service container).
 *
 * Tests are marked with skip guards so they degrade gracefully when no DB is
 * available (unit test environments, contributors who haven't set up Postgres).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

const HAS_DB = !!process.env.DATABASE_URL;
const itWithDb = HAS_DB ? it : it.skip;

let app: Express;

beforeAll(async () => {
  if (!HAS_DB) return;
  const { buildApp } = await import('../../../server');
  app = await buildApp();
});

// Use a unique email per test run to avoid conflicts across parallel runs
const testEmail = () => `ci-${Date.now()}-${Math.random().toString(36).slice(2)}@openbook.test`;

// Helper: register a fresh user and return the response
async function registerUser(email: string, password = 'Password123!') {
  return request(app).post('/api/auth/register').send({
    email,
    password,
    confirmPassword: password,
    username: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  });
}

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    itWithDb('creates a new account and returns 201 with tokens', async () => {
      const res = await registerUser(testEmail());
      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.session.accessToken).toBeTruthy();
    });

    itWithDb('returns 409 when email is already registered', async () => {
      const email = testEmail();
      await registerUser(email);
      const res = await registerUser(email);
      expect(res.status).toBe(409);
    });

    itWithDb('returns 400 for missing required fields', async () => {
      const res = await request(app).post('/api/auth/register').send({ email: 'bad' });
      expect(res.status).toBe(400);
    });

    itWithDb('returns 400 when passwords do not match', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: testEmail(),
        password: 'Password123!',
        confirmPassword: 'DifferentPass1!',
        username: `user_${Date.now()}`,
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    itWithDb('returns 200 with tokens for correct credentials', async () => {
      const email = testEmail();
      const password = 'Password123!';
      await registerUser(email, password);

      const res = await request(app).post('/api/auth/login').send({ email, password });
      expect(res.status).toBe(200);
      expect(res.body.session.accessToken).toBeTruthy();
    });

    itWithDb('returns 401 for wrong password', async () => {
      const email = testEmail();
      await registerUser(email, 'RealPassword1!');

      const res = await request(app).post('/api/auth/login').send({ email, password: 'wrong' });
      expect(res.status).toBe(401);
    });

    itWithDb('returns 401 for unknown email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nobody@openbook.test',
        password: 'whatever',
      });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    itWithDb('returns 401 without Authorization header', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    itWithDb('returns 200 with a valid access token', async () => {
      const email = testEmail();
      const regRes = await registerUser(email);
      const { accessToken } = regRes.body.session;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(email);
    });
  });

  describe('POST /api/auth/logout', () => {
    itWithDb('returns 200 and clears the session', async () => {
      const email = testEmail();
      const regRes = await registerUser(email);
      const { accessToken } = regRes.body.session;

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
    });
  });
});
