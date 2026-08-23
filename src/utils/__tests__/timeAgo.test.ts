/**
 * timeAgo — unit tests
 *
 * This helper was inlined in four views before it was extracted, and the copies
 * disagreed about sub-minute wording and about when to give up on relative
 * counts. Both readings are still in use, so both are pinned here.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { timeAgo } from '../timeAgo';

/** Build an ISO string `secs` seconds before the faked clock. */
const ago = (secs: number) => new Date(Date.now() - secs * 1000).toISOString();

const HOUR = 3600;
const DAY = 24 * HOUR;

function freezeClock() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-22T12:00:00.000Z'));
}

afterEach(() => {
  vi.useRealTimers();
});

describe('timeAgo', () => {
  it('counts seconds, minutes, hours and days', () => {
    freezeClock();

    expect(timeAgo(ago(5))).toBe('5s ago');
    expect(timeAgo(ago(90))).toBe('1m ago');
    expect(timeAgo(ago(2 * HOUR))).toBe('2h ago');
    expect(timeAgo(ago(3 * DAY))).toBe('3d ago');
  });

  it('never reads "0s ago" for a row created this instant', () => {
    freezeClock();

    // Clamped to 1s: a just-saved review should not render a zero, and clock
    // skew between server and browser must not produce a negative count.
    expect(timeAgo(ago(0))).toBe('1s ago');
    expect(timeAgo(new Date(Date.now() + 5000).toISOString())).toBe('1s ago');
  });

  it('falls back to an absolute date after a week by default', () => {
    freezeClock();

    expect(timeAgo(ago(6 * DAY))).toBe('6d ago');
    expect(timeAgo(ago(8 * DAY))).toBe(new Date(ago(8 * DAY)).toLocaleDateString());
  });

  it('says "just now" under a minute when asked (activity sidebar)', () => {
    freezeClock();

    expect(timeAgo(ago(5), { granularity: 'justNow' })).toBe('just now');
    expect(timeAgo(ago(59), { granularity: 'justNow' })).toBe('just now');
    expect(timeAgo(ago(90), { granularity: 'justNow' })).toBe('1m ago');
  });

  it('keeps counting days when absoluteAfterDays is Infinity (activity sidebar)', () => {
    freezeClock();

    expect(timeAgo(ago(400 * DAY), { absoluteAfterDays: Infinity })).toBe('400d ago');
  });

  it('returns an empty string for an unparseable date', () => {
    expect(timeAgo('not a date')).toBe('');
  });
});
