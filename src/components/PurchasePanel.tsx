import React from 'react';
import { Offer, OffersResult, Region } from '../services/api';
import { EmptyState } from './EmptyState';
import { ArrowUpRight, RefreshCw, TrendingDown } from 'lucide-react';

interface PurchasePanelProps {
  description: string;
  data?: OffersResult;
  loading: boolean;
  error?: string | null;
  region: Region;
  onRetry: () => void;
}

const LOCALES: Record<Region, string> = { IN: 'en-IN', US: 'en-US' };

const FORMAT_LABELS: Record<Offer['format'], string> = {
  paperback: 'Paperback',
  hardcover: 'Hardcover',
  ebook: 'Ebook',
  audiobook: 'Audiobook',
  any: 'Used & new',
};

/** Action wording for the primary buy button. */
function actionLabel(offer: Offer): string {
  if (offer.free || offer.price === 0) return 'Read free';
  if (offer.format === 'any') return 'Buy now';
  return `Buy ${FORMAT_LABELS[offer.format].toLowerCase()}`;
}

function formatPrice(amount: number, currency: string | undefined, region: Region): string {
  // Intl throws RangeError on an empty currency code, and a price without a
  // currency should never have been ranked in the first place — degrade to a
  // bare number rather than crashing the page.
  if (!currency) return String(amount);

  return new Intl.NumberFormat(LOCALES[region], {
    style: 'currency',
    currency,
    // Whole prices read better without trailing zeros; 9.99 still needs them.
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function priceLabel(offer: Offer, region: Region): string {
  if (offer.free || offer.price === 0) return 'Free';
  return formatPrice(offer.price!, offer.currency, region);
}

/** Left page of the spread: the description, then where to buy. */
export const PurchasePanel: React.FC<PurchasePanelProps> = ({
  description,
  data,
  loading,
  error,
  region,
  onRetry,
}) => {
  const priced = data?.offers.filter((o) => typeof o.price === 'number') ?? [];
  const linkOnly = data?.offers.filter((o) => typeof o.price !== 'number') ?? [];

  const [best, ...restPriced] = priced;
  const midPriced = restPriced.slice(0, 2);
  const tailPriced = restPriced.slice(2);

  return (
    <div className="space-y-8">
      {/* ── About this book ─────────────────────────────────────────── */}
      {description && (
        <section>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)] mb-3">
            About this book
          </p>
          <p className="font-reader text-[15px] leading-[1.75] text-[var(--ink)] whitespace-pre-line">
            {description}
          </p>
        </section>
      )}

      {/* ── Where to buy ────────────────────────────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between gap-4 mb-1 pt-2 border-t border-[var(--border-light)]">
          <h3 className="font-serif-title text-2xl font-bold text-[var(--ink)] mt-4">
            Where to buy
          </h3>
          {priced.length > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
              Cheapest first
            </span>
          )}
        </div>

        {loading && (
          <div className="space-y-3 mt-5" role="status">
            <span className="sr-only">Loading buying options</span>
            <div className="h-32 rounded-2xl bg-[var(--bg-beige)] animate-pulse" />
            <div className="h-9 rounded-lg bg-[var(--bg-beige)] animate-pulse" />
            <div className="h-9 rounded-lg bg-[var(--bg-beige)] animate-pulse w-11/12" />
            <div className="h-9 rounded-lg bg-[var(--bg-beige)] animate-pulse w-10/12" />
          </div>
        )}

        {!loading && error && (
          <EmptyState
            preset="search"
            title="Couldn't load buying options"
            description="The store lookup didn't respond. Try again."
            action={{ label: 'Try again', onClick: onRetry }}
          />
        )}

        {!loading && !error && data && data.offers.length === 0 && (
          <EmptyState
            preset="search"
            title="No stores matched this edition"
            description="This copy has no ISBN or catalog ID on record, so there's nothing to look up on a store."
          />
        )}

        {!loading && !error && data && data.offers.length > 0 && (
          <div className="mt-5 space-y-6">
            {/* Cheapest offer — the one card that gets real size. */}
            {best && (
              <a
                href={best.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-2xl border border-[#A0522D]/25 bg-[var(--bg-ivory)] p-6 shadow-warm-sm hover:shadow-warm-md hover:border-[#A0522D]/50 transition-all group"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#A0522D] text-[var(--bg-ivory)] text-[10px] font-bold uppercase tracking-[0.12em]">
                    <TrendingDown className="w-3 h-3" />
                    Lowest price
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    Live price
                  </span>
                </div>

                <p className="font-serif-title text-6xl font-bold text-[var(--ink)] leading-none tabular-nums">
                  {priceLabel(best, region)}
                </p>

                <p className="mt-3 text-sm font-bold text-[var(--ink)]">{best.label}</p>
                <p className="text-xs text-[var(--muted)]">{FORMAT_LABELS[best.format]}</p>

                <span className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--ink)] text-[var(--bg-ivory)] text-xs font-bold group-hover:bg-[#333333] transition-colors">
                  {actionLabel(best)}
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </a>
            )}

            {/* Next cheapest — same information, less of the page. */}
            {midPriced.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {midPriced.map((offer) => (
                  <a
                    key={offer.platform}
                    href={offer.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-[var(--border-light)] bg-[var(--white)] p-4 hover:bg-[var(--bg-ivory)] hover:border-[#A0522D]/30 transition-all"
                  >
                    <p className="font-serif-title text-2xl font-bold text-[var(--ink)] tabular-nums">
                      {priceLabel(offer, region)}
                    </p>
                    <p className="mt-1 text-xs font-bold text-[var(--ink)]">{offer.label}</p>
                    <p className="text-[11px] text-[var(--muted)]">{FORMAT_LABELS[offer.format]}</p>
                  </a>
                ))}
              </div>
            )}

            {tailPriced.length > 0 && (
              <ul className="divide-y divide-[var(--border-light)]">
                {tailPriced.map((offer) => (
                  <li key={offer.platform}>
                    <a
                      href={offer.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-3 py-3 group"
                    >
                      <span className="text-xs font-bold text-[var(--ink)] group-hover:text-[#A0522D] transition-colors">
                        {offer.label}
                      </span>
                      <span className="text-[11px] text-[var(--muted)] hidden sm:block">
                        {FORMAT_LABELS[offer.format]}
                      </span>
                      <span className="font-serif-title text-lg font-bold text-[var(--ink)] tabular-nums">
                        {priceLabel(offer, region)}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}

            {/* Stores we can link to but not quote. A ledger, not a card grid —
                they carry no price, so they shouldn't take card-sized space. */}
            {linkOnly.length > 0 && (
              <div className="pt-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)] mb-1">
                  Also sold at
                </p>
                <ul className="divide-y divide-[var(--border-light)]">
                  {linkOnly.map((offer) => (
                    <li key={offer.platform}>
                      <a
                        href={offer.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-3 py-3 group"
                      >
                        <span className="flex items-baseline gap-2 min-w-0">
                          <span className="text-xs font-bold text-[var(--ink)] group-hover:text-[#A0522D] transition-colors truncate">
                            {offer.label}
                          </span>
                          {offer.free && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B8860B]">
                              Borrow
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] text-[var(--muted)] hidden sm:block flex-shrink-0">
                          {FORMAT_LABELS[offer.format]}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--muted)] group-hover:text-[#A0522D] transition-colors flex-shrink-0">
                          Check price
                          <ArrowUpRight className="w-3 h-3" />
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>

                {/* Say plainly why most rows have no number — and don't claim a
                    live price exists when none came back. */}
                <p className="mt-4 text-[11px] leading-relaxed text-[var(--muted)]">
                  {priced.length > 0
                    ? "Only Google Play publishes prices to apps. These stores open a search on their own site, where you'll see the current price."
                    : "No store publishes a price for this edition to apps. Each link opens a search on the store's own site, where you'll see the current price."}
                </p>
              </div>
            )}

            {priced.length === 0 && linkOnly.length > 0 && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 text-[11px] font-bold text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Check for prices again
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
