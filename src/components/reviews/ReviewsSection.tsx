import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Loader2, Star, Users } from 'lucide-react';
import { m, staggerListContainer, staggerListItem } from '../../motion';
import { Avatar } from '../Avatar';
import { ErrorBanner } from '../ErrorBanner';
import { timeAgo } from '../../utils/timeAgo';
import { useAuth } from '../../hooks/useAuth';
import { useReviews, type Review } from '../../hooks/useReviews';
import { StarRating } from './StarRating';
import { ReviewComposer } from './ReviewComposer';
import type { UserSummary } from '../../services/api';

export interface ReviewsSectionProps {
  /**
   * The **local** book UUID. Undefined while the book resolves; the section
   * renders its shell and parks both queries.
   */
  bookId?: string;
  /** Straight from `localBook.averageRating` — never the mapped `book.rating`, which fabricates 4.0. */
  externalRating?: number | null;
  /** Straight from `localBook.ratingsCount`. */
  externalCount?: number | null;
  id?: string;
  className?: string;
}

// ─── One review ──────────────────────────────────────────────────────────────

const ReviewCard: React.FC<{
  review: Review;
  isMine: boolean;
  onOpenProfile: (u: UserSummary) => void;
}> = ({ review, isMine, onOpenProfile }) => {
  // `profile` is nullable in the schema, so a member without one has no name.
  const username = review.user?.profile?.username ?? 'A reader';
  const avatar = review.user?.profile?.avatar ?? null;
  const canLink = Boolean(review.user?.id && review.user?.profile?.username);

  const open = () => {
    if (!canLink) return;
    onOpenProfile({ id: review.user!.id, username, avatar });
  };

  return (
    <div className="flex items-start gap-3 py-4">
      <button onClick={open} disabled={!canLink} className="shrink-0 disabled:cursor-default">
        <Avatar username={username} avatar={avatar} />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={open}
            disabled={!canLink}
            className="text-xs font-semibold text-[var(--ink)] hover:text-[#A0522D] transition-colors disabled:hover:text-[var(--ink)] disabled:cursor-default"
          >
            {username}
          </button>
          {isMine && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--bg-beige)] text-[#A0522D]">
              You
            </span>
          )}
          <StarRating value={review.rating} sizeClass="w-3.5 h-3.5" />
          <span className="text-[10px] text-[#A0A0A0]">{timeAgo(review.createdAt)}</span>
        </div>

        {review.title && (
          <p className="text-sm font-bold text-[var(--ink)] mt-1.5">{review.title}</p>
        )}
        {review.body && (
          <p className="text-xs text-[var(--muted)] leading-relaxed mt-1 whitespace-pre-wrap">
            {review.body}
          </p>
        )}
      </div>
    </div>
  );
};

// ─── Section ─────────────────────────────────────────────────────────────────

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  bookId,
  externalRating,
  externalCount,
  id,
  className = '',
}) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const {
    reviews,
    myReview,
    loading,
    error,
    refetch,
    saveReview,
    deleteReview,
    saving,
    memberAverage,
    memberCount,
  } = useReviews(bookId);

  // ProfileView has no get-user-by-id endpoint to fall back on — without the
  // router state it bounces straight to /community.
  const openProfile = (u: UserSummary) => navigate(`/profile/${u.id}`, { state: { user: u } });

  const hasExternal = Boolean(externalCount && externalCount > 0 && externalRating);

  return (
    <section
      id={id}
      className={`bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 md:p-8 shadow-warm-md ${className}`}
    >
      <h2 className="font-serif-title text-3xl font-bold text-[var(--ink)] mb-1">Reviews</h2>
      <p className="text-xs text-[var(--muted)] mb-6">
        What readers everywhere scored it, and what OpenBook members actually wrote.
      </p>

      {/* ── Readers everywhere (external aggregate) ───────────────────────── */}
      <div className="bg-[var(--bg-ivory)] border border-[var(--border-light)] rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif-title text-xl font-bold text-[var(--ink)] flex items-center gap-2">
            <Globe className="w-4 h-4 text-[var(--muted)]" />
            Readers everywhere
          </h3>
          <span className="text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-[var(--bg-beige)] text-[var(--muted)]">
            via Google Books
          </span>
        </div>

        {hasExternal ? (
          <>
            <div className="flex items-center gap-2 mt-3">
              <StarRating value={externalRating!} />
              <span className="text-sm font-bold text-[var(--ink)] tabular-nums">
                {externalRating!.toFixed(1)}
              </span>
              <span className="text-xs text-[var(--muted)]">
                · {externalCount!.toLocaleString()} {externalCount === 1 ? 'rating' : 'ratings'}
              </span>
            </div>
            <p className="text-xs text-[var(--muted)] mt-2">
              An aggregate score only — Google Books exposes no written reviews.
            </p>
          </>
        ) : (
          // No score is honest; a placeholder number would read as a real one.
          <p className="text-xs text-[var(--muted)] mt-3">No external rating yet for this book.</p>
        )}
      </div>

      {/* ── OpenBook members ─────────────────────────────────────────────── */}
      <div className="mt-6 pt-6 border-t border-[var(--border-light)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif-title text-xl font-bold text-[var(--ink)] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#A0522D]" />
            OpenBook members
          </h3>
          {memberAverage !== null && (
            <div className="flex items-center gap-1.5 text-[#B8860B] font-bold text-xs bg-[#FFF8E7] px-3 py-1 rounded-full">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span className="tabular-nums">{memberAverage.toFixed(1)}</span>
              <span className="text-[var(--muted)] font-normal">
                ({memberCount} {memberCount === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          )}
        </div>

        {error && <ErrorBanner message={error} onRetry={() => refetch()} className="mt-4" />}

        {loading ? (
          <div className="mt-4 space-y-4" aria-busy="true">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[var(--bg-beige)] animate-pulse shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 w-32 bg-[var(--bg-beige)] rounded animate-pulse" />
                  <div className="h-3 bg-[var(--bg-beige)] rounded animate-pulse" />
                  <div className="h-3 w-4/6 bg-[var(--bg-beige)] rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-[var(--muted)] leading-relaxed mt-4">
            No member reviews yet. Be the first to share what you thought.
          </p>
        ) : (
          <m.div
            className="mt-2 divide-y divide-[var(--border-light)]"
            variants={staggerListContainer}
            initial="initial"
            animate="animate"
          >
            {reviews.map((review) => (
              <m.div key={review.id} variants={staggerListItem}>
                <ReviewCard
                  review={review}
                  isMine={review.userId === user?.id}
                  onOpenProfile={openProfile}
                />
              </m.div>
            ))}
          </m.div>
        )}

        {/* ── Compose ─────────────────────────────────────────────────────── */}
        <div className="mt-6">
          {!bookId ? (
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading this book…
            </div>
          ) : isAuthenticated ? (
            <ReviewComposer
              myReview={myReview}
              saving={saving}
              onSave={saveReview}
              onDelete={deleteReview}
            />
          ) : (
            <div className="bg-[var(--bg-ivory)] border border-[var(--border-light)] rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[var(--muted)]">
                Sign in to write your own review of this book.
              </p>
              <button
                onClick={() => navigate('/auth')}
                className="px-5 py-2 rounded-full bg-[var(--ink)] text-[var(--bg-ivory)] text-xs font-bold hover:bg-[#333333] transition-colors active:scale-95"
              >
                Sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
