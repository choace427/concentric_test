import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { authenticate, requireRole } from './auth';
import { db } from '../config/database';
import { env } from '../config/env';

vi.mock('../config/database', () => ({
  db: {
    selectFrom: vi.fn(),
  },
}));

vi.mock('../config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret',
  },
}));

class JsonWebTokenError extends Error {
  name = 'JsonWebTokenError';
  constructor(message: string) {
    super(message);
  }
}

vi.mock('jsonwebtoken', () => {
  class MockJsonWebTokenError extends Error {
    name = 'JsonWebTokenError';
    constructor(message: string) {
      super(message);
    }
  }

  return {
    default: {
      verify: vi.fn(),
      JsonWebTokenError: MockJsonWebTokenError,
    },
    JsonWebTokenError: MockJsonWebTokenError,
  };
});

describe('Auth Middleware', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockRequest = {
      cookies: {},
      user: undefined,
    };

    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
  });

  describe('authenticate', () => {
    it('should return 401 when no token is provided', async () => {
      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Unauthorized: No token provided' });
    });

    it('should return 500 when JWT_SECRET is not configured', async () => {
      const originalSecret = env.JWT_SECRET;
      (env as any).JWT_SECRET = undefined;

      mockRequest.cookies = { token: 'test-token' };

      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Internal server error: JWT secret not configured' });

      (env as any).JWT_SECRET = originalSecret;
    });

    it('should return 401 when user is not found', async () => {
      const jwt = await import('jsonwebtoken');
      vi.mocked(jwt.default.verify).mockReturnValue({ userId: 'user-123' } as never);

      mockRequest.cookies = { token: 'valid-token' };

      vi.mocked(db.selectFrom).mockReturnValue({
        select: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            executeTakeFirst: vi.fn().mockResolvedValue(null),
          }),
        }),
      } as never);

      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Unauthorized: User not found' });
    });

    it('should return 403 when user is suspended', async () => {
      const jwt = await import('jsonwebtoken');
      vi.mocked(jwt.default.verify).mockReturnValue({ userId: 'user-123' } as never);

      mockRequest.cookies = { token: 'valid-token' };

      vi.mocked(db.selectFrom).mockReturnValue({
        select: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            executeTakeFirst: vi.fn().mockResolvedValue({
              id: 'user-123',
              email: 'test@example.com',
              role: 'student',
              suspended: true,
            }),
          }),
        }),
      } as never);

      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Forbidden: User is suspended' });
    });

    it('should return 401 when token is invalid', async () => {
      const jwt = await import('jsonwebtoken');
      const jwtError = new (jwt as any).default.JsonWebTokenError('Invalid token');
      vi.mocked(jwt.default.verify).mockImplementation(() => {
        throw jwtError;
      });

      mockRequest.cookies = { token: 'invalid-token' };

      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Unauthorized: Invalid token' });
    });

    it('should set user on request when authentication succeeds', async () => {
      const jwt = await import('jsonwebtoken');
      vi.mocked(jwt.default.verify).mockReturnValue({ userId: 'user-123' } as never);

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'student' as const,
        suspended: false,
      };

      mockRequest.cookies = { token: 'valid-token' };

      vi.mocked(db.selectFrom).mockReturnValue({
        select: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            executeTakeFirst: vi.fn().mockResolvedValue(mockUser),
          }),
        }),
      } as never);

      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockRequest.user).toEqual(mockUser);
      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should return 500 on unexpected errors', async () => {
      const jwt = await import('jsonwebtoken');
      vi.mocked(jwt.default.verify).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      mockRequest.cookies = { token: 'test-token' };

      await authenticate(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('requireRole', () => {
    it('should return 403 when user role is not in allowed roles', async () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'student',
        suspended: false,
      };

      const middleware = requireRole('admin', 'teacher');
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Forbidden: Insufficient permissions' });
    });

    it('should not call reply when user role is allowed', async () => {
      const jwt = await import('jsonwebtoken');
      vi.mocked(jwt.default.verify).mockReturnValue({ userId: 'user-123' } as never);

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'admin' as const,
        suspended: false,
      };

      mockRequest.cookies = { token: 'valid-token' };

      vi.mocked(db.selectFrom).mockReturnValue({
        select: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            executeTakeFirst: vi.fn().mockResolvedValue(mockUser),
          }),
        }),
      } as never);

      const middleware = requireRole('admin', 'teacher');
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockRequest.user).toEqual(mockUser);
      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should not call reply when authenticate fails', async () => {
      mockRequest.cookies = {};
      mockRequest.user = undefined;

      const middleware = requireRole('admin');
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(401);
    });
  });
});

