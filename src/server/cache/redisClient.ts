/**
 * Redis client — lazy singleton.
 *
 * Returns null when REDIS_URL is not set so the app starts cleanly without Redis.
 * The AI cache falls back to the file-based implementation in that case.
 */
import Redis from 'ioredis';

let client: Redis | null = null;
let connectionAttempted = false;

export function getRedisClient(): Redis | null {
  if (connectionAttempted) return client;
  connectionAttempted = true;

  const url = process.env.REDIS_URL;
  if (!url) {
    // Redis is optional — no warning needed in tests/dev
    return null;
  }

  try {
    client = new Redis(url, {
      // Fail fast during startup instead of silently retrying forever
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      lazyConnect: false,
    });

    client.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
    });

    client.on('connect', () => {
      console.log('[Redis] Connected');
    });
  } catch (err) {
    console.error('[Redis] Failed to initialise client:', err);
    client = null;
  }

  return client;
}

/** Close the connection (used in tests / graceful shutdown). */
export async function closeRedisClient(): Promise<void> {
  if (client) {
    await client.quit().catch(() => {});
    client = null;
    connectionAttempted = false;
  }
}
