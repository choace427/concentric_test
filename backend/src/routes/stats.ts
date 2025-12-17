import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { db } from '../config/database';
import { authenticate } from '../middleware/auth';

export async function statsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  fastify.get('/average-grades', async (_request: FastifyRequest, reply: FastifyReply) => {
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

    return reply.send({
      average_grade: average,
      total_submissions: Number(result?.total_submissions || 0),
    });
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

      return reply.send({
        class_id: id,
        average_grade: average,
        total_submissions: Number(result?.total_submissions || 0),
      });
    }
  );

  fastify.get('/teacher-names', async (_request: FastifyRequest, reply: FastifyReply) => {
    const teachers = await db
      .selectFrom('users')
      .select(['id', 'name', 'email'])
      .where('role', '=', 'teacher')
      .execute();

    return reply.send({
      teachers: teachers.map((t) => ({ id: t.id, name: t.name, email: t.email })),
    });
  });

  fastify.get('/student-names', async (_request: FastifyRequest, reply: FastifyReply) => {
    const students = await db
      .selectFrom('users')
      .select(['id', 'name', 'email'])
      .where('role', '=', 'student')
      .execute();

    return reply.send({
      students: students.map((s) => ({ id: s.id, name: s.name, email: s.email })),
    });
  });

  fastify.get('/classes', async (_request: FastifyRequest, reply: FastifyReply) => {
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

    return reply.send({ classes });
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

      return reply.send({
        class_id: id,
        students,
      });
    }
  );
}
