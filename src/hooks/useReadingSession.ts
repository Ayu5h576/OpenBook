import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

/**
 * Tracks the one reading session that is currently in progress.
 *
 * The session outlives the component that started it: it is kept in
 * localStorage and mirrored through a module-level store, so the timer survives
 * navigating between views, a full page reload, and a second tab. Elapsed time
 * is always derived from the wall clock rather than counted with an interval —
 * a tab that gets throttled in the background would otherwise under-count.
 *
 * Only one session runs at a time. Reading two books at once is not a thing.
 */

const STORAGE_KEY = 'openbook.activeReadingSession';

export interface ActiveReadingSession {
  entryId: string;
  bookTitle: string;
  startPage: number;
  /** ISO timestamp of when the reader hit start. */
  startedAt: string;
}

function readStorage(): ActiveReadingSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed.entryId !== 'string' ||
      typeof parsed.startPage !== 'number' ||
      typeof parsed.startedAt !== 'string' ||
      Number.isNaN(new Date(parsed.startedAt).getTime())
    ) {
      return null;
    }
    return {
      entryId: parsed.entryId,
      bookTitle: typeof parsed.bookTitle === 'string' ? parsed.bookTitle : 'this book',
      startPage: parsed.startPage,
      startedAt: parsed.startedAt,
    };
  } catch {
    // Corrupt or unavailable storage should never break the reader.
    return null;
  }
}

let snapshot: ActiveReadingSession | null = readStorage();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// useSyncExternalStore requires a stable reference between writes.
function getSnapshot() {
  return snapshot;
}

function getServerSnapshot(): ActiveReadingSession | null {
  return null;
}

function write(next: ActiveReadingSession | null) {
  snapshot = next;
  try {
    if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private-mode / quota failures: keep the in-memory session working anyway.
  }
  emit();
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    snapshot = readStorage();
    emit();
  });
}

export function elapsedSecsOf(session: ActiveReadingSession | null): number {
  if (!session) return 0;
  const started = new Date(session.startedAt).getTime();
  return Math.max(0, Math.floor((Date.now() - started) / 1000));
}

export function formatDuration(secs: number): string {
  const hrs = Math.floor(secs / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${s}s`;
  if (mins > 0) return `${mins}m ${s}s`;
  return `${s}s`;
}

/**
 * @param entryId when given, `isActive` only reports true if the running
 *   session belongs to that library entry — so a tracker on one book does not
 *   claim the session started on another.
 */
export function useReadingSession(entryId?: string) {
  const session = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isActive = !!session && (!entryId || session.entryId === entryId);
  const isActiveElsewhere = !!session && !!entryId && session.entryId !== entryId;

  const [elapsedSecs, setElapsedSecs] = useState(() => elapsedSecsOf(session));

  useEffect(() => {
    if (!session) {
      setElapsedSecs(0);
      return;
    }
    setElapsedSecs(elapsedSecsOf(session));
    const id = setInterval(() => setElapsedSecs(elapsedSecsOf(session)), 1000);
    return () => clearInterval(id);
  }, [session]);

  const start = useCallback((next: Omit<ActiveReadingSession, 'startedAt'>) => {
    const begun: ActiveReadingSession = { ...next, startedAt: new Date().toISOString() };
    write(begun);
    return begun;
  }, []);

  const clear = useCallback(() => write(null), []);

  return { session, isActive, isActiveElsewhere, elapsedSecs, start, clear };
}
