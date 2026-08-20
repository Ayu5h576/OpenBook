import { createHash } from 'crypto';
import { prisma } from '../config/prisma';
import { cacheService } from '../cache/cacheService';
import { NotFoundError, ServerError } from '../utils/errors';

const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1';

// Google Books is an external, quota-limited API and volume metadata is
// effectively immutable, so responses are worth caching hard.
const SEARCH_TTL_MS = 60 * 60 * 1000; // 1 hour
const VOLUME_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
// Prices move, unlike volume metadata, so keep this window short.
const SALE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Build a cache key by hashing the parts.
 *
 * The file-cache backend sanitizes keys with /[^a-z0-9]/gi -> '-', which would
 * make raw search queries collide ("a b" and "a-b" both become "a-b") and serve
 * one query's results for another. Hashing keeps keys collision-free and
 * unaffected by that sanitization.
 */
function booksCacheKey(kind: string, parts: unknown[]): string {
  const hash = createHash('sha1').update(JSON.stringify(parts)).digest('hex');
  return `gbooks:${kind}:${hash}`;
}

interface GoogleImageLinks {
  smallThumbnail?: string;
  thumbnail?: string;
  small?: string;
  medium?: string;
  large?: string;
  extraLarge?: string;
}

interface GoogleMoney {
  amount?: number;
  currencyCode?: string;
}

interface GoogleSaleInfo {
  country?: string;
  saleability?: string;
  isEbook?: boolean;
  listPrice?: GoogleMoney;
  retailPrice?: GoogleMoney;
  buyLink?: string;
}

interface GoogleVolume {
  id: string;
  volumeInfo: {
    title: string;
    subtitle?: string;
    authors?: string[];
    description?: string;
    imageLinks?: GoogleImageLinks;
    pageCount?: number;
    categories?: string[];
    language?: string;
    publisher?: string;
    publishedDate?: string;
    industryIdentifiers?: { type: string; identifier: string }[];
    averageRating?: number;
    ratingsCount?: number;
  };
  saleInfo?: GoogleSaleInfo;
}

/**
 * Rewrite a Google Books image URL to the size we actually render.
 *
 * `zoom` is the whole story: 1 is 128px wide, 2 is ~300px, 0 is the full scan
 * (~1744px, ~400KB). Both builders below used to force `zoom=0`, so a shelf of
 * twelve cards pulled several megabytes of cover art to draw thumbnails.
 * `edge=curl` paints a fake page-curl into the bitmap, which reads as an artifact
 * once the image sits inside our own framed card.
 */
function normalizeImageUrl(raw: string, zoom: 0 | 2): string {
  return raw
    .replace('http://', 'https://')
    .replace(/([?&])zoom=\d+/, `$1zoom=${zoom}`)
    .replace(/([?&])edge=curl/, '$1edge=none');
}

/**
 * True for volumes Google has no scan of, whose every image size resolves to the
 * "image not available" grey box — served with a 200, so nothing downstream can
 * detect it from the response. `…AAAACAAJ` ids are library-catalogue imports;
 * `…AAAAQBAJ` ids are publisher-supplied ebooks with real art. Storing undefined
 * instead lets the client fall through to Open Library or a drawn cover.
 */
function isPlaceholderVolume(volumeId: string): boolean {
  return /CAAJ$/.test(volumeId);
}

function buildCoverUrl(imageLinks?: GoogleImageLinks): string | undefined {
  const raw = imageLinks?.thumbnail ?? imageLinks?.smallThumbnail;
  if (!raw) return undefined;
  return normalizeImageUrl(raw, 2);
}

/**
 * Highest-resolution cover Google offers for this volume.
 *
 * The thumbnail sizes used for cards look soft when a cover is displayed large
 * (the scrapbook page shows it at several hundred pixels), so prefer the biggest
 * link present. Only `thumbnail`/`smallThumbnail` are guaranteed to exist.
 */
function buildLargeCoverUrl(imageLinks?: GoogleImageLinks): string | undefined {
  const raw =
    imageLinks?.extraLarge ??
    imageLinks?.large ??
    imageLinks?.medium ??
    imageLinks?.small ??
    imageLinks?.thumbnail ??
    imageLinks?.smallThumbnail;
  if (!raw) return undefined;
  return normalizeImageUrl(raw, 0);
}

function extractIsbn(ids?: { type: string; identifier: string }[]) {
  return {
    isbn10: ids?.find((i) => i.type === 'ISBN_10')?.identifier,
    isbn13: ids?.find((i) => i.type === 'ISBN_13')?.identifier,
  };
}

export interface GoogleBookResult {
  googleBooksId: string;
  title: string;
  subtitle?: string;
  authors: string[];
  description?: string;
  coverImage?: string;
  /** Largest cover Google exposes; undefined when no image links at all. */
  largeCoverImage?: string;
  pageCount?: number;
  categories: string[];
  language: string;
  publisher?: string;
  publishedDate?: string;
  isbn10?: string;
  isbn13?: string;
  averageRating?: number;
  ratingsCount: number;
}

function mapVolume(v: GoogleVolume): GoogleBookResult {
  const { isbn10, isbn13 } = extractIsbn(v.volumeInfo.industryIdentifiers);
  const hasArt = !isPlaceholderVolume(v.id);
  return {
    googleBooksId: v.id,
    title: v.volumeInfo.title,
    subtitle: v.volumeInfo.subtitle,
    authors: v.volumeInfo.authors ?? [],
    description: v.volumeInfo.description,
    coverImage: hasArt ? buildCoverUrl(v.volumeInfo.imageLinks) : undefined,
    largeCoverImage: hasArt ? buildLargeCoverUrl(v.volumeInfo.imageLinks) : undefined,
    pageCount: v.volumeInfo.pageCount,
    categories: v.volumeInfo.categories ?? [],
    language: v.volumeInfo.language ?? 'en',
    publisher: v.volumeInfo.publisher,
    publishedDate: v.volumeInfo.publishedDate,
    isbn10,
    isbn13,
    averageRating: v.volumeInfo.averageRating,
    ratingsCount: v.volumeInfo.ratingsCount ?? 0,
  };
}

async function fetchGoogle(path: string): Promise<any> {
  // Use '?' when path has no query string yet, '&' when it already does
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const key = apiKey ? `${path.includes('?') ? '&' : '?'}key=${apiKey}` : '';
  const url = `${GOOGLE_BOOKS_API}${path}${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new ServerError(`Google Books API error: ${res.status}`);
  return res.json();
}

export interface VolumeSaleInfo {
  saleability: string;
  isEbook: boolean;
  /** Present only when the volume is actually for sale in the requested country. */
  price?: number;
  currency?: string;
  buyLink?: string;
}

export class BookService {
  async searchBooks(
    q: string,
    type: 'title' | 'author' | 'isbn' | 'category',
    startIndex: number,
    maxResults: number
  ): Promise<{ items: GoogleBookResult[]; totalItems: number }> {
    const prefix = { title: 'intitle:', author: 'inauthor:', isbn: 'isbn:', category: 'subject:' }[type];
    const cacheKey = booksCacheKey('search', [type, q.trim().toLowerCase(), startIndex, maxResults]);

    return cacheService.getOrSet(cacheKey, SEARCH_TTL_MS, async () => {
      const query = encodeURIComponent(`${prefix}${q}`);
      const data = await fetchGoogle(`/volumes?q=${query}&startIndex=${startIndex}&maxResults=${maxResults}&printType=books`);
      return {
        items: (data.items ?? []).map(mapVolume),
        totalItems: data.totalItems ?? 0,
      };
    });
  }

  async getGoogleBook(googleBooksId: string): Promise<GoogleBookResult> {
    return cacheService.getOrSet(booksCacheKey('volume', [googleBooksId]), VOLUME_TTL_MS, async () => {
      const data = await fetchGoogle(`/volumes/${googleBooksId}`);
      return mapVolume(data as GoogleVolume);
    });
  }

  async importBook(googleBooksId: string) {
    // Return existing record if already imported
    const existing = await prisma.book.findUnique({ where: { googleBooksId } });
    if (existing) return existing;

    const vol = await this.getGoogleBook(googleBooksId);

    return prisma.book.create({
      data: {
        googleBooksId: vol.googleBooksId,
        title: vol.title,
        subtitle: vol.subtitle,
        authors: vol.authors,
        description: vol.description,
        coverImage: vol.coverImage,
        pageCount: vol.pageCount,
        categories: vol.categories,
        language: vol.language,
        publisher: vol.publisher,
        publishedDate: vol.publishedDate,
        isbn10: vol.isbn10,
        isbn13: vol.isbn13,
        averageRating: vol.averageRating,
        ratingsCount: vol.ratingsCount,
      },
    });
  }

  async getBookById(id: string) {
    const book = await prisma.book.findUnique({ where: { id } });
    if (!book) throw new NotFoundError('Book');
    return book;
  }

  /**
   * Google Play Books pricing for a volume in a given country.
   *
   * This is the only live retail price OpenBook can obtain without paid or
   * approval-gated affiliate credentials, so it is the one priced card the
   * purchase page can show today.
   *
   * Returns null rather than throwing on any failure: Google answers 403
   * (`unsupportedCountry`) for some regions and `fetchGoogle` turns every
   * non-2xx into a ServerError, which must not take down the whole spread.
   * Prices are per-country, so `country` is part of the cache key.
   */
  async getVolumeSaleInfo(googleBooksId: string, country: string): Promise<VolumeSaleInfo | null> {
    const cacheKey = booksCacheKey('sale', [googleBooksId, country]);

    // Wrapped in an envelope because cacheService treats a cached `null` as a
    // miss — a book that simply isn't for sale would otherwise be re-fetched on
    // every request.
    const { sale } = await cacheService.getOrSet<{ sale: VolumeSaleInfo | null }>(
      cacheKey,
      SALE_TTL_MS,
      async () => {
        try {
          const data = await fetchGoogle(
            `/volumes/${encodeURIComponent(googleBooksId)}?country=${encodeURIComponent(country)}`
          );
          const raw: GoogleSaleInfo | undefined = (data as GoogleVolume).saleInfo;
          if (!raw) return { sale: null };

          // retailPrice is what the buyer actually pays; listPrice is pre-discount.
          const money = raw.retailPrice ?? raw.listPrice;

          return {
            sale: {
              saleability: raw.saleability ?? 'UNKNOWN',
              isEbook: raw.isEbook ?? false,
              price: typeof money?.amount === 'number' ? money.amount : undefined,
              currency: money?.currencyCode,
              buyLink: raw.buyLink,
            },
          };
        } catch (err) {
          console.error(
            `[BookService] saleInfo lookup failed for ${googleBooksId} (${country}):`,
            err
          );
          return { sale: null };
        }
      }
    );

    return sale;
  }
}

export const bookService = new BookService();
