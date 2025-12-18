import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '../config/database';
import { requireRole } from '../middleware/auth';
import { randomUUID } from 'crypto';
import { invalidateClassCache, invalidateStatsCache } from '../utils/cache';

const classSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
});

const assignmentSchema = z.object({
  class_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const gradeSchema = z.object({
  grade: z.number().min(0).max(100),
  feedback: z.string().optional().nullable(),
});

export async function teacherRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/classes',
    { preHandler: requireRole('teacher') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;
      
      const classes = await db
        .selectFrom('classes')
        .leftJoin('class_students', 'classes.id', 'class_students.class_id')
        .select([
          'classes.id',
          'classes.name',
          'classes.description',
          'classes.teacher_id',
          'classes.created_at',
          'classes.updated_at',
        ])
        .select(({ fn }) => [
          fn.count<number>('class_students.id').as('student_count'),
        ])
        .where('classes.teacher_id', '=', user.id)
        .groupBy([
          'classes.id',
          'classes.name',
          'classes.description',
          'classes.teacher_id',
          'classes.created_at',
          'classes.updated_at',
        ])
        .execute();

      const classesWithCounts = classes.map((cls) => ({
        ...cls,
        student_count: Number(cls.student_count) || 0,
      }));

      return reply.send({ classes: classesWithCounts });
    }
  );

  fastify.post(
    '/classes',
    { preHandler: requireRole('teacher') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = request.user!;
        const body = classSchema.parse(request.body as z.infer<typeof classSchema>);
        const now = new Date();

        const newClass = await db
          .insertInto('classes')
          .values({
            id: randomUUID(),
            name: body.name,
            description: body.description || null,
            teacher_id: user.id,
            created_at: now,
            updated_at: now,
          })
          .returningAll()
          .executeTakeFirst();

        // Invalidate cache
        await invalidateClassCache();

        return reply.status(201).send({ class: newClass });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid request', details: error.errors });
        }
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.put(
    '/classes/:id',
    { preHandler: requireRole('teacher') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = request.user!;
        const { id } = request.params as { id: string };
        const body = classSchema.parse(request.body as z.infer<typeof classSchema>);

        const updatedClass = await db
          .updateTable('classes')
          .set({
            name: body.name,
            description: body.description || null,
            updated_at: new Date(),
          })
          .where('id', '=', id)
          .where('teacher_id', '=', user.id)
          .returningAll()
          .executeTakeFirst();

        if (!updatedClass) {
          return reply.status(404).send({ error: 'Class not found' });
        }

        // Invalidate cache
        await invalidateClassCache(id);

        return reply.send({ class: updatedClass });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid request', details: error.errors });
        }
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.delete(
    '/classes/:id',
    { preHandler: requireRole('teacher') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;
      const { id } = request.params as { id: string };

      const result = await db
        .deleteFrom('classes')
        .where('id', '=', id)
        .where('teacher_id', '=', user.id)
        .execute();

      if (result.length === 0) {
        return reply.status(404).send({ error: 'Class not found' });
      }

      // Invalidate cache
      await invalidateClassCache(id);

      return reply.send({ message: 'Class deleted successfully' });
    }
  );

  fastify.post(
    '/classes/:id/students/:studentId',
    { preHandler: requireRole('teacher') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;
      const { id, studentId } = request.params as { id: string; studentId: string };

      const classRecord = await db
        .selectFrom('classes')
        .select(['id'])
        .where('id', '=', id)
        .where('teacher_id', '=', user.id)
        .executeTakeFirst();

      if (!classRecord) {
        return reply.status(404).send({ error: 'Class not found' });
      }

      const student = await db
        .selectFrom('users')
        .select(['id'])
        .where('id', '=', studentId)
        .where('role', '=', 'student')
        .executeTakeFirst();

      if (!student) {
        return reply.status(404).send({ error: 'Student not found' });
      }

      const existing = await db
        .selectFrom('class_students')
        .select(['id'])
        .where('class_id', '=', id)
        .where('student_id', '=', studentId)
        .executeTakeFirst();

      if (existing) {
        return reply.status(409).send({ error: 'Student already enrolled' });
      }

        const enrollment = await db
          .insertInto('class_students')
          .values({
            id: randomUUID(),
            class_id: id,
            student_id: studentId,
            enrolled_at: new Date(),
          })
          .returningAll()
          .executeTakeFirst();

        // Invalidate cache
        await invalidateClassCache(id);

        return reply.status(201).send({ enrollment });
    }
  );

  fastify.delete(
    '/classes/:id/students/:studentId',
    { preHandler: requireRole('teacher') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;
      const { id, studentId } = request.params as { id: string; studentId: string };

      const classRecord = await db
        .selectFrom('classes')
        .select(['id'])
        .where('id', '=', id)
        .where('teacher_id', '=', user.id)
        .executeTakeFirst();

      if (!classRecord) {
        return reply.status(404).send({ error: 'Class not found' });
      }

      const result = await db
        .deleteFrom('class_students')
        .where('class_id', '=', id)
        .where('student_id', '=', studentId)
        .execute();

      if (result.length === 0) {
        return reply.status(404).send({ error: 'Enrollment not found' });
      }

      // Invalidate cache
      await invalidateClassCache(id);

      return reply.send({ message: 'Student removed from class successfully' });
    }
  );

  fastify.get(
    '/assignments',
    { preHandler: requireRole('teacher') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;

      const assignments = await db
        .selectFrom('assignments')
        .innerJoin('classes', 'assignments.class_id', 'classes.id')
        .select([
          'assignments.id',
          'assignments.class_id',
          'assignments.title',
          'assignments.description',
          'assignments.due_date',
          'assignments.published',
          'assignments.created_at',
          'assignments.updated_at',
        ])
        .where('classes.teacher_id', '=', user.id)
        .execute();

      return reply.send({ assignments });
    }
  );

  fastify.post(
    '/assignments',
    { preHandler: requireRole('teacher') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = request.user!;
        const body = assignmentSchema.parse(request.body as z.infer<typeof assignmentSchema>);

        const classRecord = await db
          .selectFrom('classes')
          .select(['id'])
          .where('id', '=', body.class_id)
          .where('teacher_id', '=', user.id)
          .executeTakeFirst();

        if (!classRecord) {
          return reply.status(404).send({ error: 'Class not found' });
        }

        const assignment = await db
          .insertInto('assignments')
          .values({
            id: randomUUID(),
            class_id: body.class_id,
            title: body.title,
            description: body.description || null,
            due_date: body.due_date,
            published: false,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returningAll()
          .executeTakeFirst();

        // Invalidate cache
        await invalidateClassCache(body.class_id);

        return reply.status(201).send({ assignment });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid request', details: error.errors });
        }
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.put(
    '/assignments/:id',
    { preHandler: requireRole('teacher') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = request.user!;
        const { id } = request.params as { id: string };
        const body = assignmentSchema.partial().parse(request.body as Partial<z.infer<typeof assignmentSchema>>);

        const assignment = await db
          .selectFrom('assignments')
          .innerJoin('classes', 'assignments.class_id', 'classes.id')
          .select(['assignments.id'])
          .where('assignments.id', '=', id)
          .where('classes.teacher_id', '=', user.id)
          .executeTakeFirst();

        if (!assignment) {
          return reply.status(404).send({ error: 'Assignment not found' });
        }

        const updated = await db
          .updateTable('assignments')
          .set({
            ...body,
            updated_at: new Date(),
          })
          .where('id', '=', id)
          .returningAll()
          .executeTakeFirst();

        // Invalidate cache - need to get class_id first
        if (updated) {
          await invalidateClassCache(updated.class_id);
        }

        return reply.send({ assignment: updated });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid request', details: error.errors });
        }
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.delete(
    '/assignments/:id',
    { preHandler: requireRole('teacher') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;
      const { id } = request.params as { id: string };

      const assignment = await db
        .selectFrom('assignments')
        .innerJoin('classes', 'assignments.class_id', 'classes.id')
        .select(['assignments.id'])
        .where('assignments.id', '=', id)
        .where('classes.teacher_id', '=', user.id)
        .executeTakeFirst();

      if (!assignment) {
        return reply.status(404).send({ error: 'Assignment not found' });
      }

      // Get assignment class_id before deletion for cache invalidation
      const assignmentToDelete = await db
        .selectFrom('assignments')
        .select(['class_id'])
        .where('id', '=', id)
        .executeTakeFirst();

      await db.deleteFrom('assignments').where('id', '=', id).execute();

      // Invalidate cache
      if (assignmentToDelete) {
        await invalidateClassCache(assignmentToDelete.class_id);
      }

      return reply.send({ message: 'Assignment deleted successfully' });
    }
  );

  fastify.post(
    '/assignments/:id/publish',
    { preHandler: requireRole('teacher') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;
      const { id } = request.params as { id: string };

      const assignment = await db
        .selectFrom('assignments')
        .innerJoin('classes', 'assignments.class_id', 'classes.id')
        .select(['assignments.id'])
        .where('assignments.id', '=', id)
        .where('classes.teacher_id', '=', user.id)
        .executeTakeFirst();

      if (!assignment) {
        return reply.status(404).send({ error: 'Assignment not found' });
      }

      const updated = await db
        .updateTable('assignments')
        .set({
          published: true,
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst();

      // Invalidate cache
      if (updated) {
        await invalidateClassCache(updated.class_id);
      }

      return reply.send({ assignment: updated });
    }
  );

  fastify.get(
    '/assignments/:id/submissions',
    { preHandler: requireRole('teacher') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;
      const { id } = request.params as { id: string };

      const assignment = await db
        .selectFrom('assignments')
        .innerJoin('classes', 'assignments.class_id', 'classes.id')
        .select(['assignments.id'])
        .where('assignments.id', '=', id)
        .where('classes.teacher_id', '=', user.id)
        .executeTakeFirst();

      if (!assignment) {
        return reply.status(404).send({ error: 'Assignment not found' });
      }

      const submissions = await db
        .selectFrom('submissions')
        .innerJoin('users', 'submissions.student_id', 'users.id')
        .select([
          'submissions.id',
          'submissions.student_id',
          'submissions.content',
          'submissions.submitted_at',
          'submissions.grade',
          'submissions.feedback',
          'users.name as student_name',
          'users.email as student_email',
        ])
        .where('submissions.assignment_id', '=', id)
        .execute();

      return reply.send({ submissions });
    }
  );

  fastify.put(
    '/assignments/:assignmentId/submissions/:submissionId/grade',
    { preHandler: requireRole('teacher') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = request.user!;
        const { assignmentId, submissionId } = request.params as { assignmentId: string; submissionId: string };
        const body = gradeSchema.parse(request.body as z.infer<typeof gradeSchema>);

        const assignmentToUpdate = await db
          .selectFrom('assignments')
          .innerJoin('classes', 'assignments.class_id', 'classes.id')
          .select(['assignments.id'])
          .where('assignments.id', '=', assignmentId)
          .where('classes.teacher_id', '=', user.id)
          .executeTakeFirst();

        if (!assignmentToUpdate) {
          return reply.status(404).send({ error: 'Assignment not found' });
        }

        const submission = await db
          .updateTable('submissions')
          .set({
            grade: body.grade,
            feedback: body.feedback || null,
            updated_at: new Date(),
          })
          .where('id', '=', submissionId)
          .where('assignment_id', '=', assignmentId)
          .returningAll()
          .executeTakeFirst();

        if (!submission) {
          return reply.status(404).send({ error: 'Submission not found' });
        }

        // Get class_id from assignment for cache invalidation
        const assignmentToInvalidate = await db
          .selectFrom('assignments')
          .select(['class_id'])
          .where('id', '=', assignmentId)
          .executeTakeFirst();

        // Invalidate stats cache (grades changed)
        await invalidateStatsCache();
        if (assignmentToInvalidate) {
          await invalidateClassCache(assignmentToInvalidate.class_id);
        }

        return reply.send({ submission });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid request', details: error.errors });
        }
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}
