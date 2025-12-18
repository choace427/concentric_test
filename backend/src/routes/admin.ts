import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { db } from '../config/database';
import { requireRole } from '../middleware/auth';
import { invalidateUserCache, invalidateStatsCache } from '../utils/cache';

const teacherGroupSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
});

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['admin', 'teacher', 'student']),
  teacher_group_id: z.string().uuid().optional().nullable(),
});

export async function adminRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/teacher-groups',
    { preHandler: requireRole('admin') },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const groups = await db.selectFrom('teacher_groups').selectAll().execute();
      return reply.send({ groups });
    }
  );

  fastify.post(
    '/teacher-groups',
    { preHandler: requireRole('admin') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = teacherGroupSchema.parse(request.body as z.infer<typeof teacherGroupSchema>);
        const now = new Date();
        const group = await db
          .insertInto('teacher_groups')
          .values({
            id: randomUUID(),
            name: body.name,
            description: body.description || null,
            created_at: now,
            updated_at: now,
          })
          .returningAll()
          .executeTakeFirst();

        return reply.status(201).send({ group });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid request', details: error.errors });
        }
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.put(
    '/teacher-groups/:id',
    { preHandler: requireRole('admin') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const body = teacherGroupSchema.parse(request.body as z.infer<typeof teacherGroupSchema>);

        const group = await db
          .updateTable('teacher_groups')
          .set({
            name: body.name,
            description: body.description || null,
            updated_at: new Date(),
          })
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst();

        if (!group) {
          return reply.status(404).send({ error: 'Teacher group not found' });
        }

        return reply.send({ group });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid request', details: error.errors });
        }
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.delete(
    '/teacher-groups/:id',
    { preHandler: requireRole('admin') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const result = await db.deleteFrom('teacher_groups').where('id', '=', id).execute();

      if (result.length === 0) {
        return reply.status(404).send({ error: 'Teacher group not found' });
      }

      return reply.send({ message: 'Teacher group deleted successfully' });
    }
  );

  fastify.get(
    '/users',
    { preHandler: requireRole('admin') },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const users = await db.selectFrom('users').selectAll().execute();
      return reply.send({ users });
    }
  );

  fastify.post(
    '/users',
    { preHandler: requireRole('admin') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = userSchema.parse(request.body as z.infer<typeof userSchema>);

        const existingUser = await db
          .selectFrom('users')
          .select(['id'])
          .where('email', '=', body.email)
          .executeTakeFirst();

        if (existingUser) {
          return reply.status(409).send({ error: 'User with this email already exists' });
        }

        const now = new Date();
        const user = await db
          .insertInto('users')
          .values({
            id: randomUUID(),
            email: body.email,
            name: body.name,
            role: body.role,
            teacher_group_id: body.teacher_group_id || null,
            suspended: false,
            created_at: now,
            updated_at: now,
          })
          .returningAll()
          .executeTakeFirst();

        // Invalidate cache
        await invalidateStatsCache();

        return reply.status(201).send({ user });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid request', details: error.errors });
        }
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.put(
    '/users/:id',
    { preHandler: requireRole('admin') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const body = userSchema.partial().parse(request.body as Partial<z.infer<typeof userSchema>>);

        const user = await db
          .updateTable('users')
          .set({
            ...body,
            updated_at: new Date(),
          })
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst();

        if (!user) {
          return reply.status(404).send({ error: 'User not found' });
        }

        // Invalidate cache
        await invalidateUserCache(id);
        await invalidateStatsCache();

        return reply.send({ user });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid request', details: error.errors });
        }
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.delete(
    '/users/:id',
    { preHandler: requireRole('admin') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const result = await db.deleteFrom('users').where('id', '=', id).execute();

      if (result.length === 0) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Invalidate cache
      await invalidateUserCache(id);
      await invalidateStatsCache();

      return reply.send({ message: 'User deleted successfully' });
    }
  );

  fastify.post(
    '/users/:id/suspend',
    { preHandler: requireRole('admin') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const user = await db
        .updateTable('users')
        .set({
          suspended: true,
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst();

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Invalidate cache
      await invalidateUserCache(id);

      return reply.send({ user, message: 'User suspended successfully' });
    }
  );

  fastify.post(
    '/users/:id/unsuspend',
    { preHandler: requireRole('admin') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      const user = await db
        .updateTable('users')
        .set({
          suspended: false,
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst();

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Invalidate cache
      await invalidateUserCache(id);

      return reply.send({ user, message: 'User unsuspended successfully' });
    }
  );
}

