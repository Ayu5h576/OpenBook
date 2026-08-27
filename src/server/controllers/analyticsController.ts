import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index';
import { analyticsService } from '../services/analyticsService';
import { subscribeStatsChanged } from '../services/statsEvents';
import { validateData } from '../validators/auth';
import { upsertGoalSchema } from '../validators/books';
import { AuthenticationError } from '../utils/errors';

function requireUser(req: AuthenticatedRequest): string {
  if (!req.userId) throw new AuthenticationError();
  return req.userId;
}

/**
 * Comment frame interval. Idle proxies and load balancers commonly close a
 * silent connection at 30–60s, so something has to cross the wire well inside
 * that even when a reader's stats never change.
 */
const HEARTBEAT_MS = 25_000;

/**
 * Coalescing window for change events. A single user action can invalidate stats
 * more than once (libraryService calls invalidateUserStats from four different
 * paths, and a bulk import fires one per book), and getStats is the heaviest
 * read in the app — recomputing it per event would turn a burst into a stall.
 */
const COALESCE_MS = 250;

export class AnalyticsController {
  async getStats(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const stats = await analyticsService.getStats(userId);
    res.json({ stats });
  }

  async getGoal(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
    const goal = await analyticsService.getGoal(userId, year);
    res.json({ goal: goal ?? null });
  }

  async upsertGoal(req: AuthenticatedRequest, res: Response) {
    const userId = requireUser(req);
    const input = validateData(upsertGoalSchema, req.body);
    const goal = await analyticsService.upsertGoal(userId, input);
    res.json({ goal });
  }

  /**
   * Server-Sent Events stream of this user's stats.
   *
   * Sends the current snapshot on connect, then a fresh one whenever something
   * invalidates their stats. The client is a plain `fetch` reader rather than an
   * `EventSource` because auth here is a Bearer header and `EventSource` cannot
   * set one — keeping the token out of the query string and out of access logs.
   *
   * Once the headers are flushed this handler owns its own failures: the global
   * error middleware answers with `res.json()`, which would throw on a response
   * that is already streaming. So nothing below the flush is allowed to reject.
   */
  async streamStats(req: AuthenticatedRequest, res: Response) {
    // Before the flush, so an auth failure still gets a normal JSON 401.
    const userId = requireUser(req);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      // `no-transform` matters as much as `no-cache`: it tells intermediaries not
      // to buffer or recompress, which is what silently breaks SSE in production.
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // nginx ignores Cache-Control for buffering decisions; this is its opt-out.
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders?.();

    const write = (chunk: string): boolean => {
      if (res.writableEnded) return false;
      try {
        res.write(chunk);
        return true;
      } catch (err) {
        console.error('[Analytics] Stream write failed:', err);
        return false;
      }
    };

    const send = (event: string, data: unknown): boolean =>
      // JSON.stringify escapes newlines, so the payload can never break out of
      // the single `data:` line the SSE framing requires.
      write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    let closed = false;
    let recomputing = false;
    let missedWhileBusy = false;
    let coalesceTimer: NodeJS.Timeout | null = null;

    const pushStats = async (): Promise<void> => {
      if (closed) return;

      // getStats is expensive and a burst can outpace it. Rather than queue one
      // recompute per event, remember that something arrived and do exactly one
      // more pass afterwards — the last pass always reflects final state.
      if (recomputing) {
        missedWhileBusy = true;
        return;
      }

      recomputing = true;
      try {
        do {
          missedWhileBusy = false;
          const stats = await analyticsService.getStats(userId);
          if (closed) return;
          send('stats', { stats, at: new Date().toISOString() });
        } while (missedWhileBusy && !closed);
      } catch (err) {
        console.error('[Analytics] Failed to compute stats for stream:', err);
        // Report and keep the stream open: a transient DB error should not cost
        // the client its subscription, and the next event will retry.
        send('stream-error', { message: 'Failed to refresh stats' });
      } finally {
        recomputing = false;
      }
    };

    const onChange = () => {
      if (closed || coalesceTimer) return;
      coalesceTimer = setTimeout(() => {
        coalesceTimer = null;
        void pushStats();
      }, COALESCE_MS);
    };

    const unsubscribe = subscribeStatsChanged(userId, onChange);

    const heartbeat = setInterval(() => {
      // A comment frame: ignored by SSE parsers, but enough traffic to stop an
      // idle proxy from reaping the connection.
      if (!write(': ping\n\n')) cleanup();
    }, HEARTBEAT_MS);

    function cleanup() {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
      if (coalesceTimer) clearTimeout(coalesceTimer);
      unsubscribe();
      if (!res.writableEnded) res.end();
    }

    req.on('close', cleanup);
    req.on('error', cleanup);

    // Tell the client how long to wait before retrying a dropped connection.
    // Generous on purpose: the global limiter allows 200 requests per 15 minutes
    // per IP, and a tight reconnect loop would spend that budget in seconds.
    write('retry: 10000\n\n');

    await pushStats();
  }
}

export const analyticsController = new AnalyticsController();
