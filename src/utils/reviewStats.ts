/**
 * Pure helpers for member review ratings.
 *
 * These live apart from the components because vitest runs with
 * `environment: 'node'` and no DOM testing library, so a plain module is the
 * only part of this feature that can actually be covered by tests.
 */

/** Lowest and highest rating the server accepts (`upsertReviewSchema`). */
export const MIN_RATING = 0.5;
export const MAX_RATING = 5;
/** The server enforces `multipleOf(0.5)`, so the UI must too. */
export const RATING_STEP = 0.5;

/**
 * Coerce a rating to a number.
 *
 * `Review.rating` is `Decimal(3,1)`, which Prisma serializes to JSON as a
 * string. Without this, `"4.5"` leaks into the UI and any arithmetic on it
 * silently concatenates instead of adding.
 */
export function normalizeRating(rating: number | string | null | undefined): number {
  const n = typeof rating === 'number' ? rating : Number(rating);
  return Number.isFinite(n) ? n : 0;
}

/** Clamp to the accepted range and snap to the nearest half star. */
export function clampRating(rating: number): number {
  if (!Number.isFinite(rating)) return MIN_RATING;
  const snapped = Math.round(rating / RATING_STEP) * RATING_STEP;
  return Math.min(MAX_RATING, Math.max(MIN_RATING, snapped));
}

/**
 * Mean of the given ratings, to one decimal place, or `null` when there are
 * none — a book with no member reviews has no member score, and showing `0`
 * would read as unanimous loathing.
 */
export function averageRating(
  reviews: Array<{ rating: number | string }>
): number | null {
  if (!reviews.length) return null;
  const total = reviews.reduce((sum, r) => sum + normalizeRating(r.rating), 0);
  return Math.round((total / reviews.length) * 10) / 10;
}
