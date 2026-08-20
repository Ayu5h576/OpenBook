/**
 * Apple Books pricing via the public iTunes Search API.
 *
 * This is the second live retail price OpenBook can quote without approval-gated
 * affiliate credentials (Google Play being the first). It is deliberately narrow:
 *
 *  - **US only.** `country=IN` returns unrelated free public-domain titles, never
 *    the Apple Books IN catalog, so quoting from it would be worse than a link.
 *  - **Search, never ISBN lookup.** `lookup?isbn=…` returns the *wrong* book
 *    outright (querying 9780061122415 — The Alchemist — yields "Skinny Bitch").
 *    We search by title + author and then *verify the match ourselves* before
 *    trusting any price (see matchAppleResult).
 *
 * Like every price path in this app it never synthesizes a number: if no returned
 * result passes the title+author check, the provider contributes nothing.
 */
import { createHash } from 'crypto';
import { cacheService } from '../cache/cacheService';
import { Region } from './storefronts';

const ITUNES_SEARCH = 'https://itunes.apple.com/search';
const APPLE_TTL_MS = 6 * 60 * 60 * 1000; // 6h — retail prices are volatile
const MAX_RESULTS = 5;

export interface AppleBooksOffer {
  /** 0 when Apple lists the title as free. */
  price: number;
  currency: string;
  url: string;
  free: boolean;
}

/** One row of the iTunes Search response, trimmed to what we read. */
interface ItunesResult {
  trackName?: string;
  artistName?: string;
  price?: number;
  currency?: string;
  trackViewUrl?: string;
  kind?: string;
}

// ─── Matching ───────────────────────────────────────────────────────────────

/**
 * Normalize for comparison: fold case and diacritics, drop punctuation, collapse
 * whitespace. "Ursula K. Le Guin" → "ursula k le guin".
 */
function norm(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * The title without its subtitle. Real editions mark a subtitle with a separator
 * (":", " - ", " — ", "("); a sequel like "Dune Messiah" has none, which is
 * exactly the distinction we need so "Dune" doesn't match "Dune Messiah".
 */
function mainTitle(title: string): string {
  return title.split(/[:(]|\s[-—]\s/)[0];
}

/** Does the iTunes artist string credit one of the book's authors? */
function authorMatches(authors: string[], artistName: string): boolean {
  const artistTokens = new Set(norm(artistName).split(' ').filter(Boolean));
  return authors.some((author) => {
    // Surname is the strongest single token: it survives "Ursula K. Le Guin"
    // vs "Le Guin, Ursula" reorderings and initial-only middle names.
    const surname = norm(author).split(' ').filter(Boolean).pop();
    return Boolean(surname && surname.length >= 3 && artistTokens.has(surname));
  });
}

/**
 * Pick the result that is genuinely this book, or null.
 *
 * An exact full-title match wins outright; failing that, a main-title match
 * (same title, different subtitle/edition) is accepted. Either way the author
 * must line up — a title alone is far too weak given how many study guides and
 * graphic-novel adaptations share a name. Ebooks only; audiobooks price
 * differently and belong to a different card.
 */
export function matchAppleResult(
  book: { title: string; authors: string[] },
  results: ItunesResult[]
): ItunesResult | null {
  const ours = norm(book.title);
  const ourMain = norm(mainTitle(book.title));
  const authors = book.authors ?? [];

  const eligible = results.filter(
    (r) =>
      r.kind === 'ebook' &&
      typeof r.price === 'number' &&
      Number.isFinite(r.price) &&
      r.price >= 0 &&
      Boolean(r.trackViewUrl) &&
      Boolean(r.trackName) &&
      authorMatches(authors, r.artistName ?? '')
  );

  // Exact title first, then a same-main-title edition. Apple's own relevance
  // order breaks ties, so the plain edition beats the graphic-novel adaptation.
  return (
    eligible.find((r) => norm(r.trackName!) === ours) ??
    eligible.find((r) => norm(mainTitle(r.trackName!)) === ourMain) ??
    null
  );
}

// ─── Service ──────────────────────────────────────────────────────────────────

function cacheKey(parts: unknown[]): string {
  const hash = createHash('sha1').update(JSON.stringify(parts)).digest('hex');
  return `apple:${hash}`;
}

export class AppleBooksService {
  /**
   * Live Apple Books ebook price for a book, or null.
   *
   * Returns null (never throws) on a non-US region, a network/parse failure, or
   * no confidently-matched result — a flaky third party must not empty the
   * purchase page.
   */
  async getEbookOffer(
    book: { title: string; authors: string[] },
    region: Region
  ): Promise<AppleBooksOffer | null> {
    if (region !== 'US') return null;
    if (!book.title?.trim()) return null;

    const term = [book.title, book.authors?.[0]].filter(Boolean).join(' ');

    // Envelope the null: cacheService treats a bare cached null as a miss, so a
    // book Apple simply doesn't carry would be re-fetched on every request.
    const { offer } = await cacheService.getOrSet<{ offer: AppleBooksOffer | null }>(
      cacheKey([norm(term), region]),
      APPLE_TTL_MS,
      async () => {
        try {
          const url =
            `${ITUNES_SEARCH}?term=${encodeURIComponent(term)}` +
            `&country=US&media=ebook&entity=ebook&limit=${MAX_RESULTS}`;
          const res = await fetch(url);
          if (!res.ok) return { offer: null };

          const data = (await res.json()) as { results?: ItunesResult[] };
          const hit = matchAppleResult(book, data.results ?? []);
          if (!hit) return { offer: null };

          const price = hit.price as number;
          return {
            offer: {
              price,
              currency: hit.currency ?? 'USD',
              // Drop iTunes' affiliate/analytics query so the link is clean.
              url: hit.trackViewUrl!.split('?')[0],
              free: price === 0,
            },
          };
        } catch (err) {
          console.error(`[AppleBooksService] search failed for "${term}":`, err);
          return { offer: null };
        }
      }
    );

    return offer;
  }
}

export const appleBooksService = new AppleBooksService();
