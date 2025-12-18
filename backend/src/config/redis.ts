import Redis from 'ioredis';
import { env } from './env';

let isRedisConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

export const redis = new Redis({
  host: env.REDIS_HOST,
  port: parseInt(env.REDIS_PORT),
  password: env.REDIS_PASSWORD || undefined,
  retryStrategy: (times: number) => {
    reconnectAttempts = times;
    if (times > MAX_RECONNECT_ATTEMPTS) {
      console.warn('Redis: Max reconnection attempts reached. Stopping reconnection.');
      return null;
    }
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
  enableOfflineQueue: true,
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
  lazyConnect: true,
  keepAlive: 30000,
  commandTimeout: 5000,
  enableReadyCheck: true,
  enableAutoPipelining: false,
  family: 4,
});

redis.on('error', (err) => {
  if (!err.message.includes('ECONNREFUSED') && !err.message.includes('Stream isn\'t writeable')) {
    console.error('Redis Client Error:', err.message);
  }
  isRedisConnected = false;
});

redis.on('connect', () => {
  reconnectAttempts = 0;
  isRedisConnected = false;
});

redis.on('ready', () => {
  console.log('Redis Client Ready');
  isRedisConnected = true;
  reconnectAttempts = 0;
});

redis.on('close', () => {
  isRedisConnected = false;
});

redis.on('reconnecting', (_delay: number) => {
  if (reconnectAttempts <= 3) {
    console.log(`Redis Client Reconnecting... (attempt ${reconnectAttempts})`);
  }
  isRedisConnected = false;
});

redis.on('end', () => {
  isRedisConnected = false;
});

export function isRedisAvailable(): boolean {
  return redis.status === 'ready' && isRedisConnected;
}

export async function safeRedisCommand<T>(
  command: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    if (redis.status !== 'ready') {
      return fallback;
    }
    return await command();
  } catch (error: any) {
    if (
      error?.message?.includes('Stream isn\'t writeable') ||
      error?.message?.includes('Connection is closed') ||
      error?.message?.includes('ECONNREFUSED') ||
      error?.code === 'NR_CLOSED'
    ) {
      return fallback;
    }
    if (!error?.message?.includes('max retries')) {
    }
    return fallback;
  }
}

setTimeout(() => {
  redis.ping().catch(() => {
  });
}, 1000);

export default redis;

