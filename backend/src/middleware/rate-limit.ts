import { FastifyRequest, FastifyReply } from 'fastify';
import { redis, safeRedisCommand } from '../config/redis';
import { CACHE_KEYS } from '../utils/cache';

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum number of requests per window
  keyGenerator?: (request: FastifyRequest) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

const defaultKeyGenerator = (request: FastifyRequest): string => {
  // Use IP address as default key
  const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';
  return Array.isArray(ip) ? ip[0] : ip;
};

/**
 * Rate limiting middleware using Redis
 */
export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Use safeRedisCommand to handle all Redis operations
    const result = await safeRedisCommand(async () => {
      const key = `${CACHE_KEYS.RATE_LIMIT}${keyGenerator(request)}`;
      const windowSeconds = Math.ceil(windowMs / 1000);

      // Get current count
      const current = await redis.incr(key);
      
      // Set expiry on first request in window
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      // Get TTL for headers
      const ttl = await redis.ttl(key);

      return { current, ttl: ttl > 0 ? ttl : windowSeconds, windowSeconds };
    }, null);

    // If Redis is unavailable, skip rate limiting (fail open)
    if (!result) {
      return;
    }

    const { current, ttl, windowSeconds } = result;

    // Check if limit exceeded
    if (current > max) {
      reply
        .status(429)
        .header('Retry-After', ttl.toString())
        .header('X-RateLimit-Limit', max.toString())
        .header('X-RateLimit-Remaining', '0')
        .header('X-RateLimit-Reset', new Date(Date.now() + ttl * 1000).toISOString())
        .send({
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${ttl} seconds.`,
        });
      return;
    }

    // Set rate limit headers
    reply
      .header('X-RateLimit-Limit', max.toString())
      .header('X-RateLimit-Remaining', Math.max(0, max - current).toString())
      .header('X-RateLimit-Reset', new Date(Date.now() + ttl * 1000).toISOString());
  };
}

/**
 * Pre-configured rate limiters
 */
export const rateLimiters = {
  // General API rate limit: 100 requests per minute
  general: rateLimit({
    windowMs: 60 * 1000,
    max: 100,
  }),

  // Strict rate limit: 10 requests per minute (for sensitive endpoints)
  strict: rateLimit({
    windowMs: 60 * 1000,
    max: 10,
  }),

  // Auth rate limit: 5 login attempts per 15 minutes
  auth: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyGenerator: (request) => {
      const ip = defaultKeyGenerator(request);
      const email = (request.body as any)?.email || 'unknown';
      return `${ip}:${email}`;
    },
  }),
};

