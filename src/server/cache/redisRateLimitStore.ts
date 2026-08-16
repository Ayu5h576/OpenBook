/**
 * Redis store for express-rate-limit.
 *
 * Implements the `Store` contract from express-rate-limit v8 on top of the
 * existing ioredis client, so rate limits are shared across replicas instead of
 * being counted per-process.
 *
 * Built on ioredis rather than pulling in `rate-limit-redis` because ioredis is
 * already a dependency and the whole contract is four small methods.
 *
 * Failure policy: **fail open**. If Redis is unreachable, requests are allowed
 * rather than rejected — a cache outage should not take the API down with it.
 * The tradeoff is that limits lapse while Redis is down.
 */
import type { Redis } from 'ioredis';
import type { Store, ClientRateLimitInfo, Options } from 'express-rate-limit';

export class RedisRateLimitStore implements Store {
  /** Redis is shared, so keys are not local to this instance. */
  localKeys = false;

  prefix: string;

  private client: Redis;
  private windowMs = 15 * 60 * 1000;

  constructor(client: Redis, prefix = 'rl:') {
    this.client = client;
    this.prefix = prefix;
  }

  /** Called once by express-rate-limit with the middleware's resolved options. */
  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  private redisKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const k = this.redisKey(key);
    try {
      // INCR and PTTL in one round trip so the counter and its expiry are read
      // together rather than racing.
      const results = await this.client.multi().incr(k).pttl(k).exec();

      // exec() returns null if the transaction was aborted.
      if (!results) throw new Error('Redis MULTI returned no results');

      const [[incrErr, incrRaw], [ttlErr, ttlRaw]] = results as [
        [Error | null, unknown],
        [Error | null, unknown]
      ];
      if (incrErr) throw incrErr;
      if (ttlErr) throw ttlErr;

      const totalHits = Number(incrRaw);
      let pttl = Number(ttlRaw);

      // PTTL is -1 when the key has no expiry (i.e. we just created it with
      // INCR) and -2 when it does not exist. Either way, start the window.
      if (pttl < 0) {
        await this.client.pexpire(k, this.windowMs);
        pttl = this.windowMs;
      }

      return { totalHits, resetTime: new Date(Date.now() + pttl) };
    } catch (err) {
      console.error('[RateLimitStore] Redis error, failing open:', err);
      // Fail open: report a single hit so the request is not blocked.
      return { totalHits: 1, resetTime: new Date(Date.now() + this.windowMs) };
    }
  }

  async decrement(key: string): Promise<void> {
    try {
      await this.client.decr(this.redisKey(key));
    } catch (err) {
      console.error('[RateLimitStore] Redis decrement failed:', err);
    }
  }

  async resetKey(key: string): Promise<void> {
    try {
      await this.client.del(this.redisKey(key));
    } catch (err) {
      console.error('[RateLimitStore] Redis resetKey failed:', err);
    }
  }

  async resetAll(): Promise<void> {
    try {
      // SCAN rather than KEYS so a large keyspace does not block Redis.
      let cursor = '0';
      do {
        const [next, keys] = await this.client.scan(
          cursor,
          'MATCH',
          `${this.prefix}*`,
          'COUNT',
          100
        );
        cursor = next;
        if (keys.length > 0) await this.client.del(...keys);
      } while (cursor !== '0');
    } catch (err) {
      console.error('[RateLimitStore] Redis resetAll failed:', err);
    }
  }
}
