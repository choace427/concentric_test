import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { db } from '../config/database';
import { isTokenBlacklisted, getCache, setCache, CACHE_KEYS, CACHE_TTL } from '../utils/cache';

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
}

export interface UserPayload {
  id: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  suspended: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: UserPayload;
  }
}

export type AuthenticatedRequest<T extends RouteGenericInterface = RouteGenericInterface> = FastifyRequest<T>;

export async function authenticate(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const token = request.cookies?.token;

    if (!token) {
      return reply.status(401).send({ error: 'Unauthorized: No token provided' });
    }

    if (!env.JWT_SECRET) {
      return reply.status(500).send({ error: 'Internal server error: JWT secret not configured' });
    }

    // Check if token is blacklisted
    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
      return reply.status(401).send({ error: 'Unauthorized: Token has been revoked' });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as unknown as JWTPayload;

    // Try to get user from cache first
    const cacheKey = `${CACHE_KEYS.USER}${decoded.userId}`;
    let user = await getCache<UserPayload>(cacheKey);

    if (!user) {
      // Fetch from database if not in cache
      const dbUser = await db
        .selectFrom('users')
        .select(['id', 'email', 'role', 'suspended'])
        .where('id', '=', decoded.userId)
        .executeTakeFirst();

      if (!dbUser) {
        return reply.status(401).send({ error: 'Unauthorized: User not found' });
      }

      user = dbUser;
      
      // Cache the user data
      await setCache(cacheKey, user, CACHE_TTL.USER);
    }

    if (user.suspended) {
      return reply.status(403).send({ error: 'Forbidden: User is suspended' });
    }

    request.user = user;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return reply.status(401).send({ error: 'Unauthorized: Invalid token' });
    }
    return reply.status(500).send({ error: 'Internal server error' });
  }
}

export function requireRole(...roles: ('admin' | 'teacher' | 'student')[]) {
  return async (request: AuthenticatedRequest, reply: FastifyReply): Promise<void> => {
    await authenticate(request, reply);

    if (!request.user) {
      return;
    }

    if (!roles.includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden: Insufficient permissions' });
    }
  };
}
