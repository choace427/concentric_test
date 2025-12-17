import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import type { FastifyInstance } from 'fastify';
import { createAuthCookie } from '../__tests__/helpers/auth-helper';

vi.mock('../config/database', () => ({
  db: {
    selectFrom: vi.fn(),
  },
}));

vi.mock('../utils/jwt', () => ({
  generateToken: vi.fn(() => 'mock-token'),
}));

const mockUser = {
  id: 'user-123',
  email: 'user@example.com',
  role: 'admin' as const,
  suspended: false,
};

vi.mock('../middleware/auth', () => {
  return {
    authenticate: vi.fn(async (request: any, reply: any) => {
      const token = request.cookies?.token;
      if (!token) {
        return reply.status(401).send({ error: 'Unauthorized: No token provided' });
      }
      request.user = mockUser;
    }),
    requireRole: vi.fn((role: string) => async (request: any, reply: any) => {
      const token = request.cookies?.token;
      if (!token) {
        return reply.status(401).send({ error: 'Unauthorized: No token provided' });
      }
      request.user = mockUser;
    }),
  };
});

import { buildServer } from '../server';
import { db } from '../config/database';

describe('Stats Routes', () => {
  let app: FastifyInstance | null = null;
  const authCookie = createAuthCookie({
    userId: mockUser.id,
    email: mockUser.email,
    role: mockUser.role,
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    
    const createMockQuery = () => ({
      select: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      execute: vi.fn(),
      executeTakeFirst: vi.fn(),
    });

    vi.mocked(db.selectFrom).mockImplementation(createMockQuery as never);

    app = await buildServer();
    await app.ready();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  describe('GET /api/v0/stats/average-grades', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app.server).get('/api/v0/stats/average-grades');
      expect(response.status).toBe(401);
    });

    it('should return average grades', async () => {
      const mockResult = {
        average_grade: '85.5',
        total_submissions: 10,
      };

      const mockExecuteTakeFirst = vi.fn().mockResolvedValue(mockResult);
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirst: mockExecuteTakeFirst,
      };
      vi.mocked(db.selectFrom).mockReturnValue(mockQuery as never);

      const response = await request(app.server)
        .get('/api/v0/stats/average-grades')
        .set('Cookie', authCookie);
      expect(response.status).toBe(200);
      expect(response.body.average_grade).toBe(85.5);
      expect(response.body.total_submissions).toBe(10);
    });

    it('should return 0 when no grades exist', async () => {
      const mockExecuteTakeFirst = vi.fn().mockResolvedValue(null);
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirst: mockExecuteTakeFirst,
      };
      vi.mocked(db.selectFrom).mockReturnValue(mockQuery as never);

      const response = await request(app.server)
        .get('/api/v0/stats/average-grades')
        .set('Cookie', authCookie);
      expect(response.status).toBe(200);
      expect(response.body.average_grade).toBe(0);
      expect(response.body.total_submissions).toBe(0);
    });

    it('should handle average grade calculation with decimal rounding', async () => {
      const mockResult = {
        average_grade: '85.555',
        total_submissions: 10,
      };

      const mockExecuteTakeFirst = vi.fn().mockResolvedValue(mockResult);
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirst: mockExecuteTakeFirst,
      };
      vi.mocked(db.selectFrom).mockReturnValue(mockQuery as never);

      const response = await request(app.server)
        .get('/api/v0/stats/average-grades')
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body.average_grade).toBe(85.6);
    });
  });

  describe('GET /api/v0/stats/average-grades/:id', () => {
    it('should return average grades for a class', async () => {
      const mockClass = { id: 'class-123' };
      const mockResult = {
        average_grade: '88.0',
        total_submissions: 5,
      };

      let callCount = 0;
      const mockExecuteTakeFirst1 = vi.fn().mockResolvedValue(mockClass);
      const mockExecuteTakeFirst2 = vi.fn().mockResolvedValue(mockResult);
      
      vi.mocked(db.selectFrom).mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            executeTakeFirst: mockExecuteTakeFirst1,
          } as never;
        }
        return {
          select: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          executeTakeFirst: mockExecuteTakeFirst2,
        } as never;
      });

      const response = await request(app.server)
        .get('/api/v0/stats/average-grades/class-123')
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body.class_id).toBe('class-123');
      expect(response.body.average_grade).toBe(88.0);
    });

    it('should handle average grade calculation with decimal rounding for class', async () => {
      const mockClass = { id: 'class-123' };
      const mockResult = {
        average_grade: '88.777',
        total_submissions: 5,
      };

      let callCount = 0;
      const mockExecuteTakeFirst1 = vi.fn().mockResolvedValue(mockClass);
      const mockExecuteTakeFirst2 = vi.fn().mockResolvedValue(mockResult);
      
      vi.mocked(db.selectFrom).mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            executeTakeFirst: mockExecuteTakeFirst1,
          } as never;
        }
        return {
          select: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          executeTakeFirst: mockExecuteTakeFirst2,
        } as never;
      });

      const response = await request(app.server)
        .get('/api/v0/stats/average-grades/class-123')
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body.average_grade).toBe(88.8);
    });

    it('should return 0 when no grades exist for class', async () => {
      const mockClass = { id: 'class-123' };
      const mockResult = null;

      let callCount = 0;
      const mockExecuteTakeFirst1 = vi.fn().mockResolvedValue(mockClass);
      const mockExecuteTakeFirst2 = vi.fn().mockResolvedValue(mockResult);
      
      vi.mocked(db.selectFrom).mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            executeTakeFirst: mockExecuteTakeFirst1,
          } as never;
        }
        return {
          select: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          executeTakeFirst: mockExecuteTakeFirst2,
        } as never;
      });

      const response = await request(app.server)
        .get('/api/v0/stats/average-grades/class-123')
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body.average_grade).toBe(0);
      expect(response.body.total_submissions).toBe(0);
    });

    it('should return 404 for non-existent class', async () => {
      const mockExecuteTakeFirst = vi.fn().mockResolvedValue(null);
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirst: mockExecuteTakeFirst,
      };
      vi.mocked(db.selectFrom).mockReturnValue(mockQuery as never);

      const response = await request(app.server)
        .get('/api/v0/stats/average-grades/non-existent')
        .set('Cookie', authCookie);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/v0/stats/teacher-names', () => {
    it('should return list of teacher names', async () => {
      const mockTeachers = [
        { id: 'teacher-1', name: 'John Doe', email: 'john@example.com' },
        { id: 'teacher-2', name: 'Jane Smith', email: 'jane@example.com' },
      ];

      const mockExecute = vi.fn().mockResolvedValue(mockTeachers);
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        execute: mockExecute,
      };
      vi.mocked(db.selectFrom).mockReturnValue(mockQuery as never);

      const response = await request(app.server)
        .get('/api/v0/stats/teacher-names')
        .set('Cookie', authCookie);
      expect(response.status).toBe(200);
      expect(response.body.teachers).toEqual(mockTeachers);
    });
  });

  describe('GET /api/v0/stats/student-names', () => {
    it('should return list of student names', async () => {
      const mockStudents = [
        { id: 'student-1', name: 'Alice Johnson', email: 'alice@example.com' },
        { id: 'student-2', name: 'Bob Williams', email: 'bob@example.com' },
      ];

      const mockExecute = vi.fn().mockResolvedValue(mockStudents);
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        execute: mockExecute,
      };
      vi.mocked(db.selectFrom).mockReturnValue(mockQuery as never);

      const response = await request(app.server)
        .get('/api/v0/stats/student-names')
        .set('Cookie', authCookie);
      expect(response.status).toBe(200);
      expect(response.body.students).toEqual(mockStudents);
    });
  });

  describe('GET /api/v0/stats/classes', () => {
    it('should return list of classes', async () => {
      const mockClasses = [
        {
          id: 'class-1',
          name: 'Math 101',
          description: 'Basic math',
          teacher_id: 'teacher-1',
          teacher_name: 'John Doe',
        },
        {
          id: 'class-2',
          name: 'Science 101',
          description: 'Basic science',
          teacher_id: 'teacher-2',
          teacher_name: 'Jane Smith',
        },
      ];

      const mockExecute = vi.fn().mockResolvedValue(mockClasses);
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        execute: mockExecute,
      };
      vi.mocked(db.selectFrom).mockReturnValue(mockQuery as never);

      const response = await request(app.server)
        .get('/api/v0/stats/classes')
        .set('Cookie', authCookie);
      expect(response.status).toBe(200);
      expect(response.body.classes).toEqual(mockClasses);
    });
  });

  describe('GET /api/v0/stats/classes/:id', () => {
    it('should return students in a class', async () => {
      const mockClass = { id: 'class-123' };
      const mockStudents = [
        {
          id: 'student-1',
          name: 'Alice Johnson',
          email: 'alice@example.com',
          enrolled_at: new Date(),
        },
        {
          id: 'student-2',
          name: 'Bob Williams',
          email: 'bob@example.com',
          enrolled_at: new Date(),
        },
      ];

      let callCount = 0;
      const mockExecuteTakeFirst = vi.fn().mockResolvedValue(mockClass);
      const mockExecute = vi.fn().mockResolvedValue(mockStudents);
      
      vi.mocked(db.selectFrom).mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            executeTakeFirst: mockExecuteTakeFirst,
          } as never;
        }
        return {
          select: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          execute: mockExecute,
        } as never;
      });

      const response = await request(app.server)
        .get('/api/v0/stats/classes/class-123')
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body.class_id).toBe('class-123');
      expect(response.body.students).toHaveLength(2);
      expect(response.body.students[0].id).toBe(mockStudents[0].id);
      expect(response.body.students[0].name).toBe(mockStudents[0].name);
      expect(response.body.students[0].email).toBe(mockStudents[0].email);
      expect(response.body.students[1].id).toBe(mockStudents[1].id);
      expect(response.body.students[1].name).toBe(mockStudents[1].name);
      expect(response.body.students[1].email).toBe(mockStudents[1].email);
    });

    it('should return 404 for non-existent class', async () => {
      const mockExecuteTakeFirst = vi.fn().mockResolvedValue(null);
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirst: mockExecuteTakeFirst,
      };
      vi.mocked(db.selectFrom).mockReturnValue(mockQuery as never);

      const response = await request(app.server)
        .get('/api/v0/stats/classes/non-existent')
        .set('Cookie', authCookie);

      expect(response.status).toBe(404);
    });
  });
});

