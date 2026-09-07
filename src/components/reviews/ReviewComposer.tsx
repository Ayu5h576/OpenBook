import React, { useEffect, useState } from 'react';
import { Loader2, Lock, Send, Trash2 } from 'lucide-react';
import { StarRatingInput } from './StarRating';
import { MIN_RATING } from '../../utils/reviewStats';
import type { Review, SaveReviewInput } from '../../hooks/useReviews';

/** Mirrors `upsertReviewSchema` so a too-long field fails here, not as a 400. */
const TITLE_MAX = 200;
const BODY_MAX = 5000;

export interface ReviewComposerProps {
  /** The caller's existing review, if any — the composer edits it in place. */
  myReview: Review | null;
  saving: boolean;
  onSave: (input: SaveReviewInput) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}

/**
 * Write or edit *your* review of this book.
 *
 * `@@unique([userId, bookId])` plus a `PUT` upsert means one review per member
 * per book, so this is always edit-in-place — there is no "add another".
 */
export const ReviewComposer: React.FC<ReviewComposerProps> = ({
  myReview,
  saving,
  onSave,
  onDelete,
}) => {
  const [rating, setRating] = useState(myReview?.rating ?? 0);
  const [title, setTitle] = useState(myReview?.title ?? '');
  const [body, setBody] = useState(myReview?.body ?? '');
  const [isPrivate, setIsPrivate] = useState(myReview?.isPrivate ?? false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // The review arrives one render after the composer mounts (its query resolves
  // separately from the book), so seed the fields when it lands.
  useEffect(() => {
    if (!myReview) return;
    setRating(myReview.rating);
    setTitle(myReview.title ?? '');
    setBody(myReview.body ?? '');
    setIsPrivate(myReview.isPrivate);
  }, [myReview?.id, myReview?.updatedAt]);

  const submit = async () => {
    if (rating < MIN_RATING) {
      setErr('Pick a star rating first.');
      return;
    }
    setErr(null);
    try {
      await onSave({
        rating,
        // Sent as '' rather than omitted: `update: input` in reviewService makes
        // an absent key a Prisma no-op, so omitting a cleared field would keep
        // the old text instead of clearing it.
        title: title.trim(),
        body: body.trim(),
        isPrivate,
      });
    } catch (e: any) {
      setErr(e?.message || 'Could not save your review.');
    }
  };

  const remove = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setErr(null);
    try {
      await onDelete();
      setRating(0);
      setTitle('');
      setBody('');
      setIsPrivate(false);
      setConfirmDelete(false);
    } catch (e: any) {
      setErr(e?.message || 'Could not delete your review.');
    }
  };

  return (
    <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 shadow-warm-sm space-y-4">
      <h4 className="font-serif-title text-xl font-bold text-[var(--ink)]">
        {myReview ? 'Your review' : 'Write your review'}
      </h4>

      <div>
        <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">
          Rating <span className="text-[#B23B3B]">*</span>
        </label>
        <StarRatingInput value={rating} onChange={setRating} disabled={saving} />
      </div>

      <div>
        <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">
          Headline <span className="font-normal text-[var(--muted)]">(optional)</span>
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={TITLE_MAX}
          placeholder="Sum it up in a line…"
          className="w-full px-4 py-2.5 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-ivory)] text-sm text-[var(--ink)] focus:outline-none focus:border-[#A0522D]"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">
          Your thoughts <span className="font-normal text-[var(--muted)]">(optional)</span>
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          maxLength={BODY_MAX}
          placeholder="What stayed with you? Who should read it?"
          className="w-full px-4 py-2.5 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-ivory)] text-sm text-[var(--ink)] focus:outline-none focus:border-[#A0522D] resize-none"
        />
        <p className="text-[10px] text-[#A0A0A0] mt-1 text-right tabular-nums">
          {body.length} / {BODY_MAX}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setIsPrivate((p) => !p)}
        aria-pressed={isPrivate}
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors ${
          isPrivate
            ? 'bg-[var(--bg-beige)] border-[#A0522D] text-[#A0522D]'
            : 'bg-[var(--bg-ivory)] border-[var(--border-light)] text-[var(--muted)]'
        }`}
      >
        <Lock className="w-3.5 h-3.5" />
        {isPrivate ? 'Private — only you can see this' : 'Keep this private'}
      </button>

      {err && <p className="text-xs text-[#B23B3B]">{err}</p>}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={submit}
          disabled={saving}
          className="flex-1 min-w-[12rem] px-4 py-2.5 rounded-full bg-[var(--ink)] text-[var(--bg-ivory)] font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {myReview ? 'Update your review' : 'Post review'}
        </button>

        {myReview && (
          <button
            onClick={remove}
            disabled={saving}
            className={`px-4 py-2.5 rounded-full border font-semibold text-sm inline-flex items-center gap-2 disabled:opacity-60 transition-colors ${
              confirmDelete
                ? 'border-[#B23B3B] text-[#B23B3B] bg-[#FEF2F2]'
                : 'border-[var(--border-light)] text-[var(--muted)]'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            {confirmDelete ? 'Really delete?' : 'Delete'}
          </button>
        )}
      </div>
    </div>
  );
};
