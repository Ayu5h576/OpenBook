/**
 * books validators — focused unit tests.
 *
 * The service layer trusts these schemas to have already run, so the guards
 * that protect downstream aggregates (e.g. pages read = endPage - startPage)
 * are worth pinning down here.
 */
import { describe, it, expect } from 'vitest';
import {
  logSessionSchema,
  offersQuerySchema,
  listQuerySchema,
  libraryQuerySchema,
  DEFAULT_LIST_LIMIT,
} from '../validators/books';

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

describe('pagination query schemas', () => {
  const UUID = '11111111-1111-4111-8111-111111111111';

  it('defaults an absent limit and leaves the cursor unset', () => {
    expect(listQuerySchema.parse({})).toEqual({ limit: DEFAULT_LIST_LIMIT });
  });

  // Express hands every query param over as a string, so the coercion here is
  // what stops `take: '50'` reaching Prisma.
  it('coerces a string limit to a number', () => {
    expect(listQuerySchema.parse({ limit: '50' })).toEqual({ limit: 50 });
  });

  it('rejects a limit past the ceiling instead of clamping it', () => {
    expect(listQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
  });

  it.each(['0', '-1', '2.5', 'lots'])('rejects a limit of %s', (limit) => {
    expect(listQuerySchema.safeParse({ limit }).success).toBe(false);
  });

  it('accepts a uuid cursor and rejects anything else', () => {
    expect(listQuerySchema.parse({ cursor: UUID }).cursor).toBe(UUID);
    expect(listQuerySchema.safeParse({ cursor: 'not-a-uuid' }).success).toBe(false);
  });

  // A bad status used to reach Prisma and surface as a 500; the enum turns it
  // into a 400 at the edge.
  it('accepts a known library status and rejects an unknown one', () => {
    expect(libraryQuerySchema.parse({ status: 'READING' }).status).toBe('READING');
    expect(libraryQuerySchema.safeParse({ status: 'FINISHED' }).success).toBe(false);
  });

  it('narrows to a single book by uuid', () => {
    expect(libraryQuerySchema.parse({ bookId: UUID })).toEqual({
      bookId: UUID,
      limit: DEFAULT_LIST_LIMIT,
    });
  });
});
