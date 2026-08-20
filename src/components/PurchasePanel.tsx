import React from 'react';
import { Offer, OffersResult, Region } from '../services/api';
import { EmptyState } from './EmptyState';
import { ArrowUpRight, RefreshCw } from 'lucide-react';

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

/**
 * One row of the price table.
 *
 * A printed price list is a table, not a deck of cards: store on the left,
 * format in the middle, price right-aligned in a single column so the eye can
 * run down it and compare. The cheapest offer isn't marked here — it has
 * already been lifted out into the masthead figure above.
 */
const OfferRow: React.FC<{ offer: Offer; region: Region }> = ({ offer, region }) => {
  const hasPrice = typeof offer.price === 'number';

  return (
    <li>
      <a
        href={offer.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-baseline gap-3 py-3 -mx-2 px-2 rounded hover:bg-[var(--bg-ivory)] transition-colors"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="text-[13px] font-bold text-[var(--ink)] group-hover:text-[#A0522D] transition-colors truncate">
              {offer.label}
            </span>
            {offer.free && !hasPrice && (
              <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-[0.12em] text-[#B8860B]">
                Borrow
              </span>
            )}
          </span>
          <span className="block text-[11px] text-[var(--muted)]">
            {FORMAT_LABELS[offer.format]}
          </span>
        </span>

        {/* Leader dots, as a printed price list uses to carry the eye across. */}
        <span
          aria-hidden="true"
          className="hidden sm:block flex-1 self-center border-b border-dotted border-[var(--border-light)] min-w-4"
        />

        <span className="flex-shrink-0 text-right">
          {hasPrice ? (
            <span className="font-serif-title text-xl font-bold text-[var(--ink)] tabular-nums">
              {priceLabel(offer, region)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--muted)] group-hover:text-[#A0522D] transition-colors">
              Check price
              <ArrowUpRight className="w-3 h-3" />
            </span>
          )}
        </span>
      </a>
    </li>
  );
};

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

  // The headline number: what it actually costs to get this book right now.
  const best = priced[0];

  return (
    <div>
      {/* ── About this book ─────────────────────────────────────────── */}
      {description && (
        <section className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)] mb-2">
            About this book
          </p>
          {/* Drop-cap first letter and a justified measure — the two things that
              make a block of body text read as a printed page. */}
          <p
            className="font-reader text-[15px] leading-[1.75] text-[var(--ink)] whitespace-pre-line text-justify hyphens-auto
                       first-letter:float-left first-letter:font-serif-title first-letter:text-[3.4rem]
                       first-letter:leading-[0.82] first-letter:pr-2 first-letter:pt-1 first-letter:font-bold
                       first-letter:text-[#A0522D]"
          >
            {description}
          </p>
        </section>
      )}

      {/* ── Where to buy ────────────────────────────────────────────── */}
      <section className="pt-6 border-t border-[var(--border-light)]">
        <div className="flex items-baseline justify-between gap-4 mb-1">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)] mb-2">
              Where to buy
            </p>
            <h3 className="font-serif-title text-2xl font-bold text-[var(--ink)] leading-tight">
              Prices &amp; editions
            </h3>
          </div>
          {priced.length > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)] flex-shrink-0">
              Cheapest first
            </span>
          )}
        </div>

        {loading && (
          <div className="space-y-3 mt-6" role="status">
            <span className="sr-only">Loading buying options</span>
            <div className="h-20 rounded bg-[var(--bg-beige)] animate-pulse" />
            <div className="h-10 rounded bg-[var(--bg-beige)] animate-pulse" />
            <div className="h-10 rounded bg-[var(--bg-beige)] animate-pulse w-11/12" />
            <div className="h-10 rounded bg-[var(--bg-beige)] animate-pulse w-10/12" />
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
          <div className="mt-6">
            {/* The headline price, set as a masthead figure rather than a card:
                the number, then plainly where it comes from. */}
            {best && (
              <a
                href={best.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block mb-6 pb-6 border-b-2 border-double border-[var(--border-light)]"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#A0522D] mb-1">
                  {best.free || best.price === 0 ? 'Free to read' : 'Best price today'}
                </p>
                <p className="font-serif-title text-5xl font-bold text-[var(--ink)] leading-none tabular-nums">
                  {priceLabel(best, region)}
                </p>
                <p className="mt-2 text-[13px] text-[var(--muted)]">
                  at{' '}
                  <span className="font-bold text-[var(--ink)] group-hover:text-[#A0522D] transition-colors">
                    {best.label}
                  </span>
                  <span className="mx-1.5">·</span>
                  {FORMAT_LABELS[best.format]}
                  <ArrowUpRight className="inline-block w-3.5 h-3.5 ml-1 -mt-0.5 group-hover:text-[#A0522D] transition-colors" />
                </p>
              </a>
            )}

            {/* Everything else — priced and link-only — in one table, so the
                reader compares stores in a single pass instead of hopping
                between a card grid and a footnote list. */}
            <ul className="divide-y divide-[var(--border-light)]">
              {priced.slice(1).map((offer) => (
                <OfferRow key={offer.platform} offer={offer} region={region} />
              ))}
              {linkOnly.map((offer) => (
                <OfferRow key={offer.platform} offer={offer} region={region} />
              ))}
            </ul>

            {/* Say plainly why some rows have no number — and never claim a live
                price exists when none came back. */}
            <p className="mt-5 text-[11px] leading-relaxed text-[var(--muted)] italic font-reader">
              {priced.length > 0
                ? `${priced.length === 1 ? 'One store publishes' : `${priced.length} stores publish`} a live price to apps. The rest open a search on their own site, where you'll see today's price.`
                : "No store publishes a price for this edition to apps. Each link opens a search on the store's own site, where you'll see today's price."}
            </p>

            {priced.length === 0 && linkOnly.length > 0 && (
              <button
                onClick={onRetry}
                className="mt-3 inline-flex items-center gap-2 text-[11px] font-bold text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
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
