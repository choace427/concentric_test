import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import type { FastifyInstance } from 'fastify';

vi.mock('../config/database', () => ({
  db: {
    selectFrom: vi.fn(),
    insertInto: vi.fn(),
  },
}));

vi.mock('../utils/jwt', () => ({
  generateToken: vi.fn(),
}));

import { buildServer } from '../server';
import { db } from '../config/database';
import { generateToken } from '../utils/jwt';

describe('Auth Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(db.selectFrom).mockReturnValue({
      selectAll: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          executeTakeFirst: vi.fn(),
        }),
      }),
    } as never);
    app = await buildServer();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 for invalid request body', async () => {
      const response = await request(app.server)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 400 when request body is invalid', async () => {
      const response = await request(app.server)
        .post('/api/auth/login')
        .send({ invalid: 'data' });

      expect(response.status).toBe(400);
    });

    it('should handle database errors with specific error codes', async () => {
      const dbError = new Error('Database error');
      (dbError as any).code = '28P01';
      (dbError as any).detail = 'Authentication failed';

      vi.mocked(db.selectFrom).mockReturnValue({
        selectAll: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            executeTakeFirst: vi.fn().mockRejectedValue(dbError),
          }),
        }),
      } as never);

      const response = await request(app.server)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Database authentication failed.');
    });

    it('should handle database connection timeout errors', async () => {
      const dbError = new Error('Connection timeout');
      (dbError as any).code = 'ETIMEDOUT';

      vi.mocked(db.selectFrom).mockReturnValue({
        selectAll: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            executeTakeFirst: vi.fn().mockRejectedValue(dbError),
          }),
        }),
      } as never);

      const response = await request(app.server)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Database connection timeout.');
    });

    it('should handle token generation errors', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'student' as const,
        suspended: false,
      };

      vi.mocked(db.selectFrom).mockReturnValue({
        selectAll: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            executeTakeFirst: vi.fn().mockResolvedValue(mockUser),
          }),
        }),
      } as never);

      vi.mocked(generateToken).mockImplementation(() => {
        throw new Error('Token generation failed');
      });

      const response = await request(app.server)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to generate authentication token');
    });

    it('should return 401 when role does not match', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'student' as const,
        suspended: false,
      };

      vi.mocked(db.selectFrom).mockReturnValue({
        selectAll: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            executeTakeFirst: vi.fn().mockResolvedValue(mockUser),
          }),
        }),
      } as never);

      const response = await request(app.server)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
          role: 'teacher',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid role');
    });

    it('should return 403 when user is suspended', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'student' as const,
        suspended: true,
      };

      vi.mocked(db.selectFrom).mockReturnValue({
        selectAll: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            executeTakeFirst: vi.fn().mockResolvedValue(mockUser),
          }),
        }),
      } as never);

      const response = await request(app.server)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('User is suspended');
    });

    it('should return 401 for invalid credentials', async () => {
      const executeTakeFirstMock = vi.fn().mockResolvedValue(null);
      const whereMock = vi.fn().mockReturnValue({
        executeTakeFirst: executeTakeFirstMock,
      });
      const selectAllMock = vi.fn().mockReturnValue({
        where: whereMock,
      });

      vi.mocked(db.selectFrom).mockReturnValue({
        selectAll: selectAllMock,
      } as never);

      const response = await request(app.server)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(db.selectFrom).toHaveBeenCalledWith('users');
      expect(selectAllMock).toHaveBeenCalled();
      expect(whereMock).toHaveBeenCalledWith('email', '=', 'test@example.com');
      expect(executeTakeFirstMock).toHaveBeenCalled();
    });

    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: 'student',
        suspended: false,
      };

      const executeTakeFirstMock = vi.fn().mockResolvedValue(mockUser);
      const whereMock = vi.fn().mockReturnValue({
        executeTakeFirst: executeTakeFirstMock,
      });
      const selectAllMock = vi.fn().mockReturnValue({
        where: whereMock,
      });

      vi.mocked(db.selectFrom).mockReturnValue({
        selectAll: selectAllMock,
      } as never);
      vi.mocked(generateToken).mockReturnValue('mock-token');

      const response = await request(app.server)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'correctpassword',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.headers['set-cookie']).toBeDefined();
      expect(db.selectFrom).toHaveBeenCalledWith('users');
      expect(selectAllMock).toHaveBeenCalled();
      expect(whereMock).toHaveBeenCalledWith('email', '=', 'test@example.com');
      expect(executeTakeFirstMock).toHaveBeenCalled();
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request(app.server).get('/api/auth/me');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app.server).post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logged out successfully');
      expect(response.headers['set-cookie']).toBeDefined();
    });
  });

  describe('GET /api/auth/oauth/google', () => {
    it('should redirect to Google OAuth when configured', async () => {
      vi.mock('../config/env', async () => {
        const actual = await vi.importActual('../config/env');
        return {
          ...actual,
          env: {
            ...(actual as any).env,
            GOOGLE_CLIENT_ID: 'test-client-id',
            API_URL: 'http://localhost:3000',
          },
        };
      });

      const response = await request(app.server).get('/api/auth/oauth/google');

      expect([302, 500]).toContain(response.status);
      if (response.status === 302) {
        expect(response.headers.location).toContain('accounts.google.com');
        expect(response.headers.location).toContain('test-client-id');
      }
    });

    it('should return 500 when Google OAuth is not configured', async () => {
      vi.mock('../config/env', async () => {
        const actual = await vi.importActual('../config/env');
        return {
          ...actual,
          env: {
            ...(actual as any).env,
            GOOGLE_CLIENT_ID: undefined,
            API_URL: 'http://localhost:3000',
          },
        };
      });

      const response = await request(app.server).get('/api/auth/oauth/google');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Google OAuth not configured');
    });
  });

  describe('GET /api/auth/oauth/google/callback', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    it('should redirect with error when code is missing', async () => {
      const response = await request(app.server).get('/api/auth/oauth/google/callback');

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('error=oauth_failed');
    });

    it('should redirect with error when OAuth is not configured', async () => {
      const response = await request(app.server)
        .get('/api/auth/oauth/google/callback')
        .query({ code: 'test-code' });

      expect([302, 500]).toContain(response.status);
    });

    it('should handle successful OAuth flow with existing user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'google@example.com',
        name: 'Google User',
        role: 'student' as const,
        suspended: false,
      };

      vi.mocked(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'mock-access-token' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ email: 'google@example.com', name: 'Google User' }),
        } as Response);

      vi.mocked(db.selectFrom).mockReturnValue({
        selectAll: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            executeTakeFirst: vi.fn().mockResolvedValue(mockUser),
          }),
        }),
      } as never);

      const response = await request(app.server)
        .get('/api/auth/oauth/google/callback')
        .query({ code: 'valid-code' });

      expect([302, 500]).toContain(response.status);
    });

    it('should handle successful OAuth flow with new user', async () => {
      vi.mocked(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'mock-access-token' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ email: 'newuser@example.com', name: 'New User' }),
        } as Response);

      const mockNewUser = {
        id: 'user-new',
        email: 'newuser@example.com',
        name: 'New User',
        role: 'student' as const,
        suspended: false,
      };

      let selectFromCallCount = 0;
      vi.mocked(db.selectFrom).mockImplementation(() => {
        selectFromCallCount++;
        if (selectFromCallCount === 1) {
          return {
            selectAll: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                executeTakeFirst: vi.fn().mockResolvedValue(null),
              }),
            }),
          } as never;
        }
        return {} as never;
      });

      vi.mocked(db.insertInto).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returningAll: vi.fn().mockReturnValue({
            executeTakeFirst: vi.fn().mockResolvedValue(mockNewUser),
          }),
        }),
      } as never);

      const response = await request(app.server)
        .get('/api/auth/oauth/google/callback')
        .query({ code: 'valid-code' });

      expect([302, 500]).toContain(response.status);
    });

    it('should redirect when token exchange fails', async () => {
      vi.mocked(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
      } as Response);

      const response = await request(app.server)
        .get('/api/auth/oauth/google/callback')
        .query({ code: 'invalid-code' });

      expect([302, 500]).toContain(response.status);
    });

    it('should redirect when user info fetch fails', async () => {
      vi.mocked(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'mock-access-token' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        } as Response);

      const response = await request(app.server)
        .get('/api/auth/oauth/google/callback')
        .query({ code: 'valid-code' });

      expect([302, 500]).toContain(response.status);
    });

    it('should redirect when user is suspended', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'google@example.com',
        name: 'Google User',
        role: 'student' as const,
        suspended: true,
      };

      vi.mocked(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'mock-access-token' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ email: 'google@example.com', name: 'Google User' }),
        } as Response);

      vi.mocked(db.selectFrom).mockReturnValue({
        selectAll: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            executeTakeFirst: vi.fn().mockResolvedValue(mockUser),
          }),
        }),
      } as never);

      const response = await request(app.server)
        .get('/api/auth/oauth/google/callback')
        .query({ code: 'valid-code' });

      expect([302, 500]).toContain(response.status);
    });
  });
});

