import React, { useEffect, useId, useRef, useState } from 'react';
import { BookOpen, Check, Clock, Loader2, Pencil, Play, Square, Timer, X } from 'lucide-react';
import { useLibrary } from '../hooks/useLibrary';
import { formatDuration, useReadingSession } from '../hooks/useReadingSession';
import { useToast } from '../context/ToastContext';
import type { LibraryEntry, LibraryStatus } from '../services/api';

type Mode = 'manual' | 'session';

interface ProgressTrackerProps {
  entry: LibraryEntry;
  /** `dark` for the Reading Room's dim panel, `light` for regular cards. */
  variant?: 'light' | 'dark';
  className?: string;
}

const THEMES = {
  light: {
    panel: 'bg-[var(--bg-ivory)] border-[var(--border-light)]',
    heading: 'text-[var(--ink)]',
    muted: 'text-[var(--muted)]',
    strong: 'text-[var(--ink)]',
    tabs: 'bg-[var(--white)] border-[var(--border-light)]',
    tabActive: 'bg-[var(--ink)] text-[var(--bg-ivory)]',
    tabIdle: 'text-[var(--muted)] hover:text-[var(--ink)]',
    input: 'bg-[var(--white)] border-[var(--border-light)] text-[var(--ink)] focus:border-[#A0522D]',
    primary: 'bg-[var(--ink)] text-[var(--bg-ivory)] hover:bg-[#333333]',
    ghost: 'border border-[var(--border-light)] text-[var(--ink)] hover:bg-[var(--bg-beige)]',
    track: 'bg-[var(--bg-beige)]',
    accent: 'accent-[#A0522D]',
    note: 'bg-[var(--bg-beige)] text-[var(--ink)]',
  },
  dark: {
    panel: 'bg-black/30 border-white/10 backdrop-blur-md',
    heading: 'text-white',
    muted: 'text-white/60',
    strong: 'text-white',
    tabs: 'bg-black/40 border-white/10',
    tabActive: 'bg-[#E0A96D] text-[var(--ink)]',
    tabIdle: 'text-white/60 hover:text-white',
    input: 'bg-black/40 border-white/20 text-white focus:border-[#E0A96D]',
    primary: 'bg-[#E0A96D] text-[var(--ink)] hover:bg-[#D49A5B]',
    ghost: 'border border-white/20 text-white/80 hover:bg-white/10',
    track: 'bg-white/10',
    accent: 'accent-[#E0A96D]',
    note: 'bg-white/10 text-white/80',
  },
} as const;

/**
 * Two ways to record where you are in a book:
 *
 *  - **Manual** — "I'm on page ___". One number, saved straight to the entry.
 *    For readers on paper, or catching up after reading away from the app.
 *  - **Session** — start a timer, then say where you stopped. Produces a
 *    ReadingSession, which is what pages/hour, the streak and the heatmap are
 *    built from; manual saves move the bookmark but contribute no time.
 */
export const ProgressTracker: React.FC<ProgressTrackerProps> = ({ entry, variant = 'light', className = '' }) => {
  const theme = THEMES[variant];
  const toast = useToast();
  const { updateEntry, logSession, savingProgress } = useLibrary();
  const { session, isActive, isActiveElsewhere, elapsedSecs, start, clear } = useReadingSession(entry.id);

  const pageCount = entry.book.pageCount ?? null;

  const [mode, setMode] = useState<Mode>(isActive ? 'session' : 'manual');
  const [pageInput, setPageInput] = useState(String(entry.currentPage));
  const [startPageInput, setStartPageInput] = useState(String(entry.currentPage));
  const [endPageInput, setEndPageInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // A running session is the thing the reader most likely came here for.
  useEffect(() => {
    if (isActive) setMode('session');
  }, [isActive]);

  // Re-seed the inputs when the entry actually changes underneath us (another
  // book selected, or a session that just advanced the page) — but not on every
  // refetch, which would wipe out a number the reader is halfway through typing.
  const synced = useRef({ id: entry.id, page: entry.currentPage });
  useEffect(() => {
    if (synced.current.id === entry.id && synced.current.page === entry.currentPage) return;
    synced.current = { id: entry.id, page: entry.currentPage };
    setPageInput(String(entry.currentPage));
    setStartPageInput(String(entry.currentPage));
    setError(null);
  }, [entry.id, entry.currentPage]);

  // Default the finish field to wherever the reader was when they hit start.
  useEffect(() => {
    if (!isActive || !session) return;
    setEndPageInput(String(Math.max(entry.currentPage, session.startPage)));
    // Only re-seed for a genuinely new session, not on every page change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, session?.startedAt]);

  const fieldId = useId();
  const pct = pageCount ? Math.min(100, Math.round((entry.currentPage / pageCount) * 100)) : 0;

  /** Returns a page number, or an error message describing why it isn't one. */
  const readPage = (raw: string, label: string): number | string => {
    const n = Number(raw);
    if (!raw.trim() || !Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
      return `${label} must be a whole page number.`;
    }
    if (pageCount && n > pageCount) return `This book only has ${pageCount} pages.`;
    return n;
  };

  const failure = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Try again.');

  // ── Manual ────────────────────────────────────────────────────────────────

  const saveManualPage = async () => {
    const page = readPage(pageInput, 'Page');
    if (typeof page === 'string') return setError(page);
    if (page === entry.currentPage) return setError(null);
    setError(null);

    const data: { currentPage: number; status?: LibraryStatus } = { currentPage: page };
    // Telling us a page means you're reading it, not merely that you own it.
    if (page > 0 && entry.status !== 'READING' && entry.status !== 'COMPLETED') data.status = 'READING';

    try {
      await updateEntry(entry.id, data);
      toast.success(`Bookmarked at page ${page}`);
    } catch (e) {
      setError(failure(e));
    }
  };

  const markFinished = async () => {
    if (!pageCount) return;
    setError(null);
    try {
      await updateEntry(entry.id, { currentPage: pageCount, status: 'COMPLETED' });
      toast.success(`Finished ${entry.book.title}`);
    } catch (e) {
      setError(failure(e));
    }
  };

  // ── Session ───────────────────────────────────────────────────────────────

  const startSession = () => {
    const page = readPage(startPageInput, 'Start page');
    if (typeof page === 'string') return setError(page);
    setError(null);
    start({ entryId: entry.id, bookTitle: entry.book.title, startPage: page });
    setEndPageInput(String(page));
  };

  const finishSession = async () => {
    if (!session) return;
    const page = readPage(endPageInput, 'End page');
    if (typeof page === 'string') return setError(page);
    if (page < session.startPage) {
      return setError(`You started on page ${session.startPage}, so you can't end before it.`);
    }
    setError(null);

    const startedMs = new Date(session.startedAt).getTime();
    // Guard against a clock that moved backwards mid-session: the API requires
    // at least one second, and endedAt must not land before startedAt.
    const endedMs = Math.max(startedMs + 1000, Date.now());
    const durationSecs = Math.max(1, Math.round((endedMs - startedMs) / 1000));

    try {
      await logSession(entry.id, {
        startPage: session.startPage,
        endPage: page,
        durationSecs,
        startedAt: session.startedAt,
        endedAt: new Date(endedMs).toISOString(),
      });
      clear();
      const pages = page - session.startPage;
      toast.success(`Logged ${formatDuration(durationSecs)} · ${pages} page${pages === 1 ? '' : 's'}`);
    } catch (e) {
      setError(failure(e));
    }
  };

  const discardSession = () => {
    clear();
    setError(null);
    toast.info('Session discarded — nothing was logged.');
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const parsedManual = Number(pageInput);
  const manualPreview =
    pageCount && Number.isInteger(parsedManual) && parsedManual >= 0 && parsedManual <= pageCount
      ? Math.round((parsedManual / pageCount) * 100)
      : pct;

  const sessionPages = session && Number.isInteger(Number(endPageInput))
    ? Number(endPageInput) - session.startPage
    : 0;
  const pagesPerHour = elapsedSecs >= 60 && sessionPages > 0
    ? Math.round(sessionPages / (elapsedSecs / 3600))
    : null;

  const inputCls = `w-24 rounded-xl border px-3 py-2 text-sm font-bold text-center focus:outline-none transition-colors ${theme.input}`;
  const btnBase = 'inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100';

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${theme.panel} ${className}`}>
      {/* Current position */}
      <div className="flex items-end justify-between gap-3 mb-2">
        <div>
          <p className={`text-[10px] uppercase tracking-widest font-semibold ${theme.muted}`}>Reading Progress</p>
          <p className={`font-serif-title text-lg font-bold ${theme.heading}`}>
            Page {entry.currentPage}
            <span className={`text-sm font-normal ${theme.muted}`}> of {pageCount ?? '?'}</span>
          </p>
        </div>
        <span className={`text-2xl font-bold tabular-nums ${theme.strong}`}>{pct}%</span>
      </div>

      <div className={`w-full h-2 rounded-full overflow-hidden ${theme.track}`}>
        <div
          className="h-full bg-gradient-to-r from-[#E0A96D] to-[#A0522D] rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Mode switch */}
      <div className={`inline-flex items-center gap-1 p-1 mt-4 rounded-full border ${theme.tabs}`}>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            mode === 'manual' ? theme.tabActive : theme.tabIdle
          }`}
        >
          <Pencil className="w-3.5 h-3.5" />
          <span>Manual</span>
        </button>
        <button
          type="button"
          onClick={() => setMode('session')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            mode === 'session' ? theme.tabActive : theme.tabIdle
          }`}
        >
          <Timer className="w-3.5 h-3.5" />
          <span>Session</span>
          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
        </button>
      </div>

      {/* Manual mode */}
      {mode === 'manual' && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={`${fieldId}-page`} className={`text-sm font-medium ${theme.strong}`}>
              I'm on page
            </label>
            <input
              id={`${fieldId}-page`}
              type="number"
              inputMode="numeric"
              min={0}
              max={pageCount ?? undefined}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveManualPage();
              }}
              className={inputCls}
            />
            {pageCount && <span className={`text-sm ${theme.muted}`}>of {pageCount}</span>}
          </div>

          {pageCount && (
            <input
              type="range"
              min={0}
              max={pageCount}
              value={Math.min(pageCount, Math.max(0, Number.isFinite(parsedManual) ? parsedManual : 0))}
              onChange={(e) => setPageInput(e.target.value)}
              aria-label="Current page"
              className={`w-full cursor-pointer ${theme.accent}`}
            />
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={saveManualPage}
              disabled={savingProgress || pageInput === String(entry.currentPage)}
              className={`${btnBase} ${theme.primary}`}
            >
              {savingProgress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Save progress</span>
            </button>

            {pageCount && entry.status !== 'COMPLETED' && (
              <button
                type="button"
                onClick={markFinished}
                disabled={savingProgress}
                className={`${btnBase} ${theme.ghost}`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>I finished it</span>
              </button>
            )}

            {manualPreview !== pct && (
              <span className={`text-xs ${theme.muted}`}>
                {pct}% → <span className={`font-bold ${theme.strong}`}>{manualPreview}%</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Session mode */}
      {mode === 'session' && (
        <div className="mt-4 space-y-3">
          {isActiveElsewhere && session ? (
            <>
              <p className={`text-xs rounded-xl px-3 py-2 ${theme.note}`}>
                A session is already running for <span className="font-bold">{session.bookTitle}</span> ({formatDuration(elapsedSecs)}).
                Finish or discard it before starting one here.
              </p>
              <button type="button" onClick={discardSession} className={`${btnBase} ${theme.ghost}`}>
                <X className="w-3.5 h-3.5" />
                <span>Discard that session</span>
              </button>
            </>
          ) : isActive && session ? (
            <>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="flex items-center gap-2 text-green-400 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Reading now
                </span>
                <span className={`font-mono text-2xl font-bold tabular-nums ${theme.strong}`}>
                  {formatDuration(elapsedSecs)}
                </span>
                <span className={`text-xs ${theme.muted}`}>started on page {session.startPage}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor={`${fieldId}-end`} className={`text-sm font-medium ${theme.strong}`}>
                  Stopped on page
                </label>
                <input
                  id={`${fieldId}-end`}
                  type="number"
                  inputMode="numeric"
                  min={session.startPage}
                  max={pageCount ?? undefined}
                  value={endPageInput}
                  onChange={(e) => setEndPageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') finishSession();
                  }}
                  className={inputCls}
                />
                {sessionPages > 0 && (
                  <span className={`text-xs ${theme.muted}`}>
                    {sessionPages} page{sessionPages === 1 ? '' : 's'} this session
                    {pagesPerHour ? ` · ~${pagesPerHour}/hr` : ''}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={finishSession}
                  disabled={savingProgress}
                  className={`${btnBase} ${theme.primary}`}
                >
                  {savingProgress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />}
                  <span>Finish &amp; log session</span>
                </button>
                <button type="button" onClick={discardSession} className={`${btnBase} ${theme.ghost}`}>
                  <X className="w-3.5 h-3.5" />
                  <span>Discard</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor={`${fieldId}-start`} className={`text-sm font-medium ${theme.strong}`}>
                  Starting on page
                </label>
                <input
                  id={`${fieldId}-start`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={pageCount ?? undefined}
                  value={startPageInput}
                  onChange={(e) => setStartPageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') startSession();
                  }}
                  className={inputCls}
                />
              </div>
              <button type="button" onClick={startSession} className={`${btnBase} ${theme.primary}`}>
                <Play className="w-3.5 h-3.5" />
                <span>Start reading session</span>
              </button>
              <p className={`text-xs flex items-start gap-1.5 ${theme.muted}`}>
                <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>The timer keeps running if you switch pages or close the tab — it only counts once you log it.</span>
              </p>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="mt-3 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>
      )}
    </div>
  );
};
