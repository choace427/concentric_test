import Redis from 'ioredis';
import { env } from './env';

// Track connection state
let isRedisConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

// Create Redis connection with better error handling
export const redis = new Redis({
  host: env.REDIS_HOST,
  port: parseInt(env.REDIS_PORT),
  password: env.REDIS_PASSWORD || undefined,
  retryStrategy: (times: number) => {
    reconnectAttempts = times;
    if (times > MAX_RECONNECT_ATTEMPTS) {
      console.warn('Redis: Max reconnection attempts reached. Stopping reconnection.');
      return null; // Stop retrying
    }
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
  // Enable offline queue with limit to handle temporary disconnections
  enableOfflineQueue: true,
  maxRetriesPerRequest: 3,
  // Connection timeout
  connectTimeout: 10000,
  // Lazy connect - connect on first command
  lazyConnect: true,
  // Keep alive to detect dead connections
  keepAlive: 30000,
  // Command timeout
  commandTimeout: 5000,
  // Enable ready check
  enableReadyCheck: true,
  // Auto reconnect
  enableAutoPipelining: false,
  // Family preference (IPv4 first)
  family: 4,
});

// Handle connection events
redis.on('error', (err) => {
  // Only log non-connection errors to reduce noise
  if (!err.message.includes('ECONNREFUSED') && !err.message.includes('Stream isn\'t writeable')) {
    console.error('Redis Client Error:', err.message);
  }
  isRedisConnected = false;
});

redis.on('connect', () => {
  reconnectAttempts = 0;
  isRedisConnected = false; // Not ready yet, just connected
});

redis.on('ready', () => {
  console.log('Redis Client Ready');
  isRedisConnected = true;
  reconnectAttempts = 0;
});

redis.on('close', () => {
  isRedisConnected = false;
});

redis.on('reconnecting', (delay: number) => {
  if (reconnectAttempts <= 3) {
    console.log(`Redis Client Reconnecting... (attempt ${reconnectAttempts})`);
  }
  isRedisConnected = false;
});

redis.on('end', () => {
  isRedisConnected = false;
});

// Helper function to check if Redis is available and ready
export function isRedisAvailable(): boolean {
  return redis.status === 'ready' && isRedisConnected;
}

// Helper to safely execute Redis commands
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
    // Handle stream errors and connection errors gracefully
    if (
      error?.message?.includes('Stream isn\'t writeable') ||
      error?.message?.includes('Connection is closed') ||
      error?.message?.includes('ECONNREFUSED') ||
      error?.code === 'NR_CLOSED'
    ) {
      return fallback;
    }
    // For other errors, still return fallback but log if it's unexpected
    if (!error?.message?.includes('max retries')) {
      // Only log unexpected errors
    }
    return fallback;
  }
}

// Test connection on startup (but don't block)
setTimeout(() => {
  redis.ping().catch(() => {
    // Silent fail - Redis might not be available yet
  });
}, 1000);

export default redis;

