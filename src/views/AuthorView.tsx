import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, Heart, Loader2, Sparkles, Star, Users, CloudOff, RefreshCw, Library,
} from 'lucide-react';
import { useAuthor } from '../hooks/useAuthor';
import { BookCover } from '../components/BookCover';
import {
  lifespan, statusLabel, progressPercent, findBookByTitle, bookTarget, historyStats,
} from '../utils/authorDisplay';
import type { AuthorBook, RelatedAuthor, AuthorHistory } from '../services/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const Section: React.FC<{
  title: string;
  count?: number;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ title, count, subtitle, children }) => (
  <section className="space-y-4">
    <div className="flex items-baseline gap-3">
      <h2 className="font-serif-title text-2xl font-bold text-[var(--ink)]">{title}</h2>
      {count !== undefined && <span className="text-xs font-bold text-[var(--muted)]">{count}</span>}
    </div>
    {subtitle && <p className="text-xs text-[var(--muted)] -mt-2">{subtitle}</p>}
    {children}
  </section>
);

// ─── Book card ───────────────────────────────────────────────────────────────

const AuthorBookCard: React.FC<{ book: AuthorBook; onOpen: () => void }> = ({ book, onOpen }) => {
  const progress = progressPercent(book.currentPage, book.pageCount);
  const status = statusLabel(book.status);

  return (
    <button
      onClick={onOpen}
      className="group text-left w-full flex flex-col gap-2.5"
    >
      <div className="relative">
        <BookCover
          title={book.title}
          author={book.authors[0]}
          coverUrl={book.coverImage}
          className="w-full aspect-[2/3] object-cover rounded-2xl shadow-warm-md group-hover:shadow-warm-lg transition-shadow"
        />
        {book.isFavorite && (
          <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[var(--white)]/90 backdrop-blur flex items-center justify-center shadow-warm-sm">
            <Heart className="w-3.5 h-3.5 text-[#A0522D] fill-[#A0522D]" />
          </span>
        )}
        {progress !== null && progress > 0 && progress < 100 && (
          <div className="absolute bottom-0 inset-x-0 h-1.5 bg-black/15 rounded-b-2xl overflow-hidden">
            <div className="h-full bg-[#A0522D]" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--ink)] leading-snug line-clamp-2">{book.title}</p>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--muted)]">
          {book.publishedDate && <span>{book.publishedDate.slice(0, 4)}</span>}
          {status && (
            <span className="px-1.5 py-0.5 rounded-md bg-[var(--bg-beige)] text-[#A0522D] font-bold">
              {status}
            </span>
          )}
          {book.myRating !== undefined && (
            <span className="flex items-center gap-0.5 font-bold text-[var(--ink)]">
              <Star className="w-3 h-3 fill-[#D4A574] text-[#D4A574]" />
              {book.myRating}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

const BookGrid: React.FC<{ books: AuthorBook[]; onOpen: (b: AuthorBook) => void }> = ({ books, onOpen }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
    {books.map((book) => (
      <AuthorBookCard
        key={book.id ?? book.googleBooksId ?? book.title}
        book={book}
        onOpen={() => onOpen(book)}
      />
    ))}
  </div>
);

// ─── Reading history strip ───────────────────────────────────────────────────

const HistoryStrip: React.FC<{ history: AuthorHistory; authorName: string }> = ({ history, authorName }) => {
  const stats = historyStats(history);

  const since = history.firstReadAt
    ? new Date(history.firstReadAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="bg-[var(--bg-ivory)] border border-[var(--border-light)] rounded-3xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Library className="w-4 h-4 text-[#A0522D]" />
        <h2 className="text-sm font-bold text-[var(--ink)]">You and {authorName}</h2>
        {since && <span className="text-xs text-[var(--muted)]">since {since}</span>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="font-serif-title text-2xl font-bold text-[var(--ink)]">{s.value}</p>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── AI insight ──────────────────────────────────────────────────────────────

const InsightCard: React.FC<{
  authorName: string;
  state: ReturnType<typeof useAuthor>;
  onOpenTitle: (title: string) => void;
}> = ({ authorName, state, onOpenTitle }) => {
  const { insight, insightLoading, insightError, insightRequested, requestInsight } = state;

  return (
    <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 md:p-7 shadow-warm-md">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-[#A0522D]" />
        <h2 className="text-sm font-bold text-[var(--ink)]">Why you might like {authorName}</h2>
      </div>

      {!insightRequested && (
        <>
          <p className="text-sm text-[var(--muted)] leading-relaxed mb-4">
            The companion reads your own shelf — what you finished, what you rated, what you
            set aside — and says where this author fits.
          </p>
          <button
            onClick={requestInsight}
            className="px-5 py-2.5 rounded-full bg-[var(--ink)] text-[var(--white)] text-xs font-bold hover:opacity-90 transition-opacity"
          >
            Ask the companion
          </button>
        </>
      )}

      {insightLoading && (
        <p className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <Loader2 className="w-4 h-4 animate-spin" /> Reading your library…
        </p>
      )}

      {insightError && !insightLoading && (
        <p className="text-sm text-[var(--muted)]">Couldn't reach the companion. {insightError}</p>
      )}

      {insight && !insightLoading && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--ink)] leading-relaxed">{insight.insight}</p>

          {insight.connections.length > 0 && (
            <ul className="space-y-2">
              {insight.connections.map((line, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-[var(--muted)] leading-relaxed">
                  <span className="text-[#A0522D] mt-0.5">◆</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Present only when the model named a title that really is in the
              bibliography — the server drops invented ones. */}
          {insight.startWith && (
            <button
              onClick={() => onOpenTitle(insight.startWith!.title)}
              className="w-full text-left bg-[var(--bg-ivory)] border border-[var(--border-light)] rounded-2xl p-4 hover:border-[#A0522D]/40 transition-colors"
            >
              <p className="text-[11px] font-bold text-[#A0522D] uppercase tracking-wide">Start with</p>
              <p className="font-serif-title text-lg font-bold text-[var(--ink)] mt-1">
                {insight.startWith.title}
              </p>
              <p className="text-xs text-[var(--muted)] leading-relaxed mt-1">{insight.startWith.why}</p>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Related authors ─────────────────────────────────────────────────────────

const RelatedAuthors: React.FC<{ authors: RelatedAuthor[]; onOpen: (name: string) => void }> = ({
  authors,
  onOpen,
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {authors.map((a) => (
      <button
        key={a.name}
        onClick={() => onOpen(a.name)}
        className="text-left bg-[var(--white)] border border-[var(--border-light)] rounded-2xl p-4 hover:shadow-warm-md transition-shadow"
      >
        <p className="text-sm font-bold text-[var(--ink)]">{a.name}</p>
        <p className="text-xs text-[var(--muted)] mt-1">{a.reason}</p>
        {a.sharedGenres.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {a.sharedGenres.slice(0, 3).map((g) => (
              <span key={g} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-beige)] text-[#A0522D] font-semibold">
                {g}
              </span>
            ))}
          </div>
        )}
      </button>
    ))}
  </div>
);

// ─── Main view ───────────────────────────────────────────────────────────────

export const AuthorView: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const state = useAuthor(name);
  const { profile, loading, error, refetch } = state;

  const openBook = (book: AuthorBook) => {
    const target = bookTarget(book);
    if (target) navigate(`/book/${target}`);
  };

  // The AI's "start with" pick is a title; resolve it to a book we actually have.
  const openTitle = (title: string) => {
    const match = findBookByTitle(
      [...(profile?.booksInLibrary ?? []), ...(profile?.moreByAuthor ?? [])],
      title
    );
    if (match) openBook(match);
  };

  if (loading) {
    return (
      <div className="h-full min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#A0522D]" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="h-full min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
        <CloudOff className="w-8 h-8 text-[var(--muted)]" />
        <p className="text-sm text-[var(--muted)] max-w-sm">
          {error ?? 'We could not find that author.'}
        </p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[var(--border-light)] text-xs font-bold text-[var(--ink)] hover:bg-[var(--bg-ivory)]"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Try again
        </button>
      </div>
    );
  }

  const { author, history, booksInLibrary, moreByAuthor, relatedAuthors, genres, bibliographyAvailable } = profile;
  const years = lifespan(author);

  return (
    <div className="space-y-10 pb-12">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* ─ Header ─ */}
      <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 md:p-8 shadow-warm-md">
        <div className="flex flex-col sm:flex-row gap-6">
          {author.portraitUrl ? (
            <img
              src={author.portraitUrl}
              alt={author.name}
              className="w-28 h-28 rounded-2xl object-cover shadow-warm-md shrink-0"
              // A portrait that 404s should leave a clean card, not a broken icon.
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="w-28 h-28 rounded-2xl bg-[var(--bg-beige)] flex items-center justify-center shrink-0">
              <span className="font-serif-title text-4xl font-bold text-[#A0522D]">
                {author.name.slice(0, 1).toUpperCase()}
              </span>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="font-serif-title text-4xl font-bold text-[var(--ink)]">{author.name}</h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-[var(--muted)]">
              {years && <span>{years}</span>}
              {author.workCount !== undefined && (
                <span><span className="font-bold text-[var(--ink)]">{author.workCount}</span> published works</span>
              )}
              {author.topWork && <span>Best known for <span className="font-semibold text-[var(--ink)]">{author.topWork}</span></span>}
            </div>

            {author.bio ? (
              <p className="text-sm text-[var(--ink)] leading-relaxed mt-4 max-w-3xl">{author.bio}</p>
            ) : (
              <p className="text-sm text-[var(--muted)] italic mt-4">
                No biography available from our sources for this author.
              </p>
            )}

            {genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {genres.slice(0, 8).map((g) => (
                  <span key={g} className="text-[11px] px-2.5 py-1 rounded-full bg-[var(--bg-beige)] text-[#A0522D] font-semibold">
                    {g}
                  </span>
                ))}
              </div>
            )}

            {author.sources.length > 0 && (
              <p className="text-[11px] text-[var(--muted)] mt-4">
                Biography and portrait from{' '}
                {author.sources.map((s, i) => (
                  <React.Fragment key={s.url}>
                    {i > 0 && ' and '}
                    <a href={s.url} target="_blank" rel="noreferrer noopener" className="underline hover:text-[var(--ink)]">
                      {s.name}
                    </a>
                  </React.Fragment>
                ))}
                .
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─ Your history ─ */}
      {history.booksInLibrary > 0 && <HistoryStrip history={history} authorName={author.name} />}

      {/* ─ AI insight ─ */}
      <InsightCard authorName={author.name} state={state} onOpenTitle={openTitle} />

      {/* ─ On your shelf ─ */}
      {booksInLibrary.length > 0 && (
        <Section title="On your shelf" count={booksInLibrary.length}>
          <BookGrid books={booksInLibrary} onOpen={openBook} />
        </Section>
      )}

      {/* ─ Bibliography ─ */}
      <Section
        title={booksInLibrary.length > 0 ? 'More by this author' : 'Bibliography'}
        count={bibliographyAvailable ? moreByAuthor.length : undefined}
      >
        {!bibliographyAvailable ? (
          // Not the same as "wrote nothing" — say which one it is.
          <div className="bg-[var(--bg-ivory)] border border-[var(--border-light)] rounded-2xl p-6 flex items-center gap-3">
            <CloudOff className="w-5 h-5 text-[var(--muted)] shrink-0" />
            <p className="text-xs text-[var(--muted)]">
              We couldn't reach the book catalogue, so this list is incomplete.
            </p>
            <button
              onClick={() => refetch()}
              className="ml-auto text-xs font-bold text-[#A0522D] hover:underline shrink-0"
            >
              Retry
            </button>
          </div>
        ) : moreByAuthor.length > 0 ? (
          <BookGrid books={moreByAuthor} onOpen={openBook} />
        ) : (
          <div className="bg-[var(--bg-ivory)] border border-[var(--border-light)] rounded-2xl p-6 flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-[var(--muted)] shrink-0" />
            <p className="text-xs text-[var(--muted)]">
              {booksInLibrary.length > 0
                ? 'Nothing else by this author turned up in the catalogue.'
                : 'No other books by this author turned up in the catalogue.'}
            </p>
          </div>
        )}
      </Section>

      {/* ─ Related authors ─ */}
      {relatedAuthors.length > 0 && (
        <Section
          title="Readers of this author also keep"
          subtitle="Drawn from your own shelf — authors you already own who share this one's subjects."
        >
          <RelatedAuthors authors={relatedAuthors} onOpen={(n) => navigate(`/author/${encodeURIComponent(n)}`)} />
        </Section>
      )}

      {relatedAuthors.length === 0 && history.booksInLibrary === 0 && (
        <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
          <Users className="w-4 h-4" />
          Add a book by this author to your library to see how they sit beside the rest of your shelf.
        </div>
      )}
    </div>
  );
};
