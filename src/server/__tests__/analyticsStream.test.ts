/**
 * Analytics SSE stream — unit tests
 *
 * Covers the framing and lifecycle of GET /api/analytics/stream: correct
 * event-stream headers, an immediate snapshot, pushes driven by the stats event
 * bus, coalescing of bursts (getStats is the heaviest read in the app), and a
 * clean teardown that does not leak a listener or an interval per connection.
 */
import { EventEmitter } from 'events';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../cache/redisClient', () => ({ getRedisClient: () => null }));

const getStats = vi.fn();
vi.mock('../services/analyticsService', () => ({
  analyticsService: { getStats: (...args: any[]) => getStats(...args) },
}));

import { analyticsController } from '../controllers/analyticsController';
import { publishStatsChanged, listenerCount, closeStatsSubscriber } from '../services/statsEvents';
import { AuthenticationError } from '../utils/errors';

const USER = 'user-1';

/** Minimal stand-in for the bits of express's Response the handler touches. */
function makeRes() {
  return {
    statusCode: 0,
    headers: {} as Record<string, string>,
    chunks: [] as string[],
    writableEnded: false,
    flushHeadersCalled: false,
    writeHead(status: number, headers: Record<string, string>) {
      this.statusCode = status;
      this.headers = headers;
      return this;
    },
    flushHeaders() {
      this.flushHeadersCalled = true;
    },
    write(chunk: string) {
      this.chunks.push(chunk);
      return true;
    },
    end() {
      this.writableEnded = true;
    },
    get body() {
      return this.chunks.join('');
    },
  };
}

function makeReq(userId: string = USER) {
  const req: any = new EventEmitter();
  req.userId = userId;
  return req;
}

/** Every `event: stats` payload pushed so far, in order. */
function statsFrames(res: ReturnType<typeof makeRes>) {
  return res.chunks
    .filter((c) => c.startsWith('event: stats\n'))
    .map((c) => JSON.parse(c.replace(/^event: stats\ndata: /, '').trim()));
}

let openReqs: any[] = [];

beforeEach(() => {
  vi.useFakeTimers();
  getStats.mockReset();
  getStats.mockResolvedValue({ overview: { totalPagesRead: 10 } });
  openReqs = [];
});

afterEach(async () => {
  // Close anything still streaming so no interval survives the test.
  openReqs.forEach((r) => r.emit('close'));
  vi.useRealTimers();
  await closeStatsSubscriber();
});

async function openStream(userId: string = USER) {
  const req = makeReq(userId);
  const res = makeRes();
  openReqs.push(req);
  await analyticsController.streamStats(req, res as any);
  return { req, res };
}

describe('streamStats — connection setup', () => {
  it('responds with event-stream headers that defeat proxy buffering', async () => {
    const { res } = await openStream();

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('text/event-stream; charset=utf-8');
    // `no-transform` is the half that stops intermediaries recompressing/buffering.
    expect(res.headers['Cache-Control']).toContain('no-transform');
    expect(res.headers['Connection']).toBe('keep-alive');
    expect(res.headers['X-Accel-Buffering']).toBe('no');
    expect(res.flushHeadersCalled).toBe(true);
  });

  it('sends a reconnect hint and an immediate snapshot', async () => {
    const { res } = await openStream();

    expect(res.body).toContain('retry: 10000');
    const frames = statsFrames(res);
    expect(frames).toHaveLength(1);
    expect(frames[0].stats).toEqual({ overview: { totalPagesRead: 10 } });
    expect(frames[0].at).toBeTruthy();
    expect(getStats).toHaveBeenCalledWith(USER);
  });

  it('registers exactly one listener per connection', async () => {
    await openStream();
    expect(listenerCount(USER)).toBe(1);
  });

  it('rejects an unauthenticated request before writing headers', async () => {
    // Built without makeReq on purpose: `userId` must be genuinely absent, the
    // shape authMiddleware leaves behind when it has not run.
    const req: any = new EventEmitter();
    const res = makeRes();

    // Must reject so asyncHandler routes it to the JSON error middleware — which
    // could not respond at all if headers were already flushed.
    await expect(analyticsController.streamStats(req, res as any)).rejects.toBeInstanceOf(
      AuthenticationError
    );
    expect(res.statusCode).toBe(0);
    expect(res.chunks).toHaveLength(0);
  });
});

describe('streamStats — pushing updates', () => {
  it('pushes fresh stats when the user’s stats change', async () => {
    const { res } = await openStream();
    getStats.mockResolvedValue({ overview: { totalPagesRead: 42 } });

    publishStatsChanged(USER);
    await vi.advanceTimersByTimeAsync(300);

    const frames = statsFrames(res);
    expect(frames).toHaveLength(2);
    expect(frames[1].stats).toEqual({ overview: { totalPagesRead: 42 } });
  });

  it('ignores changes belonging to a different reader', async () => {
    const { res } = await openStream();

    publishStatsChanged('someone-else');
    await vi.advanceTimersByTimeAsync(300);

    expect(statsFrames(res)).toHaveLength(1);
    expect(getStats).toHaveBeenCalledTimes(1);
  });

  it('coalesces a burst into a single recompute', async () => {
    const { res } = await openStream();
    expect(getStats).toHaveBeenCalledTimes(1);

    // libraryService invalidates from four different paths; a bulk import fires
    // one per book. Recomputing per event would turn a burst into a stall.
    publishStatsChanged(USER);
    publishStatsChanged(USER);
    publishStatsChanged(USER);
    publishStatsChanged(USER);
    await vi.advanceTimersByTimeAsync(300);

    expect(getStats).toHaveBeenCalledTimes(2); // initial + one coalesced pass
    expect(statsFrames(res)).toHaveLength(2);
  });

  it('reports a failed recompute without closing the stream', async () => {
    const { res } = await openStream();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getStats.mockRejectedValueOnce(new Error('db unreachable'));

    publishStatsChanged(USER);
    await vi.advanceTimersByTimeAsync(300);

    expect(res.body).toContain('event: stream-error');
    expect(res.writableEnded).toBe(false);

    // A later change still gets through — the subscription survived.
    getStats.mockResolvedValue({ overview: { totalPagesRead: 7 } });
    publishStatsChanged(USER);
    await vi.advanceTimersByTimeAsync(300);
    expect(statsFrames(res).at(-1).stats).toEqual({ overview: { totalPagesRead: 7 } });
  });

  it('emits a heartbeat comment so idle proxies do not reap the connection', async () => {
    const { res } = await openStream();

    await vi.advanceTimersByTimeAsync(26_000);

    expect(res.chunks).toContain(': ping\n\n');
  });
});

describe('streamStats — teardown', () => {
  it('ends the response and releases the listener when the client disconnects', async () => {
    const { req, res } = await openStream();
    expect(listenerCount(USER)).toBe(1);

    req.emit('close');

    expect(res.writableEnded).toBe(true);
    expect(listenerCount(USER)).toBe(0);
  });

  it('stops the heartbeat after teardown', async () => {
    const { req, res } = await openStream();
    req.emit('close');
    const afterClose = res.chunks.length;

    await vi.advanceTimersByTimeAsync(60_000);

    expect(res.chunks).toHaveLength(afterClose);
  });

  it('does not push to a disconnected client', async () => {
    const { req, res } = await openStream();
    req.emit('close');
    const afterClose = statsFrames(res).length;

    publishStatsChanged(USER);
    await vi.advanceTimersByTimeAsync(300);

    expect(statsFrames(res)).toHaveLength(afterClose);
  });

  it('tolerates close firing twice', async () => {
    const { req, res } = await openStream();

    req.emit('close');
    expect(() => req.emit('close')).not.toThrow();
    expect(res.writableEnded).toBe(true);
  });

  it('cleans up independently for two concurrent readers', async () => {
    const a = await openStream();
    const b = await openStream();
    expect(listenerCount(USER)).toBe(2);

    a.req.emit('close');

    expect(listenerCount(USER)).toBe(1);
    expect(b.res.writableEnded).toBe(false);
  });
});
