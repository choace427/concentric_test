import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '../config/database';
import { requireRole } from '../middleware/auth';
import { randomUUID } from 'crypto';
import { invalidateStatsCache, invalidateClassCache } from '../utils/cache';

const submissionSchema = z.object({
  assignment_id: z.string().uuid(),
  content: z.string().min(1),
});

export async function studentRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/classes',
    { preHandler: requireRole('student') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;

      const classes = await db
        .selectFrom('class_students')
        .innerJoin('classes', 'class_students.class_id', 'classes.id')
        .innerJoin('users', 'classes.teacher_id', 'users.id')
        .select([
          'classes.id',
          'classes.name',
          'classes.description',
          'classes.teacher_id',
          'users.name as teacher_name',
          'class_students.enrolled_at',
        ])
        .where('class_students.student_id', '=', user.id)
        .execute();

      return reply.send({ classes });
    }
  );

  fastify.get(
    '/assignments',
    { preHandler: requireRole('student') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;

      const assignments = await db
        .selectFrom('assignments')
        .innerJoin('classes', 'assignments.class_id', 'classes.id')
        .innerJoin('class_students', 'classes.id', 'class_students.class_id')
        .leftJoin('submissions', (join) =>
          join
            .onRef('submissions.assignment_id', '=', 'assignments.id')
            .onRef('submissions.student_id', '=', 'class_students.student_id')
        )
        .select([
          'assignments.id',
          'assignments.class_id',
          'assignments.title',
          'assignments.description',
          'assignments.due_date',
          'assignments.published',
          'classes.name as class_name',
          'submissions.id as submission_id',
          'submissions.submitted_at',
        ])
        .where('class_students.student_id', '=', user.id)
        .where('assignments.published', '=', true)
        .execute();

      const assignmentsWithStatus = assignments.map((assignment) => ({
        id: assignment.id,
        class_id: assignment.class_id,
        title: assignment.title,
        description: assignment.description,
        due_date: assignment.due_date,
        published: assignment.published,
        class_name: assignment.class_name,
        submitted: !!assignment.submission_id,
        submitted_at: assignment.submitted_at,
      }));

      return reply.send({ assignments: assignmentsWithStatus });
    }
  );

  fastify.post(
    '/submissions',
    { preHandler: requireRole('student') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = request.user!;
        const body = submissionSchema.parse(request.body as z.infer<typeof submissionSchema>);

        const assignment = await db
          .selectFrom('assignments')
          .innerJoin('classes', 'assignments.class_id', 'classes.id')
          .innerJoin('class_students', 'classes.id', 'class_students.class_id')
          .select(['assignments.id', 'assignments.published'])
          .where('assignments.id', '=', body.assignment_id)
          .where('class_students.student_id', '=', user.id)
          .where('assignments.published', '=', true)
          .executeTakeFirst();

        if (!assignment) {
          return reply.status(404).send({ error: 'Assignment not found or not accessible' });
        }

        const existing = await db
          .selectFrom('submissions')
          .select(['id'])
          .where('assignment_id', '=', body.assignment_id)
          .where('student_id', '=', user.id)
          .executeTakeFirst();

        if (existing) {
          return reply.status(409).send({ error: 'Assignment already submitted' });
        }

        const submission = await db
          .insertInto('submissions')
          .values({
            id: randomUUID(),
            assignment_id: assignment.id,
            student_id: user.id,
            content: body.content,
            submitted_at: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returningAll()
          .executeTakeFirst();

        // Get class_id for cache invalidation
        const assignmentWithClass = await db
          .selectFrom('assignments')
          .select(['class_id'])
          .where('id', '=', body.assignment_id)
          .executeTakeFirst();

        // Invalidate cache
        if (assignmentWithClass) {
          await invalidateClassCache(assignmentWithClass.class_id);
        }

        return reply.status(201).send({ submission });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid request', details: error.errors });
        }
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  fastify.get(
    '/grades',
    { preHandler: requireRole('student') },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;

      const submissions = await db
        .selectFrom('submissions')
        .innerJoin('assignments', 'submissions.assignment_id', 'assignments.id')
        .innerJoin('classes', 'assignments.class_id', 'classes.id')
        .select([
          'submissions.id',
          'submissions.assignment_id',
          'submissions.grade',
          'submissions.feedback',
          'submissions.submitted_at',
          'assignments.title as assignment_title',
          'classes.name as class_name',
        ])
        .where('submissions.student_id', '=', user.id)
        .where('submissions.grade', 'is not', null)
        .execute();

      const grades = submissions
        .map((s) => s.grade)
        .filter((g): g is number => g !== null);
      const average = grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;

      return reply.send({
        submissions,
        average: Math.round(average * 10) / 10,
      });
    }
  );
}
