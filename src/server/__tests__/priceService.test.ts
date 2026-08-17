/**
 * priceService — offer aggregation and ranking.
 *
 * The ranking rules carry real user-facing weight (the biggest card on the
 * purchase page is whatever lands at offers[0]), and the "never show a price we
 * don't have" guarantee is a correctness property, not a preference. Both are
 * pinned here.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PriceService,
  providersForRegion,
  rankOffers,
  type Offer,
} from '../services/priceService';
import { bookService } from '../services/bookService';
import { cacheService } from '../cache/cacheService';

const BOOK = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'The Left Hand of Darkness',
  authors: ['Ursula K. Le Guin'],
  isbn13: '9780441478125',
  isbn10: '0441478125',
  googleBooksId: 'gb-123',
};

function offer(partial: Partial<Offer> & { platform: string }): Offer {
  return {
    label: partial.platform,
    format: 'paperback',
    url: `https://example.com/${partial.platform}`,
    priceSource: partial.price != null ? 'live' : 'link-only',
    ...partial,
  } as Offer;
}

describe('rankOffers', () => {
  it('puts the cheapest priced offer first', () => {
    const ranked = rankOffers(
      [
        offer({ platform: 'b', price: 499, currency: 'INR' }),
        offer({ platform: 'a', price: 312, currency: 'INR' }),
        offer({ platform: 'c', price: 380, currency: 'INR' }),
      ],
      'IN'
    );

    expect(ranked.map((o) => o.platform)).toEqual(['a', 'c', 'b']);
  });

  it('ranks a free offer ahead of every paid one', () => {
    const ranked = rankOffers(
      [
        offer({ platform: 'paid', price: 199, currency: 'INR' }),
        offer({ platform: 'free', price: 0, currency: 'INR', free: true }),
      ],
      'IN'
    );

    expect(ranked[0].platform).toBe('free');
  });

  it('places every link-only offer after every priced offer', () => {
    const ranked = rankOffers(
      [
        offer({ platform: 'flipkart' }),
        offer({ platform: 'googlePlay', price: 349, currency: 'INR' }),
        offer({ platform: 'amazonIn' }),
      ],
      'IN'
    );

    expect(ranked[0].platform).toBe('googlePlay');
    expect(ranked.slice(1).every((o) => o.price === undefined)).toBe(true);
  });

  it('orders link-only offers by the storefront table, not input order', () => {
    const ranked = rankOffers(
      [offer({ platform: 'openLibrary' }), offer({ platform: 'amazonIn' })],
      'IN'
    );

    // amazonIn has order 1, openLibrary order 8.
    expect(ranked.map((o) => o.platform)).toEqual(['amazonIn', 'openLibrary']);
  });

  it('demotes a foreign-currency price instead of comparing it numerically', () => {
    const ranked = rankOffers(
      [
        offer({ platform: 'inr', price: 349, currency: 'INR' }),
        offer({ platform: 'usd', price: 9.99, currency: 'USD' }),
      ],
      'IN'
    );

    // 9.99 must not read as "cheaper" than 349 INR.
    expect(ranked[0].platform).toBe('inr');

    const demoted = ranked.find((o) => o.platform === 'usd')!;
    expect(demoted.price).toBeUndefined();
    expect(demoted.currency).toBeUndefined();
    expect(demoted.priceSource).toBe('link-only');
  });

  it('drops a non-finite price rather than sorting on it', () => {
    const ranked = rankOffers(
      [
        offer({ platform: 'broken', price: Number.NaN, currency: 'INR' }),
        offer({ platform: 'good', price: 500, currency: 'INR' }),
      ],
      'IN'
    );

    expect(ranked[0].platform).toBe('good');
    expect(ranked[1].price).toBeUndefined();
  });
});

describe('providersForRegion', () => {
  it('exposes the India storefronts and not the US-only ones', () => {
    const ids = providersForRegion('IN').map((p) => p.id);

    expect(ids).toContain('flipkart');
    expect(ids).toContain('amazonIn');
    expect(ids).not.toContain('bookshopOrg');
    expect(ids).not.toContain('amazonUs');
  });

  it('exposes the US storefronts and not the India-only ones', () => {
    const ids = providersForRegion('US').map((p) => p.id);

    expect(ids).toContain('bookshopOrg');
    expect(ids).toContain('amazonUs');
    expect(ids).not.toContain('flipkart');
  });

  it('includes Google Play and the cross-region stores in both regions', () => {
    for (const region of ['IN', 'US'] as const) {
      const ids = providersForRegion(region).map((p) => p.id);
      expect(ids).toContain('googlePlay');
      expect(ids).toContain('abebooks');
      expect(ids).toContain('openLibrary');
    }
  });
});

describe('PriceService.getOffers', () => {
  let service: PriceService;

  beforeEach(() => {
    service = new PriceService();
    // Bypass the cache so each case sees its own provider stubs. Cast because
    // getOrSet is generic and its inferred signature won't match a plain stub.
    vi.spyOn(cacheService, 'getOrSet').mockImplementation((async (
      _key: string,
      _ttl: number,
      compute: () => Promise<any>
    ) => compute()) as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('surfaces the live Google Play price as the cheapest offer', async () => {
    vi.spyOn(bookService, 'getVolumeSaleInfo').mockResolvedValue({
      saleability: 'FOR_SALE',
      isEbook: true,
      price: 349,
      currency: 'INR',
      buyLink: 'https://play.google.com/store/books/details?id=gb-123',
    });

    const result = await service.getOffers(BOOK, 'IN');

    expect(result.region).toBe('IN');
    expect(result.currency).toBe('INR');
    expect(result.pricedCount).toBe(1);
    expect(result.cheapestPlatform).toBe('googlePlay');
    expect(result.offers[0]).toMatchObject({ platform: 'googlePlay', price: 349, priceSource: 'live' });
  });

  it('still returns link-only offers when no provider can quote a price', async () => {
    vi.spyOn(bookService, 'getVolumeSaleInfo').mockResolvedValue(null);

    const result = await service.getOffers(BOOK, 'IN');

    expect(result.pricedCount).toBe(0);
    expect(result.cheapestPlatform).toBeUndefined();
    expect(result.offers.length).toBeGreaterThan(0);
    expect(result.offers.every((o) => o.priceSource === 'link-only')).toBe(true);
  });

  it('drops a throwing provider instead of failing the whole page', async () => {
    vi.spyOn(bookService, 'getVolumeSaleInfo').mockRejectedValue(new Error('Google Books down'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await service.getOffers(BOOK, 'IN');

    expect(result.offers.length).toBeGreaterThan(0);
    expect(result.offers.some((o) => o.platform === 'googlePlay')).toBe(false);
    expect(consoleError).toHaveBeenCalled();
  });

  it('skips Google Play entirely for a book with no Google Books id', async () => {
    const saleInfo = vi.spyOn(bookService, 'getVolumeSaleInfo');

    const result = await service.getOffers({ ...BOOK, googleBooksId: null }, 'IN');

    expect(saleInfo).not.toHaveBeenCalled();
    expect(result.offers.some((o) => o.platform === 'googlePlay')).toBe(false);
  });

  it('omits a Google Play offer that has no buy link', async () => {
    vi.spyOn(bookService, 'getVolumeSaleInfo').mockResolvedValue({
      saleability: 'FOR_SALE',
      isEbook: true,
      price: 349,
      currency: 'INR',
      buyLink: undefined,
    });

    const result = await service.getOffers(BOOK, 'IN');

    expect(result.offers.some((o) => o.platform === 'googlePlay')).toBe(false);
  });

  it('omits a volume that is not for sale', async () => {
    vi.spyOn(bookService, 'getVolumeSaleInfo').mockResolvedValue({
      saleability: 'NOT_FOR_SALE',
      isEbook: false,
      buyLink: 'https://play.google.com/store/books/details?id=gb-123',
    });

    const result = await service.getOffers(BOOK, 'IN');

    expect(result.offers.some((o) => o.platform === 'googlePlay')).toBe(false);
  });

  it('deep-links by ISBN when one exists', async () => {
    vi.spyOn(bookService, 'getVolumeSaleInfo').mockResolvedValue(null);

    const result = await service.getOffers(BOOK, 'IN');
    const amazon = result.offers.find((o) => o.platform === 'amazonIn')!;

    expect(amazon.url).toContain('9780441478125');
  });

  it('falls back to title and author when the book has no ISBN', async () => {
    vi.spyOn(bookService, 'getVolumeSaleInfo').mockResolvedValue(null);

    const result = await service.getOffers(
      { ...BOOK, isbn10: null, isbn13: null },
      'IN'
    );
    const amazon = result.offers.find((o) => o.platform === 'amazonIn')!;

    expect(amazon.url).toContain(encodeURIComponent('The Left Hand of Darkness Ursula K. Le Guin'));
  });
});
