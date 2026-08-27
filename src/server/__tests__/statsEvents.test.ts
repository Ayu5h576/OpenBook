/**
 * statsEvents — unit tests
 *
 * The event bus behind the live analytics dashboard. The properties that matter
 * are isolation (one reader's activity never reaches another's stream) and
 * failing open (a Redis problem must not propagate into the write that
 * invalidated stats — finishing a book has to succeed with the broker down).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Swapped per test: default is "no REDIS_URL", the single-instance path where the
 * local emitter is the whole mechanism.
 */
let redisStub: any = null;
vi.mock('../cache/redisClient', () => ({
  getRedisClient: () => redisStub,
}));

import {
  publishStatsChanged,
  subscribeStatsChanged,
  listenerCount,
  closeStatsSubscriber,
} from '../services/statsEvents';

const USER = 'user-1';
const OTHER = 'user-2';

beforeEach(() => {
  redisStub = null;
  vi.restoreAllMocks();
});

afterEach(async () => {
  // Resets the lazily-opened subscriber and drops every listener, so module
  // state does not leak between cases.
  await closeStatsSubscriber();
});

describe('statsEvents — local delivery', () => {
  it('delivers a change to that user’s subscriber', () => {
    const handler = vi.fn();
    subscribeStatsChanged(USER, handler);

    publishStatsChanged(USER);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not leak one reader’s activity to another’s stream', () => {
    const mine = vi.fn();
    const theirs = vi.fn();
    subscribeStatsChanged(USER, mine);
    subscribeStatsChanged(OTHER, theirs);

    publishStatsChanged(USER);

    expect(mine).toHaveBeenCalledTimes(1);
    expect(theirs).not.toHaveBeenCalled();
  });

  it('fans out to every open dashboard for the same user', () => {
    const tabOne = vi.fn();
    const tabTwo = vi.fn();
    subscribeStatsChanged(USER, tabOne);
    subscribeStatsChanged(USER, tabTwo);

    publishStatsChanged(USER);

    expect(tabOne).toHaveBeenCalledTimes(1);
    expect(tabTwo).toHaveBeenCalledTimes(1);
  });

  it('stops delivering after unsubscribe', () => {
    const handler = vi.fn();
    const release = subscribeStatsChanged(USER, handler);

    release();
    publishStatsChanged(USER);

    expect(handler).not.toHaveBeenCalled();
    expect(listenerCount(USER)).toBe(0);
  });

  it('ignores a repeated unsubscribe instead of dropping another tab’s listener', () => {
    const first = vi.fn();
    const second = vi.fn();
    const releaseFirst = subscribeStatsChanged(USER, first);
    subscribeStatsChanged(USER, second);

    releaseFirst();
    releaseFirst(); // express can fire both `close` and `error`

    publishStatsChanged(USER);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('ignores an empty user id', () => {
    const handler = vi.fn();
    subscribeStatsChanged(USER, handler);

    publishStatsChanged('');

    expect(handler).not.toHaveBeenCalled();
  });
});

describe('statsEvents — failing open', () => {
  it('does not throw when Redis is absent', () => {
    expect(() => publishStatsChanged(USER)).not.toThrow();
  });

  it('still notifies locally when the Redis publish rejects', async () => {
    const publish = vi.fn().mockRejectedValue(new Error('broker down'));
    redisStub = {
      publish,
      duplicate: () => ({
        on: vi.fn(),
        subscribe: vi.fn().mockResolvedValue(1),
        quit: vi.fn().mockResolvedValue('OK'),
      }),
    };
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const handler = vi.fn();
    subscribeStatsChanged(USER, handler);

    expect(() => publishStatsChanged(USER)).not.toThrow();
    // The local path runs before the broker is even consulted.
    expect(handler).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalled();

    // Let the rejection settle so it is handled rather than unhandled.
    await Promise.resolve();
  });

  it('does not throw when publish itself throws synchronously', () => {
    redisStub = {
      publish: () => {
        throw new Error('client closed');
      },
      duplicate: () => ({ on: vi.fn(), subscribe: vi.fn().mockResolvedValue(1), quit: vi.fn() }),
    };
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const handler = vi.fn();
    subscribeStatsChanged(USER, handler);

    expect(() => publishStatsChanged(USER)).not.toThrow();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('survives a subscriber connection that cannot be created', () => {
    redisStub = {
      publish: vi.fn().mockResolvedValue(1),
      duplicate: () => {
        throw new Error('no sockets left');
      },
    };
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const handler = vi.fn();
    // subscribeStatsChanged opens the subscriber lazily, so the failure lands here.
    expect(() => subscribeStatsChanged(USER, handler)).not.toThrow();

    publishStatsChanged(USER);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('statsEvents — cross-replica delivery', () => {
  it('re-emits a message published by another instance', async () => {
    const listeners: Record<string, Function> = {};
    const sub = {
      on: (event: string, fn: Function) => {
        listeners[event] = fn;
      },
      subscribe: vi.fn().mockResolvedValue(1),
      quit: vi.fn().mockResolvedValue('OK'),
    };
    redisStub = { publish: vi.fn().mockResolvedValue(1), duplicate: () => sub };

    const handler = vi.fn();
    subscribeStatsChanged(USER, handler);

    expect(sub.subscribe).toHaveBeenCalledWith('openbook:stats-changed');

    // A different process published this, so it carries a foreign origin.
    listeners.message?.(
      'openbook:stats-changed',
      JSON.stringify({ userId: USER, origin: 'some-other-instance' })
    );

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('drops its own looped-back message so stats are not recomputed twice', () => {
    const listeners: Record<string, Function> = {};
    const sub = {
      on: (event: string, fn: Function) => {
        listeners[event] = fn;
      },
      subscribe: vi.fn().mockResolvedValue(1),
      quit: vi.fn().mockResolvedValue('OK'),
    };
    const publish = vi.fn().mockResolvedValue(1);
    redisStub = { publish, duplicate: () => sub };

    const handler = vi.fn();
    subscribeStatsChanged(USER, handler);

    publishStatsChanged(USER);
    expect(handler).toHaveBeenCalledTimes(1);

    // Redis echoes the publish back to this instance; the origin tag must suppress it.
    const [, payload] = publish.mock.calls[0];
    listeners.message?.('openbook:stats-changed', payload);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ignores a malformed message without dropping the subscription', () => {
    const listeners: Record<string, Function> = {};
    const sub = {
      on: (event: string, fn: Function) => {
        listeners[event] = fn;
      },
      subscribe: vi.fn().mockResolvedValue(1),
      quit: vi.fn().mockResolvedValue('OK'),
    };
    redisStub = { publish: vi.fn().mockResolvedValue(1), duplicate: () => sub };
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const handler = vi.fn();
    subscribeStatsChanged(USER, handler);

    expect(() => listeners.message?.('openbook:stats-changed', 'not json')).not.toThrow();
    expect(handler).not.toHaveBeenCalled();

    // Still live afterwards.
    listeners.message?.(
      'openbook:stats-changed',
      JSON.stringify({ userId: USER, origin: 'elsewhere' })
    );
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ignores messages on an unrelated channel', () => {
    const listeners: Record<string, Function> = {};
    const sub = {
      on: (event: string, fn: Function) => {
        listeners[event] = fn;
      },
      subscribe: vi.fn().mockResolvedValue(1),
      quit: vi.fn().mockResolvedValue('OK'),
    };
    redisStub = { publish: vi.fn().mockResolvedValue(1), duplicate: () => sub };

    const handler = vi.fn();
    subscribeStatsChanged(USER, handler);

    listeners.message?.('some:other:channel', JSON.stringify({ userId: USER, origin: 'x' }));

    expect(handler).not.toHaveBeenCalled();
  });
});
