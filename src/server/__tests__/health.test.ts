/**
 * Health endpoint — smoke test
 * Verifies the server boots and /api/health responds correctly.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';

// Import the Express app factory — we build the app without calling startServer()
// so no Vite or listen() side-effects happen during tests.
import { buildApp } from '../../../server';

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const app = await buildApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', app: 'OpenBook' });
    expect(typeof res.body.timestamp).toBe('string');
  });
});
