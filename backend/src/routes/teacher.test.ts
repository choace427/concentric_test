import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import type { FastifyInstance } from 'fastify';
import { createAuthCookie, mockTeacherUser } from '../__tests__/helpers/auth-helper';

vi.mock('../config/database', () => ({
  db: {
    selectFrom: vi.fn(),
    insertInto: vi.fn(),
    updateTable: vi.fn(),
    deleteFrom: vi.fn(),
  },
}));

vi.mock('../utils/jwt', () => ({
  generateToken: vi.fn(() => 'mock-token'),
}));

const mockTeacherUser = {
  id: 'teacher-123',
  email: 'teacher@example.com',
  role: 'teacher' as const,
  suspended: false,
};

vi.mock('../middleware/auth', () => {
  return {
    authenticate: vi.fn(async (request: any, reply: any) => {
      const token = request.cookies?.token;
      if (!token) {
        return reply.status(401).send({ error: 'Unauthorized: No token provided' });
      }
      request.user = mockTeacherUser;
    }),
    requireRole: vi.fn((role: string) => async (request: any, reply: any) => {
      const token = request.cookies?.token;
      if (!token) {
        return reply.status(401).send({ error: 'Unauthorized: No token provided' });
      }
      request.user = mockTeacherUser;
    }),
  };
});

import { buildServer } from '../server';
import { db } from '../config/database';

describe('Teacher Routes', () => {
  let app: FastifyInstance;
  const authCookie = createAuthCookie({
    userId: mockTeacherUser.id,
    email: mockTeacherUser.email,
    role: mockTeacherUser.role,
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    
    const createMockQuery = () => ({
      select: vi.fn().mockReturnThis(),
      selectAll: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
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
    vi.mocked(db.updateTable).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returningAll: vi.fn().mockReturnValue({
            executeTakeFirst: vi.fn(),
          }),
          execute: vi.fn(),
        }),
      }),
    } as never);
    vi.mocked(db.deleteFrom).mockReturnValue({
      where: vi.fn().mockReturnValue({
        execute: vi.fn(),
      }),
    } as never);

    app = await buildServer();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/teacher/classes', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app.server).get('/api/teacher/classes');
      expect(response.status).toBe(401);
    });

    it('should return list of teacher classes', async () => {
      const mockClasses = [
        { id: 'class-1', name: 'Math 101', description: 'Basic math', student_count: 10 },
        { id: 'class-2', name: 'Science 101', description: null, student_count: 5 },
      ];

      const mockExecute = vi.fn().mockResolvedValue(mockClasses);
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        selectAll: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        execute: mockExecute,
      };
      vi.mocked(db.selectFrom).mockReturnValue(mockQuery as never);

      const response = await request(app.server)
        .get('/api/teacher/classes')
        .set('Cookie', authCookie);
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/teacher/classes', () => {
    it('should create a class', async () => {
      const mockClass = {
        id: 'class-123',
        name: 'New Class',
        description: 'New class description',
        teacher_id: 'teacher-123',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockExecuteTakeFirst = vi.fn().mockResolvedValue(mockClass);
      vi.mocked(db.insertInto).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returningAll: vi.fn().mockReturnValue({
            executeTakeFirst: mockExecuteTakeFirst,
          }),
        }),
      } as never);

      const response = await request(app.server)
        .post('/api/teacher/classes')
        .set('Cookie', authCookie)
        .send({ name: 'New Class', description: 'New class description' });

      expect(response.status).toBe(201);
      expect(response.body.class.id).toBe(mockClass.id);
      expect(response.body.class.name).toBe(mockClass.name);
      expect(response.body.class.description).toBe(mockClass.description);
    });

    it('should return 400 for invalid request body', async () => {
      const response = await request(app.server)
        .post('/api/teacher/classes')
        .set('Cookie', authCookie)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/teacher/classes/:id', () => {
    it('should update a class', async () => {
      const mockClass = {
        id: 'class-123',
        name: 'Updated Class',
        description: 'Updated description',
        updated_at: new Date(),
      };

      const mockExecuteTakeFirst = vi.fn().mockResolvedValue(mockClass);
      const mockQuery = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returningAll: vi.fn().mockReturnValue({
          executeTakeFirst: mockExecuteTakeFirst,
        }),
      };
      vi.mocked(db.updateTable).mockReturnValue(mockQuery as never);

      const response = await request(app.server)
        .put('/api/teacher/classes/class-123')
        .set('Cookie', authCookie)
        .send({ name: 'Updated Class', description: 'Updated description' });

      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/teacher/classes/:id', () => {
    it('should delete a class', async () => {
      const mockExecute = vi.fn().mockResolvedValue([{ id: 'class-123' }]);
      const mockQuery = {
        where: vi.fn().mockReturnThis(),
        execute: mockExecute,
      };
      vi.mocked(db.deleteFrom).mockReturnValue(mockQuery as never);

      const response = await request(app.server)
        .delete('/api/teacher/classes/class-123')
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/teacher/classes/:id/students/:studentId', () => {
    it('should add student to class', async () => {
      const mockEnrollment = {
        id: 'enrollment-123',
        class_id: 'class-123',
        student_id: 'student-123',
        enrolled_at: new Date(),
      };

      const mockExecuteTakeFirst = vi.fn()
        .mockResolvedValueOnce({ id: 'class-123' })
        .mockResolvedValueOnce({ id: 'student-123' })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockEnrollment);

      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirst: mockExecuteTakeFirst,
      };
      vi.mocked(db.selectFrom).mockReturnValue(mockSelectQuery as never);

      vi.mocked(db.insertInto).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returningAll: vi.fn().mockReturnValue({
            executeTakeFirst: vi.fn().mockResolvedValue(mockEnrollment),
          }),
        }),
      } as never);

      const response = await request(app.server)
        .post('/api/teacher/classes/class-123/students/student-123')
        .set('Cookie', authCookie);

      expect(response.status).toBe(201);
    });

    it('should return 409 when student is already enrolled', async () => {
      const mockExecuteTakeFirst = vi.fn()
        .mockResolvedValueOnce({ id: 'class-123' })
        .mockResolvedValueOnce({ id: 'student-123' })
        .mockResolvedValueOnce({ id: 'existing-enrollment' });

      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirst: mockExecuteTakeFirst,
      };
      vi.mocked(db.selectFrom).mockReturnValue(mockSelectQuery as never);

      const response = await request(app.server)
        .post('/api/teacher/classes/class-123/students/student-123')
        .set('Cookie', authCookie);

      expect(response.status).toBe(409);
    });
  });

  describe('DELETE /api/teacher/classes/:id/students/:studentId', () => {
    it('should remove student from class', async () => {
      const classId = '123e4567-e89b-12d3-a456-426614174001';
      const studentId = '123e4567-e89b-12d3-a456-426614174002';

      const mockExecuteTakeFirst = vi.fn().mockResolvedValue({ id: classId });
      const mockExecute = vi.fn().mockResolvedValue([{ id: 'enrollment-123' }]);

      let callCount = 0;
      vi.mocked(db.selectFrom).mockImplementation(() => {
        callCount++;
        return {
          select: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          executeTakeFirst: mockExecuteTakeFirst,
        } as never;
      });

      vi.mocked(db.deleteFrom).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        execute: mockExecute,
      } as never);

      const response = await request(app.server)
        .delete(`/api/teacher/classes/${classId}/students/${studentId}`)
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Student removed from class successfully');
    });

    it('should return 404 when class is not found', async () => {
      const classId = '123e4567-e89b-12d3-a456-426614174001';
      const studentId = '123e4567-e89b-12d3-a456-426614174002';

      const mockExecuteTakeFirst = vi.fn().mockResolvedValue(null);
      vi.mocked(db.selectFrom).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirst: mockExecuteTakeFirst,
      } as never);

      const response = await request(app.server)
        .delete(`/api/teacher/classes/${classId}/students/${studentId}`)
        .set('Cookie', authCookie);

      expect(response.status).toBe(404);
    });

    it('should return 404 when enrollment is not found', async () => {
      const classId = '123e4567-e89b-12d3-a456-426614174001';
      const studentId = '123e4567-e89b-12d3-a456-426614174002';

      const mockExecuteTakeFirst = vi.fn().mockResolvedValue({ id: classId });
      const mockExecute = vi.fn().mockResolvedValue([]);

      vi.mocked(db.selectFrom).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirst: mockExecuteTakeFirst,
      } as never);

      vi.mocked(db.deleteFrom).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        execute: mockExecute,
      } as never);

      const response = await request(app.server)
        .delete(`/api/teacher/classes/${classId}/students/${studentId}`)
        .set('Cookie', authCookie);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/teacher/assignments', () => {
    it('should return list of assignments', async () => {
      const mockAssignments = [
        { id: 'assignment-1', title: 'Homework 1', class_id: 'class-1', published: true },
      ];

      const mockExecute = vi.fn().mockResolvedValue(mockAssignments);
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        execute: mockExecute,
      };
      vi.mocked(db.selectFrom).mockReturnValue(mockQuery as never);

      const response = await request(app.server)
        .get('/api/teacher/assignments')
        .set('Cookie', authCookie);
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/teacher/assignments', () => {
    it('should create an assignment', async () => {
      const classId = '123e4567-e89b-12d3-a456-426614174001';
      const mockAssignment = {
        id: 'assignment-123',
        class_id: classId,
        title: 'New Assignment',
        due_date: '2024-12-31',
        published: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockExecuteTakeFirst = vi.fn().mockResolvedValue({ id: classId });
      const mockWhere = vi.fn().mockReturnThis();
      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        where: mockWhere,
        executeTakeFirst: mockExecuteTakeFirst,
      };
      vi.mocked(db.selectFrom).mockReturnValue(mockSelectQuery as never);

      vi.mocked(db.insertInto).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returningAll: vi.fn().mockReturnValue({
            executeTakeFirst: vi.fn().mockResolvedValue(mockAssignment),
          }),
        }),
      } as never);

      const response = await request(app.server)
        .post('/api/teacher/assignments')
        .set('Cookie', authCookie)
        .send({
          class_id: classId,
          title: 'New Assignment',
          due_date: '2024-12-31',
        });

      expect(response.status).toBe(201);
    });
  });

  describe('PUT /api/teacher/assignments/:id', () => {
    it('should update an assignment', async () => {
      const assignmentId = '123e4567-e89b-12d3-a456-426614174002';
      const classId = '123e4567-e89b-12d3-a456-426614174001';
      const mockUpdatedAssignment = {
        id: assignmentId,
        class_id: classId,
        title: 'Updated Assignment',
        due_date: '2024-12-31',
        published: false,
        updated_at: new Date(),
      };

      const mockExecuteTakeFirst = vi.fn().mockResolvedValue({ id: assignmentId });
      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirst: mockExecuteTakeFirst,
      };
      vi.mocked(db.selectFrom).mockReturnValue(mockSelectQuery as never);

      const mockUpdateQuery = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returningAll: vi.fn().mockReturnValue({
          executeTakeFirst: vi.fn().mockResolvedValue(mockUpdatedAssignment),
        }),
      };
      vi.mocked(db.updateTable).mockReturnValue(mockUpdateQuery as never);

      const response = await request(app.server)
        .put(`/api/teacher/assignments/${assignmentId}`)
        .set('Cookie', authCookie)
        .send({
          title: 'Updated Assignment',
          due_date: '2024-12-31',
        });

      expect(response.status).toBe(200);
      expect(response.body.assignment.id).toBe(assignmentId);
    });

    it('should return 404 for non-existent assignment', async () => {
      const assignmentId = '123e4567-e89b-12d3-a456-426614174002';
      const mockExecuteTakeFirst = vi.fn().mockResolvedValue(null);
      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirst: mockExecuteTakeFirst,
      };
      vi.mocked(db.selectFrom).mockReturnValue(mockSelectQuery as never);

      const response = await request(app.server)
        .put(`/api/teacher/assignments/${assignmentId}`)
        .set('Cookie', authCookie)
        .send({
          title: 'Updated Assignment',
        });

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid request body', async () => {
      const assignmentId = '123e4567-e89b-12d3-a456-426614174002';
      const mockExecuteTakeFirst = vi.fn().mockResolvedValue({ id: assignmentId });
      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirst: mockExecuteTakeFirst,
      };
      vi.mocked(db.selectFrom).mockReturnValue(mockSelectQuery as never);

      const response = await request(app.server)
        .put(`/api/teacher/assignments/${assignmentId}`)
        .set('Cookie', authCookie)
        .send({
          due_date: 'invalid-date',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/teacher/assignments/:id', () => {
    it('should delete an assignment', async () => {
      const assignmentId = '123e4567-e89b-12d3-a456-426614174002';
      const mockExecuteTakeFirst = vi.fn().mockResolvedValue({ id: assignmentId });
      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirst: mockExecuteTakeFirst,
      };
      vi.mocked(db.selectFrom).mockReturnValue(mockSelectQuery as never);

      vi.mocked(db.deleteFrom).mockReturnValue({
        where: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue(undefined),
        }),
      } as never);

      const response = await request(app.server)
        .delete(`/api/teacher/assignments/${assignmentId}`)
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Assignment deleted successfully');
    });

    it('should return 404 for non-existent assignment', async () => {
      const assignmentId = '123e4567-e89b-12d3-a456-426614174002';
      const mockExecuteTakeFirst = vi.fn().mockResolvedValue(null);
      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirst: mockExecuteTakeFirst,
      };
      vi.mocked(db.selectFrom).mockReturnValue(mockSelectQuery as never);

      const response = await request(app.server)
        .delete(`/api/teacher/assignments/${assignmentId}`)
        .set('Cookie', authCookie);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/teacher/assignments/:id/publish', () => {
    it('should publish an assignment', async () => {
      const mockAssignment = {
        id: 'assignment-123',
        published: true,
        updated_at: new Date(),
      };

      const mockExecuteTakeFirst = vi.fn()
        .mockResolvedValueOnce({ id: 'assignment-123' })
        .mockResolvedValueOnce(mockAssignment);

      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirst: mockExecuteTakeFirst,
      };
      vi.mocked(db.selectFrom).mockReturnValue(mockSelectQuery as never);

      const mockUpdateQuery = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returningAll: vi.fn().mockReturnValue({
          executeTakeFirst: vi.fn().mockResolvedValue(mockAssignment),
        }),
      };
      vi.mocked(db.updateTable).mockReturnValue(mockUpdateQuery as never);

      const response = await request(app.server)
        .post('/api/teacher/assignments/assignment-123/publish')
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/teacher/assignments/:id/submissions', () => {
    it('should return submissions for an assignment', async () => {
      const mockSubmissions = [
        {
          id: 'submission-1',
          student_id: 'student-123',
          content: 'Submission content',
          grade: 85,
        },
      ];

      const mockExecuteTakeFirst = vi.fn().mockResolvedValue({ id: 'assignment-123' });
      const mockExecute = vi.fn().mockResolvedValue(mockSubmissions);

      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirst: mockExecuteTakeFirst,
        execute: mockExecute,
      };
      vi.mocked(db.selectFrom).mockReturnValue(mockSelectQuery as never);

      const response = await request(app.server)
        .get('/api/teacher/assignments/assignment-123/submissions')
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent assignment', async () => {
      const mockExecuteTakeFirst = vi.fn().mockResolvedValue(null);
      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirst: mockExecuteTakeFirst,
      };
      vi.mocked(db.selectFrom).mockReturnValue(mockSelectQuery as never);

      const response = await request(app.server)
        .get('/api/teacher/assignments/non-existent/submissions')
        .set('Cookie', authCookie);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/teacher/assignments/:assignmentId/submissions/:submissionId/grade', () => {
    it('should grade a submission', async () => {
      const mockSubmission = {
        id: 'submission-123',
        grade: 90,
        feedback: 'Great work!',
        updated_at: new Date(),
      };

      const mockExecuteTakeFirst = vi.fn()
        .mockResolvedValueOnce({ id: 'assignment-123' })
        .mockResolvedValueOnce(mockSubmission);

      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirst: mockExecuteTakeFirst,
      };
      vi.mocked(db.selectFrom).mockReturnValue(mockSelectQuery as never);

      const mockUpdateQuery = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returningAll: vi.fn().mockReturnValue({
          executeTakeFirst: vi.fn().mockResolvedValue(mockSubmission),
        }),
      };
      vi.mocked(db.updateTable).mockReturnValue(mockUpdateQuery as never);

      const response = await request(app.server)
        .put('/api/teacher/assignments/assignment-123/submissions/submission-123/grade')
        .set('Cookie', authCookie)
        .send({ grade: 90, feedback: 'Great work!' });

      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent assignment', async () => {
      const mockExecuteTakeFirst = vi.fn().mockResolvedValue(null);
      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirst: mockExecuteTakeFirst,
      };
      vi.mocked(db.selectFrom).mockReturnValue(mockSelectQuery as never);

      const response = await request(app.server)
        .put('/api/teacher/assignments/non-existent/submissions/submission-123/grade')
        .set('Cookie', authCookie)
        .send({ grade: 90 });

      expect(response.status).toBe(404);
    });

    it('should return 404 for non-existent submission', async () => {
      const assignmentId = '123e4567-e89b-12d3-a456-426614174002';
      const mockExecuteTakeFirst = vi.fn()
        .mockResolvedValueOnce({ id: assignmentId })
        .mockResolvedValueOnce(null);
      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirst: mockExecuteTakeFirst,
      };
      vi.mocked(db.selectFrom).mockReturnValue(mockSelectQuery as never);

      const mockUpdateQuery = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returningAll: vi.fn().mockReturnValue({
          executeTakeFirst: vi.fn().mockResolvedValue(null),
        }),
      };
      vi.mocked(db.updateTable).mockReturnValue(mockUpdateQuery as never);

      const response = await request(app.server)
        .put(`/api/teacher/assignments/${assignmentId}/submissions/non-existent/grade`)
        .set('Cookie', authCookie)
        .send({ grade: 90 });

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid request body', async () => {
      const assignmentId = '123e4567-e89b-12d3-a456-426614174002';
      const mockExecuteTakeFirst = vi.fn().mockResolvedValue({ id: assignmentId });
      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        executeTakeFirst: mockExecuteTakeFirst,
      };
      vi.mocked(db.selectFrom).mockReturnValue(mockSelectQuery as never);

      const response = await request(app.server)
        .put(`/api/teacher/assignments/${assignmentId}/submissions/submission-123/grade`)
        .set('Cookie', authCookie)
        .send({ grade: 150 });

      expect(response.status).toBe(400);
    });
  });
});

