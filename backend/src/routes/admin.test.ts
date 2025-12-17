import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import type { FastifyInstance } from 'fastify';
import { createAuthCookie } from '../__tests__/helpers/auth-helper';

const mockAdminUser = {
  id: 'admin-123',
  email: 'admin@example.com',
  role: 'admin' as const,
  suspended: false,
};

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

vi.mock('../middleware/auth', () => {
  return {
    authenticate: vi.fn(async (request: any, reply: any) => {
      const token = request.cookies?.token;
      if (!token) {
        return reply.status(401).send({ error: 'Unauthorized: No token provided' });
      }
      request.user = mockAdminUser;
    }),
    requireRole: vi.fn((role: string) => async (request: any, reply: any) => {
      const token = request.cookies?.token;
      if (!token) {
        return reply.status(401).send({ error: 'Unauthorized: No token provided' });
      }
      request.user = mockAdminUser;
    }),
  };
});

import { buildServer } from '../server';
import { db } from '../config/database';

describe('Admin Routes', () => {
  let app: FastifyInstance;
  const authCookie = createAuthCookie({
    userId: mockAdminUser.id,
    email: mockAdminUser.email,
    role: mockAdminUser.role,
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(db.selectFrom).mockReturnValue({
      selectAll: vi.fn().mockReturnValue({
        execute: vi.fn(),
        executeTakeFirst: vi.fn(),
        where: vi.fn().mockReturnValue({
          execute: vi.fn(),
          executeTakeFirst: vi.fn(),
        }),
      }),
      select: vi.fn().mockReturnValue({
        execute: vi.fn(),
        executeTakeFirst: vi.fn(),
        where: vi.fn().mockReturnValue({
          execute: vi.fn(),
          executeTakeFirst: vi.fn(),
        }),
      }),
    } as never);

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

  describe('GET /api/admin/teacher-groups', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app.server).get('/api/admin/teacher-groups');
      expect(response.status).toBe(401);
    });

    it('should return list of teacher groups', async () => {
      const mockGroups = [
        { id: 'group-1', name: 'Math Teachers', description: 'Math department' },
        { id: 'group-2', name: 'Science Teachers', description: null },
      ];

      const mockExecute = vi.fn().mockResolvedValue(mockGroups);
      vi.mocked(db.selectFrom).mockReturnValue({
        selectAll: vi.fn().mockReturnValue({
          execute: mockExecute,
        }),
      } as never);

      const response = await request(app.server)
        .get('/api/admin/teacher-groups')
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body.groups).toEqual(mockGroups);
    });
  });

  describe('POST /api/admin/teacher-groups', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app.server)
        .post('/api/admin/teacher-groups')
        .send({ name: 'Test Group' });
      expect(response.status).toBe(401);
    });

    it('should create a teacher group', async () => {
      const mockGroup = {
        id: 'group-123',
        name: 'Test Group',
        description: 'Test description',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockExecuteTakeFirst = vi.fn().mockResolvedValue(mockGroup);
      vi.mocked(db.insertInto).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returningAll: vi.fn().mockReturnValue({
            executeTakeFirst: mockExecuteTakeFirst,
          }),
        }),
      } as never);

      const response = await request(app.server)
        .post('/api/admin/teacher-groups')
        .set('Cookie', authCookie)
        .send({ name: 'Test Group', description: 'Test description' });

      expect(response.status).toBe(201);
      expect(response.body.group.id).toBe(mockGroup.id);
      expect(response.body.group.name).toBe(mockGroup.name);
      expect(response.body.group.description).toBe(mockGroup.description);
    });

    it('should return 400 for invalid request body', async () => {
      const response = await request(app.server)
        .post('/api/admin/teacher-groups')
        .set('Cookie', authCookie)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/admin/teacher-groups/:id', () => {
    it('should update a teacher group', async () => {
      const mockGroup = {
        id: 'group-123',
        name: 'Updated Group',
        description: 'Updated description',
        updated_at: new Date(),
      };

      const mockExecuteTakeFirst = vi.fn().mockResolvedValue(mockGroup);
      vi.mocked(db.updateTable).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returningAll: vi.fn().mockReturnValue({
              executeTakeFirst: mockExecuteTakeFirst,
            }),
          }),
        }),
      } as never);

      const response = await request(app.server)
        .put('/api/admin/teacher-groups/group-123')
        .set('Cookie', authCookie)
        .send({ name: 'Updated Group', description: 'Updated description' });

      expect(response.status).toBe(200);
      expect(response.body.group.id).toBe(mockGroup.id);
      expect(response.body.group.name).toBe(mockGroup.name);
      expect(response.body.group.description).toBe(mockGroup.description);
    });

    it('should return 404 for non-existent group', async () => {
      const mockExecuteTakeFirst = vi.fn().mockResolvedValue(null);
      vi.mocked(db.updateTable).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returningAll: vi.fn().mockReturnValue({
              executeTakeFirst: mockExecuteTakeFirst,
            }),
          }),
        }),
      } as never);

      const response = await request(app.server)
        .put('/api/admin/teacher-groups/non-existent')
        .set('Cookie', authCookie)
        .send({ name: 'Updated Group' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/admin/teacher-groups/:id', () => {
    it('should delete a teacher group', async () => {
      const mockExecute = vi.fn().mockResolvedValue([{ id: 'group-123' }]);
      vi.mocked(db.deleteFrom).mockReturnValue({
        where: vi.fn().mockReturnValue({
          execute: mockExecute,
        }),
      } as never);

      const response = await request(app.server)
        .delete('/api/admin/teacher-groups/group-123')
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Teacher group deleted successfully');
    });

    it('should return 404 for non-existent group', async () => {
      const mockExecute = vi.fn().mockResolvedValue([]);
      vi.mocked(db.deleteFrom).mockReturnValue({
        where: vi.fn().mockReturnValue({
          execute: mockExecute,
        }),
      } as never);

      const response = await request(app.server)
        .delete('/api/admin/teacher-groups/non-existent')
        .set('Cookie', authCookie);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/admin/users', () => {
    it('should return list of users', async () => {
      const mockUsers = [
        { id: 'user-1', email: 'user1@example.com', name: 'User 1', role: 'student' },
        { id: 'user-2', email: 'user2@example.com', name: 'User 2', role: 'teacher' },
      ];

      const mockExecute = vi.fn().mockResolvedValue(mockUsers);
      vi.mocked(db.selectFrom).mockReturnValue({
        selectAll: vi.fn().mockReturnValue({
          execute: mockExecute,
        }),
      } as never);

      const response = await request(app.server)
        .get('/api/admin/users')
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body.users).toEqual(mockUsers);
    });
  });

  describe('POST /api/admin/users', () => {
    it('should create a user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'newuser@example.com',
        name: 'New User',
        role: 'student',
        suspended: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockExecuteTakeFirst = vi.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockUser);

      vi.mocked(db.selectFrom).mockReturnValue({
        select: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            executeTakeFirst: mockExecuteTakeFirst,
          }),
        }),
      } as never);

      vi.mocked(db.insertInto).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returningAll: vi.fn().mockReturnValue({
            executeTakeFirst: vi.fn().mockResolvedValue(mockUser),
          }),
        }),
      } as never);

      const response = await request(app.server)
        .post('/api/admin/users')
        .set('Cookie', authCookie)
        .send({
          email: 'newuser@example.com',
          name: 'New User',
          role: 'student',
        });

      expect(response.status).toBe(201);
      expect(response.body.user.id).toBe(mockUser.id);
      expect(response.body.user.email).toBe(mockUser.email);
      expect(response.body.user.name).toBe(mockUser.name);
      expect(response.body.user.role).toBe(mockUser.role);
    });

    it('should return 500 on unexpected errors', async () => {
      vi.mocked(db.insertInto).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returningAll: vi.fn().mockReturnValue({
            executeTakeFirst: vi.fn().mockRejectedValue(new Error('Database error')),
          }),
        }),
      } as never);

      const response = await request(app.server)
        .post('/api/admin/users')
        .set('Cookie', authCookie)
        .send({
          email: 'newuser@example.com',
          name: 'New User',
          password: 'password123',
          role: 'student',
        });

      expect(response.status).toBe(500);
    });

    it('should return 409 for duplicate email', async () => {
      const mockExecuteTakeFirst = vi.fn().mockResolvedValue({ id: 'existing-user' });
      vi.mocked(db.selectFrom).mockReturnValue({
        select: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            executeTakeFirst: mockExecuteTakeFirst,
          }),
        }),
      } as never);

      const response = await request(app.server)
        .post('/api/admin/users')
        .set('Cookie', authCookie)
        .send({
          email: 'existing@example.com',
          name: 'Existing User',
          role: 'student',
        });

      expect(response.status).toBe(409);
    });
  });

  describe('PUT /api/admin/users/:id', () => {
    it('should update a user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'updated@example.com',
        name: 'Updated User',
        role: 'teacher',
        updated_at: new Date(),
      };

      const mockExecuteTakeFirst = vi.fn().mockResolvedValue(mockUser);
      vi.mocked(db.updateTable).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returningAll: vi.fn().mockReturnValue({
              executeTakeFirst: mockExecuteTakeFirst,
            }),
          }),
        }),
      } as never);

      const response = await request(app.server)
        .put('/api/admin/users/user-123')
        .set('Cookie', authCookie)
        .send({ name: 'Updated User' });

      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe(mockUser.id);
      expect(response.body.user.email).toBe(mockUser.email);
      expect(response.body.user.name).toBe(mockUser.name);
      expect(response.body.user.role).toBe(mockUser.role);
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    it('should delete a user', async () => {
      const mockExecute = vi.fn().mockResolvedValue([{ id: 'user-123' }]);
      vi.mocked(db.deleteFrom).mockReturnValue({
        where: vi.fn().mockReturnValue({
          execute: mockExecute,
        }),
      } as never);

      const response = await request(app.server)
        .delete('/api/admin/users/user-123')
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User deleted successfully');
    });
  });

  describe('POST /api/admin/users/:id/suspend', () => {
    it('should suspend a user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        suspended: true,
        updated_at: new Date(),
      };

      const mockExecuteTakeFirst = vi.fn().mockResolvedValue(mockUser);
      vi.mocked(db.updateTable).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returningAll: vi.fn().mockReturnValue({
              executeTakeFirst: mockExecuteTakeFirst,
            }),
          }),
        }),
      } as never);

      const response = await request(app.server)
        .post('/api/admin/users/user-123/suspend')
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body.user.suspended).toBe(true);
    });

    it('should return 404 when user is not found', async () => {
      const mockExecuteTakeFirst = vi.fn().mockResolvedValue(null);
      vi.mocked(db.updateTable).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returningAll: vi.fn().mockReturnValue({
              executeTakeFirst: mockExecuteTakeFirst,
            }),
          }),
        }),
      } as never);

      const response = await request(app.server)
        .post('/api/admin/users/non-existent/suspend')
        .set('Cookie', authCookie);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/admin/users/:id/unsuspend', () => {
    it('should unsuspend a user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        suspended: false,
        updated_at: new Date(),
      };

      const mockExecuteTakeFirst = vi.fn().mockResolvedValue(mockUser);
      vi.mocked(db.updateTable).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returningAll: vi.fn().mockReturnValue({
              executeTakeFirst: mockExecuteTakeFirst,
            }),
          }),
        }),
      } as never);

      const response = await request(app.server)
        .post('/api/admin/users/user-123/unsuspend')
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(response.body.user.suspended).toBe(false);
    });

    it('should return 404 when user is not found', async () => {
      const mockExecuteTakeFirst = vi.fn().mockResolvedValue(null);
      vi.mocked(db.updateTable).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returningAll: vi.fn().mockReturnValue({
              executeTakeFirst: mockExecuteTakeFirst,
            }),
          }),
        }),
      } as never);

      const response = await request(app.server)
        .post('/api/admin/users/non-existent/unsuspend')
        .set('Cookie', authCookie);

      expect(response.status).toBe(404);
    });
  });
});

