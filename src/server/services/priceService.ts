/**
 * Price Service — aggregates purchase offers for a book across storefronts.
 *
 * Design note: offers come from *providers*, and a provider either returns a
 * real price or it doesn't. Two providers can quote a number without paid
 * credentials — Google Play Books (any region, via the Google Books `saleInfo`
 * field) and Apple Books (US only, via the public iTunes Search API). Every
 * other storefront is reachable only as a deep link, because Amazon's Product
 * Advertising API needs an approved Associates account with qualifying sales and
 * Flipkart's affiliate API is closed to new signups.
 *
 * We deliberately never synthesize or estimate a price. A card without a price
 * says "check price" and links out; it does not guess. When real credentials
 * arrive, each store becomes a provider in `PROVIDERS` and the UI picks up the
 * numbers with no changes.
 */
import { createHash } from 'crypto';
import { cacheService } from '../cache/cacheService';
import { appleBooksService } from './appleBooksService';
import { bookService } from './bookService';
import {
  OfferFormat,
  Region,
  REGION_CURRENCY,
  Storefront,
  StorefrontBook,
  storefrontsForRegion,
} from './storefronts';

export type { Region } from './storefronts';

export type PriceSource = 'live' | 'link-only';

export interface Offer {
  platform: string;
  label: string;
  format: OfferFormat;
  url: string;
  /** Absent means we genuinely don't know the price — never a placeholder. */
  price?: number;
  currency?: string;
  priceSource: PriceSource;
  /** Free to read/borrow rather than purchased. */
  free?: boolean;
}

export interface OffersResult {
  region: Region;
  currency: string;
  /** Priced offers ascending, then link-only offers in editorial order. */
  offers: Offer[];
  cheapestPlatform?: string;
  /** How many offers carry a real price — the UI sizes its hierarchy off this. */
  pricedCount: number;
}

/** Everything a provider is allowed to know about the book. */
export interface OfferContext {
  book: StorefrontBook & { googleBooksId?: string | null };
  region: Region;
}

export interface PriceProvider {
  id: string;
  supports(region: Region): boolean;
  /** Must resolve to null rather than throw when it has nothing to offer. */
  fetchOffer(ctx: OfferContext): Promise<Offer | null>;
}

const OFFERS_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours — prices are volatile

/**
 * Hash the key parts. The file cache backend sanitizes keys with
 * /[^a-z0-9]/gi -> '-', so raw titles or ISBNs could collide and serve one
 * book's offers for another (see booksCacheKey in bookService.ts).
 */
function offersCacheKey(parts: unknown[]): string {
  const hash = createHash('sha1').update(JSON.stringify(parts)).digest('hex');
  return `offers:${hash}`;
}

// ─── Providers ────────────────────────────────────────────────────────────────

/**
 * Google Play Books — the one live price available without paid credentials.
 */
export const googlePlayProvider: PriceProvider = {
  id: 'googlePlay',
  supports: () => true,
  async fetchOffer({ book, region }) {
    if (!book.googleBooksId) return null;

    const sale = await bookService.getVolumeSaleInfo(book.googleBooksId, region);
    if (!sale) return null;

    const isFree = sale.saleability === 'FREE';
    const forSale = sale.saleability === 'FOR_SALE' || sale.saleability === 'FOR_SALE_AND_RENTAL';

    // No buy link and not for sale means there is nothing to show at all.
    if (!isFree && !forSale) return null;
    if (!sale.buyLink) return null;

    return {
      platform: 'googlePlay',
      label: 'Google Play Books',
      format: 'ebook',
      url: sale.buyLink,
      price: isFree ? 0 : sale.price,
      currency: isFree ? REGION_CURRENCY[region] : sale.currency,
      priceSource: 'live',
      free: isFree,
    };
  },
};

/**
 * Apple Books — a live ebook price via the iTunes Search API, US only.
 *
 * `appleBooksService` verifies the title+author match before returning anything,
 * so a hit here is a real price for the right book, not a best guess.
 */
export const appleBooksProvider: PriceProvider = {
  id: 'appleBooks',
  supports: (region) => region === 'US',
  async fetchOffer({ book, region }) {
    const offer = await appleBooksService.getEbookOffer(book, region);
    if (!offer) return null;

    return {
      platform: 'appleBooks',
      label: 'Apple Books',
      format: 'ebook',
      url: offer.url,
      price: offer.price,
      currency: offer.currency,
      priceSource: 'live',
      free: offer.free,
    };
  },
};

/** Wraps a storefront table entry as a link-only provider. */
function linkOnlyProvider(store: Storefront): PriceProvider {
  return {
    id: store.platform,
    supports: (region) => store.regions.includes(region),
    async fetchOffer({ book }) {
      return {
        platform: store.platform,
        label: store.label,
        format: store.format,
        url: store.buildUrl(book),
        priceSource: 'link-only',
        free: store.free,
      };
    },
  };
}

/**
 * Active providers. Order matters only as a tiebreak — the real ordering is by
 * price, then by the storefront table's `order`.
 */
export function providersForRegion(region: Region): PriceProvider[] {
  const linkOnly = storefrontsForRegion(region).map(linkOnlyProvider);
  return [googlePlayProvider, appleBooksProvider, ...linkOnly].filter((p) => p.supports(region));
}

// ─── Aggregation ──────────────────────────────────────────────────────────────

/**
 * Rank offers: real prices first, cheapest to dearest; then everything we can
 * only link to, in the storefront table's editorial order.
 *
 * A priced offer in a different currency than the region's is demoted to
 * link-only rather than compared numerically — 9.99 USD must never sort as
 * "cheaper" than 349 INR.
 */
export function rankOffers(offers: Offer[], region: Region): Offer[] {
  const currency = REGION_CURRENCY[region];
  const storeOrder = new Map(storefrontsForRegion(region).map((s) => [s.platform, s.order]));

  const priced: Offer[] = [];
  const linkOnly: Offer[] = [];

  for (const offer of offers) {
    const comparable =
      typeof offer.price === 'number' && Number.isFinite(offer.price) && offer.currency === currency;

    if (comparable) {
      priced.push(offer);
    } else {
      // Strip the incomparable price so the UI can't render a number we refuse
      // to rank; the reader still gets the link.
      linkOnly.push({ ...offer, price: undefined, currency: undefined, priceSource: 'link-only' });
    }
  }

  priced.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  linkOnly.sort(
    (a, b) => (storeOrder.get(a.platform) ?? 99) - (storeOrder.get(b.platform) ?? 99)
  );

  return [...priced, ...linkOnly];
}

export class PriceService {
  /**
   * Collect and rank every offer for a book in a region.
   *
   * One flaky provider must not empty the page, so results are gathered with
   * allSettled and rejections are logged and dropped.
   */
  async getOffers(
    book: StorefrontBook & { id: string; googleBooksId?: string | null },
    region: Region
  ): Promise<OffersResult> {
    const currency = REGION_CURRENCY[region];

    return cacheService.getOrSet(offersCacheKey([book.id, region]), OFFERS_TTL_MS, async () => {
      const providers = providersForRegion(region);
      const settled = await Promise.allSettled(
        providers.map((p) => p.fetchOffer({ book, region }))
      );

      const collected: Offer[] = [];
      settled.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value) collected.push(result.value);
        } else {
          console.error(`[PriceService] provider ${providers[index].id} failed:`, result.reason);
        }
      });

      const offers = rankOffers(collected, region);
      const pricedCount = offers.filter((o) => typeof o.price === 'number').length;

      return {
        region,
        currency,
        offers,
        cheapestPlatform: pricedCount > 0 ? offers[0].platform : undefined,
        pricedCount,
      };
    });
  }
}

export const priceService = new PriceService();
