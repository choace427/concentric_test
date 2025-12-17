import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import type { FastifyInstance } from 'fastify';
import { createAuthCookie, mockStudentUser } from '../__tests__/helpers/auth-helper';

vi.mock('../config/database', () => ({
  db: {
    selectFrom: vi.fn(),
    insertInto: vi.fn(),
  },
}));

vi.mock('../utils/jwt', () => ({
  generateToken: vi.fn(() => 'mock-token'),
}));

const mockStudentUser = {
  id: 'student-123',
  email: 'student@example.com',
  role: 'student' as const,
  suspended: false,
};

vi.mock('../middleware/auth', () => {
  return {
    authenticate: vi.fn(async (request: any, reply: any) => {
      const token = request.cookies?.token;
      if (!token) {
        return reply.status(401).send({ error: 'Unauthorized: No token provided' });
      }
      request.user = mockStudentUser;
    }),
    requireRole: vi.fn((role: string) => async (request: any, reply: any) => {
      const token = request.cookies?.token;
      if (!token) {
        return reply.status(401).send({ error: 'Unauthorized: No token provided' });
      }
      request.user = mockStudentUser;
    }),
  };
});

import { buildServer } from '../server';
import { db } from '../config/database';

describe('Student Routes', () => {
  let app: FastifyInstance;
  const authCookie = createAuthCookie({
    userId: mockStudentUser.id,
    email: mockStudentUser.email,
    role: mockStudentUser.role,
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    
    const createMockQuery = () => ({
      select: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      execute: vi.fn(),
      executeTakeFirst: vi.fn(),
    });

    vi.mocked(db.selectFrom).mockImplementation(createMockQuery as never);
    vi.mocked(db.insertInto).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returningAll: vi.fn().mockReturnValue({
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

  describe('GET /api/student/classes', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app.server).get('/api/student/classes');
      expect(response.status).toBe(401);
    });

    it('should return list of enrolled classes', async () => {
      const mockClasses = [
        {
          id: 'class-1',
          name: 'Math 101',
          description: 'Basic math',
          teacher_name: 'John Doe',
          enrolled_at: new Date(),
        },
      ];

      const mockExecute = vi.fn().mockResolvedValue(mockClasses);
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        execute: mockExecute,
      };
      vi.mocked(db.selectFrom).mockReturnValue(mockQuery as never);

      const response = await request(app.server)
        .get('/api/student/classes')
        .set('Cookie', authCookie);
      expect(response.status).toBe(200);
      expect(response.body.classes).toHaveLength(1);
      expect(response.body.classes[0].id).toBe(mockClasses[0].id);
      expect(response.body.classes[0].name).toBe(mockClasses[0].name);
    });
  });

  describe('GET /api/student/assignments', () => {
    it('should return list of assignments', async () => {
      const mockAssignments = [
        {
          id: 'assignment-1',
          title: 'Homework 1',
          class_id: 'class-1',
          class_name: 'Math 101',
          published: true,
          submitted: false,
        },
      ];

      const mockExecute = vi.fn().mockResolvedValue(mockAssignments);
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        execute: mockExecute,
      };
      vi.mocked(db.selectFrom).mockReturnValue(mockQuery as never);

      const response = await request(app.server)
        .get('/api/student/assignments')
        .set('Cookie', authCookie);
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/student/submissions', () => {
    it('should create a submission', async () => {
      const assignmentId = '123e4567-e89b-12d3-a456-426614174000';
      const mockSubmission = {
        id: 'submission-123',
        assignment_id: assignmentId,
        student_id: 'student-123',
        content: 'My submission',
        submitted_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      let selectFromCallCount = 0;
      const mockExecuteTakeFirst1 = vi.fn().mockResolvedValue({ id: assignmentId, published: true });
      const mockExecuteTakeFirst2 = vi.fn().mockResolvedValue(null);
      
      vi.mocked(db.selectFrom).mockImplementation((table: string) => {
        selectFromCallCount++;
        if (selectFromCallCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            innerJoin: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            executeTakeFirst: mockExecuteTakeFirst1,
          } as never;
        } else {
          return {
            select: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            executeTakeFirst: mockExecuteTakeFirst2,
          } as never;
        }
      });

      vi.mocked(db.insertInto).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returningAll: vi.fn().mockReturnValue({
            executeTakeFirst: vi.fn().mockResolvedValue(mockSubmission),
          }),
        }),
      } as never);

      const response = await request(app.server)
        .post('/api/student/submissions')
        .set('Cookie', authCookie)
        .send({
          assignment_id: assignmentId,
          content: 'My submission',
        });

      expect(response.status).toBe(201);
      expect(response.body.submission.id).toBe(mockSubmission.id);
      expect(response.body.submission.content).toBe(mockSubmission.content);
    });

    it('should return 400 for invalid request body', async () => {
      const response = await request(app.server)
        .post('/api/student/submissions')
        .set('Cookie', authCookie)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent assignment', async () => {
      const mockExecuteTakeFirst1 = vi.fn().mockResolvedValue(null);
      const mockExecuteTakeFirst2 = vi.fn().mockResolvedValue(null);
      
      let queryCallCount = 0;
      const createMockQuery = () => {
        queryCallCount++;
        if (queryCallCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            innerJoin: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            executeTakeFirst: mockExecuteTakeFirst1,
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          executeTakeFirst: mockExecuteTakeFirst2,
        };
      };
      vi.mocked(db.selectFrom).mockImplementation(createMockQuery as never);

      const response = await request(app.server)
        .post('/api/student/submissions')
        .set('Cookie', authCookie)
        .send({
          assignment_id: '00000000-0000-0000-0000-000000000000',
          content: 'My submission',
        });

      expect(response.status).toBe(404);
    });

    it('should return 409 for duplicate submission', async () => {
      const assignmentId = '123e4567-e89b-12d3-a456-426614174000';
      const mockExecuteTakeFirst1 = vi.fn().mockResolvedValue({ id: assignmentId, published: true });
      const mockExecuteTakeFirst2 = vi.fn().mockResolvedValue({ id: 'existing-submission' });
      
      let queryCallCount = 0;
      const createMockQuery = () => {
        queryCallCount++;
        if (queryCallCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            innerJoin: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            executeTakeFirst: mockExecuteTakeFirst1,
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          executeTakeFirst: mockExecuteTakeFirst2,
        };
      };
      vi.mocked(db.selectFrom).mockImplementation(createMockQuery as never);

      const response = await request(app.server)
        .post('/api/student/submissions')
        .set('Cookie', authCookie)
        .send({
          assignment_id: assignmentId,
          content: 'My submission',
        });

      expect(response.status).toBe(409);
    });
  });

  describe('GET /api/student/grades', () => {
    it('should return grades and average', async () => {
      const mockSubmissions = [
        {
          id: 'submission-1',
          assignment_id: 'assignment-1',
          grade: 85,
          feedback: 'Good work',
          assignment_title: 'Homework 1',
          class_name: 'Math 101',
        },
        {
          id: 'submission-2',
          assignment_id: 'assignment-2',
          grade: 90,
          feedback: 'Excellent',
          assignment_title: 'Homework 2',
          class_name: 'Math 101',
        },
      ];

      const mockExecute = vi.fn().mockResolvedValue(mockSubmissions);
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        execute: mockExecute,
      };
      vi.mocked(db.selectFrom).mockReturnValue(mockQuery as never);

      const response = await request(app.server)
        .get('/api/student/grades')
        .set('Cookie', authCookie);
      expect(response.status).toBe(200);
      expect(response.body.submissions).toEqual(mockSubmissions);
      expect(response.body.average).toBe(87.5);
    });
  });

  describe('POST /api/student/submissions - Error Handling', () => {
    it('should return 500 on unexpected database errors', async () => {
      const assignmentId = '123e4567-e89b-12d3-a456-426614174000';
      
      vi.mocked(db.selectFrom).mockReturnValue({
        select: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              executeTakeFirst: vi.fn().mockRejectedValue(new Error('Database connection failed')),
            }),
          }),
        }),
      } as never);

      const response = await request(app.server)
        .post('/api/student/submissions')
        .set('Cookie', authCookie)
        .send({
          assignment_id: assignmentId,
          content: 'My submission',
        });

      expect(response.status).toBe(500);
    });
  });
});

