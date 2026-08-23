/**
 * reviewStats — unit tests
 *
 * The Decimal-string coercion is the load-bearing one: `Review.rating` is
 * `Decimal(3,1)`, so it crosses the wire as `"4.5"` and any arithmetic on the
 * raw value concatenates instead of adding.
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeRating,
  clampRating,
  averageRating,
  MIN_RATING,
  MAX_RATING,
} from '../reviewStats';

describe('normalizeRating', () => {
  it('coerces the Decimal string Prisma actually sends', () => {
    expect(normalizeRating('4.5')).toBe(4.5);
    expect(normalizeRating('5.0')).toBe(5);
  });

  it('passes real numbers through', () => {
    expect(normalizeRating(3.5)).toBe(3.5);
  });

  it('falls back to 0 rather than NaN', () => {
    // NaN would poison an average and render as "NaN" on the page.
    expect(normalizeRating(null)).toBe(0);
    expect(normalizeRating(undefined)).toBe(0);
    expect(normalizeRating('not a rating')).toBe(0);
  });
});

describe('clampRating', () => {
  it('snaps to the nearest half star', () => {
    expect(clampRating(3.7)).toBe(3.5);
    expect(clampRating(3.8)).toBe(4);
    expect(clampRating(4.25)).toBe(4.5);
  });

  it('holds the range the server validates', () => {
    expect(clampRating(0)).toBe(MIN_RATING);
    expect(clampRating(-2)).toBe(MIN_RATING);
    expect(clampRating(9)).toBe(MAX_RATING);
  });

  it('survives garbage', () => {
    expect(clampRating(NaN)).toBe(MIN_RATING);
  });
});

describe('averageRating', () => {
  it('averages Decimal strings and numbers alike', () => {
    expect(averageRating([{ rating: '4' }, { rating: '5' }])).toBe(4.5);
    expect(averageRating([{ rating: 4 }, { rating: '5' }])).toBe(4.5);
  });

  it('rounds to one decimal place', () => {
    // 4 + 5 + 5 = 14 / 3 = 4.666… → 4.7, not 4.666666666666667
    expect(averageRating([{ rating: 4 }, { rating: 5 }, { rating: 5 }])).toBe(4.7);
  });

  it('returns null for a book with no member reviews', () => {
    // Not 0 — an empty list means "no score", and 0 would read as unanimous
    // loathing next to the Google Books aggregate.
    expect(averageRating([])).toBeNull();
  });
});
