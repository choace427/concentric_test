import { FastifyRequest, FastifyReply } from 'fastify';
import { redis, safeRedisCommand } from '../config/redis';
import { CACHE_KEYS } from '../utils/cache';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyGenerator?: (request: FastifyRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

const defaultKeyGenerator = (request: FastifyRequest): string => {
  const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';
  return Array.isArray(ip) ? ip[0] : ip;
};

export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    keyGenerator = defaultKeyGenerator,
  } = options;

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const result = await safeRedisCommand(async () => {
      const key = `${CACHE_KEYS.RATE_LIMIT}${keyGenerator(request)}`;
      const windowSeconds = Math.ceil(windowMs / 1000);

      const current = await redis.incr(key);
      
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      const ttl = await redis.ttl(key);

      return { current, ttl: ttl > 0 ? ttl : windowSeconds, windowSeconds };
    }, null);

    if (!result) {
      return;
    }

    const { current, ttl} = result;

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

    reply
      .header('X-RateLimit-Limit', max.toString())
      .header('X-RateLimit-Remaining', Math.max(0, max - current).toString())
      .header('X-RateLimit-Reset', new Date(Date.now() + ttl * 1000).toISOString());
  };
}

export const rateLimiters = {
  general: rateLimit({
    windowMs: 60 * 1000,
    max: 100,
  }),

  strict: rateLimit({
    windowMs: 60 * 1000,
    max: 10,
  }),

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

