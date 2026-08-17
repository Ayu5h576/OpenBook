/**
 * Storefront catalog — declarative deep-link table.
 *
 * These entries drive every "link-only" offer on the book spread's purchase page.
 * They exist because no free API returns live retail prices for these stores:
 * Amazon's Product Advertising API requires an approved Associates account with
 * qualifying sales, and Flipkart's affiliate program is closed to new signups.
 * Until credentials exist we can still send the reader to the right search page,
 * which is honest and useful — we just can't quote a number.
 *
 * A store graduates from here to a real `PriceProvider` (see priceService.ts) by
 * adding one provider file; nothing in the UI has to change.
 */

export type Region = 'IN' | 'US';

export type OfferFormat = 'paperback' | 'hardcover' | 'ebook' | 'audiobook' | 'any';

/** The subset of book fields a storefront URL builder is allowed to read. */
export interface StorefrontBook {
  title: string;
  authors: string[];
  isbn10?: string | null;
  isbn13?: string | null;
}

export interface Storefront {
  platform: string;
  label: string;
  regions: Region[];
  format: OfferFormat;
  /** Display order among link-only offers (lower first). */
  order: number;
  /** True for stores that lend rather than sell — surfaced differently in the UI. */
  free?: boolean;
  buildUrl: (book: StorefrontBook) => string;
}

export const REGION_CURRENCY: Record<Region, string> = {
  IN: 'INR',
  US: 'USD',
};

/**
 * Best available search term: ISBN-13 is unambiguous, ISBN-10 next, then a
 * title + author string for books Google Books had no identifier for.
 */
export function searchTerm(book: StorefrontBook): string {
  if (book.isbn13) return book.isbn13;
  if (book.isbn10) return book.isbn10;
  const author = book.authors?.[0];
  return author ? `${book.title} ${author}` : book.title;
}

/** True when we have an ISBN, i.e. the deep link will land on an exact edition. */
export function hasIsbn(book: StorefrontBook): boolean {
  return Boolean(book.isbn13 || book.isbn10);
}

const q = (value: string) => encodeURIComponent(value);

export const STOREFRONTS: Storefront[] = [
  // ── India ──────────────────────────────────────────────────────────────────
  {
    platform: 'amazonIn',
    label: 'Amazon.in',
    regions: ['IN'],
    format: 'paperback',
    order: 1,
    buildUrl: (b) => `https://www.amazon.in/s?k=${q(searchTerm(b))}&i=stripbooks`,
  },
  {
    platform: 'kindleIn',
    label: 'Kindle Store',
    regions: ['IN'],
    format: 'ebook',
    order: 2,
    buildUrl: (b) => `https://www.amazon.in/s?k=${q(searchTerm(b))}&i=digital-text`,
  },
  {
    platform: 'flipkart',
    label: 'Flipkart',
    regions: ['IN'],
    format: 'paperback',
    order: 3,
    buildUrl: (b) => `https://www.flipkart.com/search?q=${q(searchTerm(b))}`,
  },
  {
    platform: 'audibleIn',
    label: 'Audible',
    regions: ['IN'],
    format: 'audiobook',
    order: 6,
    buildUrl: (b) => `https://www.audible.in/search?keywords=${q(searchTerm(b))}`,
  },

  // ── United States ──────────────────────────────────────────────────────────
  {
    platform: 'amazonUs',
    label: 'Amazon.com',
    regions: ['US'],
    format: 'paperback',
    order: 1,
    buildUrl: (b) => `https://www.amazon.com/s?k=${q(searchTerm(b))}&i=stripbooks`,
  },
  {
    platform: 'kindleUs',
    label: 'Kindle Store',
    regions: ['US'],
    format: 'ebook',
    order: 2,
    buildUrl: (b) => `https://www.amazon.com/s?k=${q(searchTerm(b))}&i=digital-text`,
  },
  {
    platform: 'barnesNoble',
    label: 'Barnes & Noble',
    regions: ['US'],
    format: 'paperback',
    order: 3,
    buildUrl: (b) => `https://www.barnesandnoble.com/s/${q(searchTerm(b))}`,
  },
  {
    platform: 'bookshopOrg',
    label: 'Bookshop.org',
    regions: ['US'],
    format: 'paperback',
    order: 4,
    buildUrl: (b) => `https://bookshop.org/search?keywords=${q(searchTerm(b))}`,
  },
  {
    platform: 'audibleUs',
    label: 'Audible',
    regions: ['US'],
    format: 'audiobook',
    order: 6,
    buildUrl: (b) => `https://www.audible.com/search?keywords=${q(searchTerm(b))}`,
  },

  // ── Everywhere ─────────────────────────────────────────────────────────────
  {
    platform: 'abebooks',
    label: 'AbeBooks',
    regions: ['IN', 'US'],
    format: 'any',
    order: 7,
    buildUrl: (b) =>
      hasIsbn(b)
        ? `https://www.abebooks.com/servlet/SearchResults?isbn=${q(b.isbn13 ?? b.isbn10 ?? '')}`
        : `https://www.abebooks.com/servlet/SearchResults?kn=${q(searchTerm(b))}`,
  },
  {
    platform: 'openLibrary',
    label: 'Open Library',
    regions: ['IN', 'US'],
    format: 'ebook',
    order: 8,
    free: true,
    buildUrl: (b) =>
      hasIsbn(b)
        ? `https://openlibrary.org/isbn/${q(b.isbn13 ?? b.isbn10 ?? '')}`
        : `https://openlibrary.org/search?q=${q(searchTerm(b))}`,
  },
];

export function storefrontsForRegion(region: Region): Storefront[] {
  return STOREFRONTS.filter((s) => s.regions.includes(region)).sort((a, b) => a.order - b.order);
}
