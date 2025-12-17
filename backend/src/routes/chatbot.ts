import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { db } from '../config/database';
import { env } from '../config/env';

const chatMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
});

async function gatherUserContext(userId: string, userRole: string) {
  const contextParts: string[] = [];
  
  try {
    const user = await db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', userId)
      .executeTakeFirst();

    if (user) {
      contextParts.push(`User: ${user.name} (${user.email})`);
      contextParts.push(`Role: ${userRole}`);
    }

    if (userRole === 'student') {
      // Get student's classes
      const classes = await db
        .selectFrom('class_students')
        .innerJoin('classes', 'class_students.class_id', 'classes.id')
        .innerJoin('users', 'classes.teacher_id', 'users.id')
        .select([
          'classes.id',
          'classes.name',
          'classes.description',
          'users.name as teacher_name',
        ])
        .where('class_students.student_id', '=', userId)
        .execute();

      if (classes.length > 0) {
        contextParts.push(`\nEnrolled Classes (${classes.length}):`);
        classes.forEach((cls) => {
          contextParts.push(`- ${cls.name} (Teacher: ${cls.teacher_name})`);
          if (cls.description) {
            contextParts.push(`  Description: ${cls.description}`);
          }
        });
      }

      // Get student's assignments
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
          'assignments.title',
          'assignments.description',
          'assignments.due_date',
          'assignments.published',
          'classes.name as class_name',
          'submissions.id as submission_id',
          'submissions.grade',
        ])
        .where('class_students.student_id', '=', userId)
        .where('assignments.published', '=', true)
        .execute();

      if (assignments.length > 0) {
        contextParts.push(`\nAssignments (${assignments.length}):`);
        assignments.forEach((assignment) => {
          const status = assignment.submission_id 
            ? `Submitted${assignment.grade ? ` (Grade: ${assignment.grade})` : ''}`
            : 'Not submitted';
          const dueDate = assignment.due_date 
            ? new Date(assignment.due_date).toLocaleDateString()
            : 'No due date';
          contextParts.push(`- ${assignment.title} (${assignment.class_name})`);
          contextParts.push(`  Due: ${dueDate}, Status: ${status}`);
        });
      }

      // Get student's grades
      const submissions = await db
        .selectFrom('submissions')
        .innerJoin('assignments', 'submissions.assignment_id', 'assignments.id')
        .innerJoin('classes', 'assignments.class_id', 'classes.id')
        .select([
          'assignments.title',
          'classes.name as class_name',
          'submissions.grade',
          'submissions.feedback',
        ])
        .where('submissions.student_id', '=', userId)
        .where('submissions.grade', 'is not', null)
        .execute();

      if (submissions.length > 0) {
        contextParts.push(`\nGrades:`);
        submissions.forEach((submission) => {
          contextParts.push(`- ${submission.title} (${submission.class_name}): ${submission.grade}`);
          if (submission.feedback) {
            contextParts.push(`  Feedback: ${submission.feedback}`);
          }
        });
      }
    } else if (userRole === 'teacher') {
      // Get teacher's classes
      const classes = await db
        .selectFrom('classes')
        .selectAll()
        .where('teacher_id', '=', userId)
        .execute();

      if (classes.length > 0) {
        contextParts.push(`\nClasses Teaching (${classes.length}):`);
        for (const cls of classes) {
          const studentCount = await db
            .selectFrom('class_students')
            .select(({ fn }) => [fn.count<number>('id').as('count')])
            .where('class_id', '=', cls.id)
            .executeTakeFirst();
          
          contextParts.push(`- ${cls.name}`);
          if (cls.description) {
            contextParts.push(`  Description: ${cls.description}`);
          }
          contextParts.push(`  Students: ${studentCount?.count || 0}`);
        }
      }

      // Get teacher's assignments
      const assignments = await db
        .selectFrom('assignments')
        .innerJoin('classes', 'assignments.class_id', 'classes.id')
        .leftJoin('submissions', 'assignments.id', 'submissions.assignment_id')
        .select([
          'assignments.id',
          'assignments.title',
          'assignments.description',
          'assignments.due_date',
          'assignments.published',
          'classes.name as class_name',
        ])
        .select(({ fn }) => [
          fn.count<number>('submissions.id').as('submission_count'),
        ])
        .where('classes.teacher_id', '=', userId)
        .groupBy([
          'assignments.id',
          'assignments.title',
          'assignments.description',
          'assignments.due_date',
          'assignments.published',
          'classes.name',
        ])
        .execute();

      if (assignments.length > 0) {
        contextParts.push(`\nAssignments (${assignments.length}):`);
        assignments.forEach((assignment) => {
          const status = assignment.published ? 'Published' : 'Draft';
          const dueDate = assignment.due_date 
            ? new Date(assignment.due_date).toLocaleDateString()
            : 'No due date';
          contextParts.push(`- ${assignment.title} (${assignment.class_name})`);
          contextParts.push(`  Status: ${status}, Due: ${dueDate}, Submissions: ${assignment.submission_count || 0}`);
        });
      }
    } else if (userRole === 'admin') {
      // Get admin overview stats
      const userCounts = await db
        .selectFrom('users')
        .select(({ fn, case: _case }) => [
          fn.count<number>('id').as('total'),
          fn
            .sum<number>(_case().when('role', '=', 'admin').then(1).else(0).end())
            .as('admins'),
          fn
            .sum<number>(_case().when('role', '=', 'teacher').then(1).else(0).end())
            .as('teachers'),
          fn
            .sum<number>(_case().when('role', '=', 'student').then(1).else(0).end())
            .as('students'),
        ])
        .executeTakeFirst();

      if (userCounts) {
        contextParts.push(`\nPlatform Statistics:`);
        contextParts.push(`- Total Users: ${userCounts.total || 0}`);
        contextParts.push(`- Admins: ${userCounts.admins || 0}`);
        contextParts.push(`- Teachers: ${userCounts.teachers || 0}`);
        contextParts.push(`- Students: ${userCounts.students || 0}`);
      }

      const classCount = await db
        .selectFrom('classes')
        .select(({ fn }) => [fn.count<number>('id').as('count')])
        .executeTakeFirst();

      const assignmentCount = await db
        .selectFrom('assignments')
        .select(({ fn }) => [fn.count<number>('id').as('count')])
        .executeTakeFirst();

      contextParts.push(`- Total Classes: ${classCount?.count || 0}`);
      contextParts.push(`- Total Assignments: ${assignmentCount?.count || 0}`);
    }
  } catch (error) {
    // Silently fail context gathering - don't break the chatbot
    console.error('Error gathering user context:', error);
  }

  return contextParts.join('\n');
}

export async function chatbotRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/chat',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!env.OPENAI_API_KEY) {
          return reply.status(500).send({ 
            error: 'OpenAI API key not configured',
            message: 'Please configure OPENAI_API_KEY in environment variables'
          });
        }

        let body;
        try {
          if (!request.body) {
            return reply.status(400).send({ error: 'Request body is required' });
          }
          body = chatMessageSchema.parse(request.body);
        } catch (parseError) {
          if (parseError instanceof z.ZodError) {
            return reply.status(400).send({
              error: 'Invalid request',
              details: parseError.errors,
            });
          }
          return reply.status(400).send({ error: 'Invalid request format' });
        }
        const user = (request as any).user;

        // Gather user context
        const userContext = await gatherUserContext(user.id, user.role);

        // Build system prompt with context
        const systemPrompt = `You are a helpful AI assistant for a school portal platform. You help users navigate the platform, answer questions about their classes, assignments, and grades.

Current User Context:
${userContext}

Platform Information:
- This is a Canvas-style educational platform
- Users can be Admins, Teachers, or Students
- Teachers create classes and assignments
- Students enroll in classes and submit assignments
- Admins manage users and teacher groups

Guidelines:
- Be friendly, helpful, and concise
- Use the user's context to provide personalized answers
- If asked about specific data (classes, assignments, grades), refer to the context provided
- If you don't have information in the context, say so politely
- Help users understand how to use the platform features
- For students: help with finding assignments, checking due dates, viewing grades
- For teachers: help with managing classes, creating assignments, grading submissions
- For admins: help with user management and platform administration

Always respond in a helpful, educational tone.`;

        // Build messages array
        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
          { role: 'system', content: systemPrompt },
        ];

        // Add conversation history if provided
        if (body.conversationHistory && body.conversationHistory.length > 0) {
          // Only keep last 10 messages to avoid token limits
          const recentHistory = body.conversationHistory.slice(-10);
          recentHistory.forEach((msg) => {
            messages.push({
              role: msg.role,
              content: msg.content,
            });
          });
        }

        // Add current message
        messages.push({ role: 'user', content: body.message });

        // Call OpenAI API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini', // Using gpt-4o-mini for cost efficiency, can be upgraded to gpt-4o
            messages: messages,
            temperature: 0.7,
            max_tokens: 500,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } };
          fastify.log.error({ error: errorData }, 'OpenAI API error');
          return reply.status(response.status).send({
            error: 'Failed to get response from AI',
            message: errorData.error?.message || 'OpenAI API request failed',
          });
        }

        const data = await response.json() as {
          choices: Array<{ message: { content: string } }>;
        };

        const assistantMessage = data.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';

        return reply.send({
          message: assistantMessage,
        });
      } catch (error) {
        fastify.log.error(error, 'Chatbot error');
        
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Invalid request',
            details: error.errors,
          });
        }

        return reply.status(500).send({
          error: 'Internal server error',
          message: process.env.NODE_ENV === 'development' 
            ? (error instanceof Error ? error.message : String(error))
            : undefined,
        });
      }
    }
  );
}

