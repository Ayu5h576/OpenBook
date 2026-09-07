/**
 * Relative timestamps ("3h ago").
 *
 * This was copy-pasted into four files before it lived here, and the copies had
 * drifted apart in two ways: the activity sidebar said "just now" for anything
 * under a minute and counted days forever, while the club and community feeds
 * said "42s ago" and fell back to an absolute date after a week. Both readings
 * are deliberate for their surface, so they survive as options rather than one
 * of them silently winning.
 */

export interface TimeAgoOptions {
  /** Under one minute: `'seconds'` → "42s ago", `'justNow'` → "just now". */
  granularity?: 'seconds' | 'justNow';
  /**
   * Days after which to show a locale date instead of a relative count.
   * `Infinity` keeps counting days indefinitely.
   */
  absoluteAfterDays?: number;
}

export function timeAgo(iso: string, opts: TimeAgoOptions = {}): string {
  const { granularity = 'seconds', absoluteAfterDays = 7 } = opts;

  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';

  // Clamp to 1s so a just-created row never reads "0s ago", and so clock skew
  // between server and browser can't produce a negative count.
  const secs = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return granularity === 'justNow' ? 'just now' : `${secs}s ago`;

  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;

  const days = Math.floor(hrs / 24);
  if (days < absoluteAfterDays) return `${days}d ago`;

  return new Date(iso).toLocaleDateString();
}
