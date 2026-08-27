/**
 * Live analytics via Server-Sent Events.
 *
 * `useAnalytics` fetches stats once through React Query; this hook keeps that
 * same cache entry warm by pushing server updates into it, so every component
 * reading `['analytics', 'stats']` re-renders with no extra plumbing.
 *
 * It reads the stream with `fetch` rather than `EventSource`. `EventSource`
 * cannot send an Authorization header, and the usual workaround — putting the
 * access token in the query string — writes a live credential into proxy and
 * server logs. `fetch` keeps it in the header where it belongs, at the cost of
 * parsing the SSE framing here.
 */
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AnalyticsApiService, AnalyticsStats, refreshAccessToken } from '../services/api';

/** Fallback reconnect delay when the server sends no `retry:` hint. */
const DEFAULT_RETRY_MS = 10_000;
/** Ceiling for backoff. The global limiter is 200 requests / 15 min per IP. */
const MAX_RETRY_MS = 60_000;
/**
 * How many times in a row a 401 may trigger a token refresh before we stop.
 * Without a cap, a revoked refresh cookie would spin: 401 → refresh → 401.
 */
const MAX_AUTH_RETRIES = 2;

export interface AnalyticsStreamState {
  /** True while a stream is open and delivering. */
  live: boolean;
  /** Server timestamp of the most recent pushed snapshot. */
  lastUpdateAt: string | null;
  /** Last transport or auth failure, cleared on a successful reconnect. */
  error: string | null;
}

export function useAnalyticsStream(enabled = true): AnalyticsStreamState {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AnalyticsStreamState>({
    live: false,
    lastUpdateAt: null,
    error: null,
  });

  // Kept in a ref so the effect never re-runs when the callback identity would
  // otherwise change — a re-run would tear down and reopen the stream.
  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;

  useEffect(() => {
    if (!enabled) {
      setState((s) => ({ ...s, live: false }));
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    let retryHintMs = DEFAULT_RETRY_MS;
    let backoffAttempt = 0;
    let authRetries = 0;
    let wakeUp: (() => void) | null = null;

    /** Sleep that returns early when the effect is torn down. */
    const delay = (ms: number) =>
      new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, ms);
        wakeUp = () => {
          clearTimeout(timer);
          resolve();
        };
      });

    const handleFrame = (rawFrame: string) => {
      let eventName = 'message';
      const dataLines: string[] = [];

      for (const line of rawFrame.split('\n')) {
        // Comment frame — the server's heartbeat. Proof of life, nothing to parse.
        if (line.startsWith(':')) continue;

        const sep = line.indexOf(':');
        const field = sep === -1 ? line : line.slice(0, sep);
        // A single optional space after the colon is part of the framing, not data.
        const value = sep === -1 ? '' : line.slice(sep + 1).replace(/^ /, '');

        if (field === 'event') eventName = value;
        else if (field === 'data') dataLines.push(value);
        else if (field === 'retry') {
          const parsed = parseInt(value, 10);
          if (Number.isFinite(parsed) && parsed > 0) retryHintMs = parsed;
        }
      }

      if (dataLines.length === 0) return;

      let payload: any;
      try {
        payload = JSON.parse(dataLines.join('\n'));
      } catch {
        // A truncated or malformed frame is not worth dropping the stream over.
        return;
      }

      if (eventName === 'stream-error') {
        setState((s) => ({ ...s, error: payload?.message ?? 'Stream error' }));
        return;
      }

      if (eventName === 'stats' && payload?.stats) {
        // Same key `useAnalytics` reads, so every consumer updates at once.
        queryClientRef.current.setQueryData<AnalyticsStats | null>(
          ['analytics', 'stats'],
          payload.stats
        );
        setState({ live: true, lastUpdateAt: payload.at ?? null, error: null });
      }
    };

    /** Opens one connection and reads it until it ends. Throws to trigger retry. */
    const readStream = async (): Promise<void> => {
      const response = await AnalyticsApiService.openStatsStream(controller.signal);

      if (response.status === 401) {
        if (authRetries < MAX_AUTH_RETRIES && (await refreshAccessToken())) {
          authRetries++;
          // Reconnect immediately with the rotated token rather than backing off.
          backoffAttempt = 0;
          return;
        }
        throw new Error('Not authorised to stream analytics');
      }

      if (!response.ok) throw new Error(`Stream failed with status ${response.status}`);
      if (!response.body) throw new Error('Stream returned no body');

      // Connected: reset the failure counters.
      authRetries = 0;
      backoffAttempt = 0;
      setState((s) => ({ ...s, live: true, error: null }));

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;

          // Normalise CRLF so frame splitting works regardless of the hop.
          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

          let boundary = buffer.indexOf('\n\n');
          while (boundary !== -1) {
            const frame = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            if (frame.length > 0) handleFrame(frame);
            boundary = buffer.indexOf('\n\n');
          }
        }
      } finally {
        // Releasing the lock lets the body be discarded on abort.
        reader.releaseLock();
      }
    };

    const loop = async () => {
      while (!cancelled) {
        try {
          await readStream();
        } catch (err) {
          if (cancelled) return;
          const message = err instanceof Error ? err.message : 'Stream disconnected';
          // AbortError is our own teardown, not a failure worth showing.
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setState((s) => ({ ...s, live: false, error: message }));
        }

        if (cancelled) return;
        setState((s) => ({ ...s, live: false }));

        const wait = Math.min(retryHintMs * 2 ** backoffAttempt, MAX_RETRY_MS);
        backoffAttempt++;
        await delay(wait);
      }
    };

    void loop();

    return () => {
      cancelled = true;
      wakeUp?.();
      controller.abort();
    };
  }, [enabled]);

  return state;
}
