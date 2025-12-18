import { redis, safeRedisCommand } from '../config/redis';

/**
 * Cache utility functions for Redis
 */

// Cache key prefixes
export const CACHE_KEYS = {
  USER: 'user:',
  STATS_AVG_GRADES: 'stats:avg_grades',
  STATS_AVG_GRADES_CLASS: 'stats:avg_grades:class:',
  STATS_TEACHER_NAMES: 'stats:teacher_names',
  STATS_STUDENT_NAMES: 'stats:student_names',
  STATS_CLASSES: 'stats:classes',
  STATS_CLASS: 'stats:class:',
  STATS_CLASS_STUDENTS: 'stats:class_students:',
  TOKEN_BLACKLIST: 'token:blacklist:',
  RATE_LIMIT: 'rate_limit:',
} as const;

// Default TTL values (in seconds)
export const CACHE_TTL = {
  USER: 300, // 5 minutes
  STATS: 60, // 1 minute
  CLASSES: 300, // 5 minutes
  TOKEN_BLACKLIST: 7 * 24 * 60 * 60, // 7 days (matches JWT expiry)
} as const;

/**
 * Get cached value
 */
export async function getCache<T>(key: string): Promise<T | null> {
  return safeRedisCommand(async () => {
    const value = await redis.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  }, null);
}

/**
 * Set cached value with TTL
 */
export async function setCache(key: string, value: unknown, ttl: number = CACHE_TTL.STATS): Promise<void> {
  await safeRedisCommand(async () => {
    await redis.setex(key, ttl, JSON.stringify(value));
  }, undefined);
}

/**
 * Delete cached value
 */
export async function deleteCache(key: string): Promise<void> {
  await safeRedisCommand(async () => {
    await redis.del(key);
  }, undefined);
}

/**
 * Delete multiple cache keys matching a pattern
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  await safeRedisCommand(async () => {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }, undefined);
}

/**
 * Invalidate all stats cache
 */
export async function invalidateStatsCache(): Promise<void> {
  await Promise.all([
    deleteCache(CACHE_KEYS.STATS_AVG_GRADES),
    deleteCachePattern(`${CACHE_KEYS.STATS_AVG_GRADES_CLASS}*`),
    deleteCache(CACHE_KEYS.STATS_TEACHER_NAMES),
    deleteCache(CACHE_KEYS.STATS_STUDENT_NAMES),
    deleteCache(CACHE_KEYS.STATS_CLASSES),
    deleteCachePattern(`${CACHE_KEYS.STATS_CLASS}*`),
    deleteCachePattern(`${CACHE_KEYS.STATS_CLASS_STUDENTS}*`),
  ]);
}

/**
 * Invalidate class-related cache
 */
export async function invalidateClassCache(classId?: string): Promise<void> {
  await Promise.all([
    deleteCache(CACHE_KEYS.STATS_CLASSES),
    deleteCache(CACHE_KEYS.STATS_AVG_GRADES),
    ...(classId
      ? [
          deleteCache(`${CACHE_KEYS.STATS_CLASS}${classId}`),
          deleteCache(`${CACHE_KEYS.STATS_CLASS_STUDENTS}${classId}`),
          deleteCache(`${CACHE_KEYS.STATS_AVG_GRADES_CLASS}${classId}`),
        ]
      : []),
  ]);
}

/**
 * Invalidate user cache
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  await deleteCache(`${CACHE_KEYS.USER}${userId}`);
}

/**
 * Check if token is blacklisted
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  return safeRedisCommand(async () => {
    const result = await redis.exists(`${CACHE_KEYS.TOKEN_BLACKLIST}${token}`);
    return result === 1;
  }, false); // Fail open - if Redis is down, allow token
}

/**
 * Blacklist a token
 */
export async function blacklistToken(token: string): Promise<void> {
  await safeRedisCommand(async () => {
    await redis.setex(
      `${CACHE_KEYS.TOKEN_BLACKLIST}${token}`,
      CACHE_TTL.TOKEN_BLACKLIST,
      '1'
    );
  }, undefined);
}

/**
 * Get or set cached value (cache-aside pattern)
 */
export async function getOrSetCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = CACHE_TTL.STATS
): Promise<T> {
  const cached = await getCache<T>(key);
  if (cached !== null) {
    return cached;
  }

  const value = await fetchFn();
  await setCache(key, value, ttl);
  return value;
}

