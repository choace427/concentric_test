import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from './server';

vi.mock('./config/database', () => ({
  db: {
    selectFrom: vi.fn(),
  },
}));

vi.mock('./routes/auth', () => ({
  authRoutes: vi.fn(),
}));

vi.mock('./routes/admin', () => ({
  adminRoutes: vi.fn(),
}));

vi.mock('./routes/teacher', () => ({
  teacherRoutes: vi.fn(),
}));

vi.mock('./routes/student', () => ({
  studentRoutes: vi.fn(),
}));

vi.mock('./routes/stats', () => ({
  statsRoutes: vi.fn(),
}));

describe('Server', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildServer();
    await app.ready();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app.server).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Server Configuration', () => {
    it('should configure logger for development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const devApp = await buildServer();
      await devApp.ready();
      
      expect(devApp).toBeDefined();
      await devApp.close();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should configure logger for production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const prodApp = await buildServer();
      await prodApp.ready();
      
      expect(prodApp).toBeDefined();
      await prodApp.close();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should configure CORS for production with allowed origins', async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalOrigins = process.env.ALLOWED_ORIGINS;
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://example.com,https://test.com';
      
      const prodApp = await buildServer();
      await prodApp.ready();
      
      expect(prodApp).toBeDefined();
      await prodApp.close();
      
      process.env.NODE_ENV = originalEnv;
      if (originalOrigins) {
        process.env.ALLOWED_ORIGINS = originalOrigins;
      } else {
        delete process.env.ALLOWED_ORIGINS;
      }
    });
  });

  describe('GET /api/test-db', () => {
    it('should return database connection status on success', async () => {
      const { db } = await import('./config/database');
      const mockUsers = [{ id: 'user-1', email: 'test@example.com' }];
      
      vi.mocked(db.selectFrom).mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            execute: vi.fn().mockResolvedValue(mockUsers),
          }),
        }),
      } as never);

      const response = await request(app.server).get('/api/test-db');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.message).toBe('Database connection successful');
      expect(response.body.sampleUser).toEqual(mockUsers[0]);
    });

    it('should return error status on database failure', async () => {
      const { db } = await import('./config/database');
      
      vi.mocked(db.selectFrom).mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            execute: vi.fn().mockRejectedValue(new Error('Connection failed')),
          }),
        }),
      } as never);

      const response = await request(app.server).get('/api/test-db');
      
      expect(response.status).toBe(500);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Database connection failed');
    });
  });

  describe('Global Error Handler', () => {
    it('should handle errors with status code', async () => {
      const testApp = await buildServer();
      testApp.get('/test-error', async () => {
        const error: Error & { statusCode?: number } = new Error('Test error');
        error.statusCode = 400;
        throw error;
      });
      await testApp.ready();

      const response = await request(testApp.server).get('/test-error');
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Internal server error');
      
      await testApp.close();
    });

    it('should handle errors without status code', async () => {
      const testApp = await buildServer();
      testApp.get('/test-error-500', async () => {
        throw new Error('Test error');
      });
      await testApp.ready();

      const response = await request(testApp.server).get('/test-error-500');
      
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
      
      await testApp.close();
    });

    it('should include error message in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const testApp = await buildServer();
      testApp.get('/test-dev-error', async () => {
        throw new Error('Development error');
      });
      await testApp.ready();

      const response = await request(testApp.server).get('/test-dev-error');
      
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
      expect(response.body.message).toBe('Development error');

      await testApp.close();
      process.env.NODE_ENV = originalEnv;
    });
  });
});

