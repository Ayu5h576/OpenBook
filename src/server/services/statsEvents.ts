/**
 * Stats-change notifications for the live analytics dashboard.
 *
 * `invalidateUserStats` is already the app's single "this user's stats are now
 * stale" signal, so it is also the honest place to tell any dashboard held open
 * for that user to pull fresh numbers. This module turns that one call into a
 * fan-out:
 *
 *   - Always into a per-process EventEmitter. That is the whole mechanism on a
 *     single instance, so streaming works with no extra infrastructure.
 *   - Additionally through Redis pub/sub when REDIS_URL is set, so a reading
 *     session recorded on replica A reaches a dashboard streaming from replica B.
 *
 * Every Redis path here **fails open**, matching the rate limiters and
 * `cacheService`: a broker outage degrades the dashboard to its ordinary
 * five-minute refetch. It must never propagate into the write that happened to
 * invalidate stats — finishing a book has to succeed even when Redis is down.
 */
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import type Redis from 'ioredis';
import { getRedisClient } from '../cache/redisClient';

const CHANNEL = 'openbook:stats-changed';

/**
 * Identifies this process in published payloads. A publisher is also a
 * subscriber on its own channel, so without this tag a local invalidation would
 * be delivered twice — once directly, once looped back through Redis — and cost
 * a second recompute of the heaviest read in the app.
 */
const INSTANCE_ID = randomUUID();

/** Namespaced so a user id can never collide with an EventEmitter builtin like `error`. */
const eventName = (userId: string) => `stats:${userId}`;

const emitter = new EventEmitter();
// Node warns past 10 listeners per event as a leak heuristic. Here each open
// dashboard adds exactly one listener for its own user id, so a reader with a
// few tabs or devices legitimately exceeds it.
emitter.setMaxListeners(0);

let subscriber: Redis | null = null;
let subscribeAttempted = false;

/**
 * Lazily opens the dedicated subscriber connection. Only stream handlers need
 * it, so it is created on first subscribe rather than at import time — a
 * deployment with no dashboards open pays nothing.
 */
function ensureSubscriber(): void {
  if (subscribeAttempted) return;
  subscribeAttempted = true;

  const client = getRedisClient();
  if (!client) return; // Single-instance mode: the local emitter is the whole story.

  try {
    // A connection in subscriber mode cannot issue ordinary commands, so this
    // has to be a duplicate rather than the shared client used for caching.
    const sub = client.duplicate();

    sub.on('error', (err) => {
      console.error('[StatsEvents] Subscriber connection error:', err.message);
    });

    sub.on('message', (channel, message) => {
      if (channel !== CHANNEL) return;
      try {
        const payload = JSON.parse(message);
        // Already delivered locally by publishStatsChanged.
        if (payload?.origin === INSTANCE_ID) return;
        if (typeof payload?.userId === 'string' && payload.userId) {
          emitter.emit(eventName(payload.userId));
        }
      } catch (err) {
        console.error('[StatsEvents] Ignoring malformed message:', err);
      }
    });

    sub.subscribe(CHANNEL).catch((err) => {
      console.error('[StatsEvents] Failed to subscribe:', err.message);
    });

    subscriber = sub;
  } catch (err) {
    console.error('[StatsEvents] Failed to create subscriber:', err);
    subscriber = null;
  }
}

/**
 * Announce that `userId`'s stats changed. Best-effort and synchronous from the
 * caller's point of view: local listeners fire immediately, and the Redis
 * publish is fire-and-forget so a slow broker cannot stall a write.
 */
export function publishStatsChanged(userId: string): void {
  if (!userId) return;

  // Local first — this has to work whether or not a broker exists.
  try {
    emitter.emit(eventName(userId));
  } catch (err) {
    console.error('[StatsEvents] Local listener threw:', err);
  }

  const client = getRedisClient();
  if (!client) return;

  try {
    const payload = JSON.stringify({ userId, origin: INSTANCE_ID });
    void client.publish(CHANNEL, payload).catch((err) => {
      console.error('[StatsEvents] Publish failed:', err.message);
    });
  } catch (err) {
    console.error('[StatsEvents] Publish threw:', err);
  }
}

/**
 * Listen for changes to one user's stats. Returns the unsubscribe function;
 * callers must invoke it when the connection closes or the listener leaks for
 * the lifetime of the process.
 */
export function subscribeStatsChanged(userId: string, handler: () => void): () => void {
  ensureSubscriber();

  const name = eventName(userId);
  emitter.on(name, handler);

  let released = false;
  return () => {
    // Guard against a double release: express can fire both `close` and `end`,
    // and removing the same listener twice would drop a second dashboard's.
    if (released) return;
    released = true;
    emitter.off(name, handler);
  };
}

/** Current listener count for a user. Exposed for tests and diagnostics. */
export function listenerCount(userId: string): number {
  return emitter.listenerCount(eventName(userId));
}

/** Close the subscriber connection (graceful shutdown / tests). */
export async function closeStatsSubscriber(): Promise<void> {
  // Reset state before awaiting anything: a client that fails to close must not
  // leave this module believing it still has a live subscription.
  const sub = subscriber;
  subscriber = null;
  subscribeAttempted = false;
  emitter.removeAllListeners();

  if (!sub) return;

  try {
    // Promise.resolve because a half-initialised client may return nothing.
    await Promise.resolve(sub.quit()).catch(() => {});
  } catch {
    // Nothing actionable while shutting down.
  }
}
