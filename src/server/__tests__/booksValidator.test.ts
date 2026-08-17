/**
 * books validators — focused unit tests.
 *
 * The service layer trusts these schemas to have already run, so the guards
 * that protect downstream aggregates (e.g. pages read = endPage - startPage)
 * are worth pinning down here.
 */
import { describe, it, expect } from 'vitest';
import { logSessionSchema, offersQuerySchema } from '../validators/books';

describe('logSessionSchema', () => {
  const base = {
    startPage: 20,
    endPage: 50,
    durationSecs: 900,
    startedAt: '2026-08-17T10:00:00.000Z',
    endedAt: '2026-08-17T10:15:00.000Z',
  };

  it('accepts a well-formed forward session', () => {
    expect(logSessionSchema.parse(base)).toMatchObject({ startPage: 20, endPage: 50 });
  });

  it('accepts a session that stays on the same page', () => {
    expect(() => logSessionSchema.parse({ ...base, startPage: 40, endPage: 40 })).not.toThrow();
  });

  it('rejects a session that ends before it starts', () => {
    const result = logSessionSchema.safeParse({ ...base, startPage: 80, endPage: 50 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('endPage');
    }
  });

  it('rejects a zero-second session', () => {
    expect(logSessionSchema.safeParse({ ...base, durationSecs: 0 }).success).toBe(false);
  });
});

describe('offersQuerySchema', () => {
  it('defaults to the India storefronts when no region is given', () => {
    expect(offersQuerySchema.parse({})).toEqual({ region: 'IN' });
  });

  it('accepts a supported region', () => {
    expect(offersQuerySchema.parse({ region: 'US' })).toEqual({ region: 'US' });
  });

  it('rejects a region with no storefront table', () => {
    expect(offersQuerySchema.safeParse({ region: 'UK' }).success).toBe(false);
  });
});
