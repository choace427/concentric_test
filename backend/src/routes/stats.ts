import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { db } from '../config/database';
import { authenticate } from '../middleware/auth';
import { getOrSetCache, CACHE_KEYS, CACHE_TTL } from '../utils/cache';

export async function statsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  fastify.get('/average-grades', async (_request: FastifyRequest, reply: FastifyReply) => {
    const data = await getOrSetCache(
      CACHE_KEYS.STATS_AVG_GRADES,
      async () => {
        const result = await db
          .selectFrom('submissions')
          .select(({ fn }) => [
            fn.avg<number>('submissions.grade').as('average_grade'),
            fn.count<number>('submissions.id').as('total_submissions'),
          ])
          .where('submissions.grade', 'is not', null)
          .executeTakeFirst();

        const average = result?.average_grade
          ? Math.round(parseFloat(result.average_grade.toString()) * 10) / 10
          : 0;

        return {
          average_grade: average,
          total_submissions: Number(result?.total_submissions || 0),
        };
      },
      CACHE_TTL.STATS
    );

    return reply.send(data);
  });

  fastify.get(
    '/average-grades/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      const classRecord = await db
        .selectFrom('classes')
        .select(['id'])
        .where('id', '=', id)
        .executeTakeFirst();

      if (!classRecord) {
        return reply.status(404).send({ error: 'Class not found' });
      }

      const data = await getOrSetCache(
        `${CACHE_KEYS.STATS_AVG_GRADES_CLASS}${id}`,
        async () => {
          const result = await db
            .selectFrom('submissions')
            .innerJoin('assignments', 'submissions.assignment_id', 'assignments.id')
            .select(({ fn }) => [
              fn.avg<number>('submissions.grade').as('average_grade'),
              fn.count<number>('submissions.id').as('total_submissions'),
            ])
            .where('assignments.class_id', '=', id)
            .where('submissions.grade', 'is not', null)
            .executeTakeFirst();

          const average = result?.average_grade
            ? Math.round(parseFloat(result.average_grade.toString()) * 10) / 10
            : 0;

          return {
            class_id: id,
            average_grade: average,
            total_submissions: Number(result?.total_submissions || 0),
          };
        },
        CACHE_TTL.STATS
      );

      return reply.send(data);
    }
  );

  fastify.get('/teacher-names', async (_request: FastifyRequest, reply: FastifyReply) => {
    const data = await getOrSetCache(
      CACHE_KEYS.STATS_TEACHER_NAMES,
      async () => {
        const teachers = await db
          .selectFrom('users')
          .select(['id', 'name', 'email'])
          .where('role', '=', 'teacher')
          .execute();

        return {
          teachers: teachers.map((t) => ({ id: t.id, name: t.name, email: t.email })),
        };
      },
      CACHE_TTL.STATS
    );

    return reply.send(data);
  });

  fastify.get('/student-names', async (_request: FastifyRequest, reply: FastifyReply) => {
    const data = await getOrSetCache(
      CACHE_KEYS.STATS_STUDENT_NAMES,
      async () => {
        const students = await db
          .selectFrom('users')
          .select(['id', 'name', 'email'])
          .where('role', '=', 'student')
          .execute();

        return {
          students: students.map((s) => ({ id: s.id, name: s.name, email: s.email })),
        };
      },
      CACHE_TTL.STATS
    );

    return reply.send(data);
  });

  fastify.get('/classes', async (_request: FastifyRequest, reply: FastifyReply) => {
    const data = await getOrSetCache(
      CACHE_KEYS.STATS_CLASSES,
      async () => {
        const classes = await db
          .selectFrom('classes')
          .innerJoin('users', 'classes.teacher_id', 'users.id')
          .select([
            'classes.id',
            'classes.name',
            'classes.description',
            'classes.teacher_id',
            'users.name as teacher_name',
          ])
          .execute();

        return { classes };
      },
      CACHE_TTL.CLASSES
    );

    return reply.send(data);
  });

  fastify.get(
    '/classes/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      const classRecord = await db
        .selectFrom('classes')
        .select(['id'])
        .where('id', '=', id)
        .executeTakeFirst();

      if (!classRecord) {
        return reply.status(404).send({ error: 'Class not found' });
      }

      const data = await getOrSetCache(
        `${CACHE_KEYS.STATS_CLASS_STUDENTS}${id}`,
        async () => {
          const students = await db
            .selectFrom('class_students')
            .innerJoin('users', 'class_students.student_id', 'users.id')
            .select([
              'users.id',
              'users.name',
              'users.email',
              'class_students.enrolled_at',
            ])
            .where('class_students.class_id', '=', id)
            .execute();

          return {
            class_id: id,
            students,
          };
        },
        CACHE_TTL.CLASSES
      );

      return reply.send(data);
    }
  );
}
