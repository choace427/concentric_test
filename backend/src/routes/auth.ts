import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { db } from '../config/database';
import { generateToken } from '../utils/jwt';
import { authenticate } from '../middleware/auth';
import { blacklistToken, invalidateUserCache } from '../utils/cache';
import { rateLimiters } from '../middleware/rate-limit';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(['admin', 'teacher', 'student']).optional(),
});

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: z.infer<typeof loginSchema> }>(
    '/login',
    { preHandler: rateLimiters.auth },
    async (request, reply) => {
      try {
        let body;
        try {
          if (!request.body) {
            return reply.status(400).send({ error: 'Request body is required' });
          }
          body = loginSchema.parse(request.body);
        } catch (parseError) {
          if (parseError instanceof z.ZodError) {
            return reply.status(400).send({ 
              error: 'Invalid request', 
              details: parseError.errors 
            });
          }
          return reply.status(400).send({ error: 'Invalid request format' });
        }

        let user;
        try {
          user = await db
            .selectFrom('users')
            .selectAll()
            .where('email', '=', body.email)
            .executeTakeFirst();
        } catch (dbError) {
          const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
          const errorCode = (dbError as any)?.code;
          const errorDetail = (dbError as any)?.detail;
          
          fastify.log.error({
            error: errorMessage,
            code: errorCode,
            detail: errorDetail,
            email: body.email,
          }, 'Database error during login');
          
          let userFriendlyMessage = 'Database error. Please try again later.';
          if (errorCode === '28P01') {
            userFriendlyMessage = 'Database authentication failed.';
          } else if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND') {
            userFriendlyMessage = 'Cannot connect to database.';
          } else if (errorCode === 'ETIMEDOUT') {
            userFriendlyMessage = 'Database connection timeout.';
          }
          
          return reply.status(500).send({ 
            error: userFriendlyMessage,
            details: process.env.NODE_ENV === 'development' 
              ? { message: errorMessage, code: errorCode, detail: errorDetail }
              : undefined
          });
        }

        if (!user) {
          return reply.status(401).send({ error: 'Invalid credentials' });
        }

        if (body.role && user.role !== body.role) {
          return reply.status(401).send({ error: 'Invalid role' });
        }

        if (user.suspended) {
          return reply.status(403).send({ error: 'User is suspended' });
        }

        let token;
        try {
          token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
          });
        } catch (tokenError) {
          fastify.log.error(tokenError, 'Token generation error');
          return reply.status(500).send({ 
            error: 'Failed to generate authentication token',
            details: process.env.NODE_ENV === 'development' 
              ? (tokenError instanceof Error ? tokenError.message : String(tokenError))
              : undefined
          });
        }

        try {
          reply.setCookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/',
          });
        } catch (cookieError) {
          fastify.log.error(cookieError, 'Cookie setting error');
        }

        return reply.send({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        
        fastify.log.error({
          error: errorMessage,
          stack: errorStack,
          requestBody: request.body,
        }, 'Unexpected error in login route');
        
        return reply.status(500).send({ 
          error: 'Internal server error',
          message: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
          ...(process.env.NODE_ENV === 'development' && errorStack
            ? { stack: errorStack } 
            : {})
        });
      }
    }
  );

  fastify.post(
    '/logout',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const token = request.cookies?.token;
      
      if (token) {
        await blacklistToken(token);
      }

      const user = (request as any).user;
      if (user?.id) {
        await invalidateUserCache(user.id);
      }

      reply.clearCookie('token', { path: '/' });
      return reply.send({ message: 'Logged out successfully' });
    }
  );

  fastify.get(
    '/me',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as any).user;
      return reply.send({ user });
    }
  );

  fastify.get('/oauth/google', async (request: FastifyRequest, reply: FastifyReply) => {
    const { env } = await import('../config/env');
    const redirectUri = `${env.API_URL}/api/auth/oauth/google/callback`;
    const clientId = env.GOOGLE_CLIENT_ID;
    const role = (request.query as any)?.role;
    
    if (!clientId) {
      return reply.status(500).send({ error: 'Google OAuth not configured' });
    }

    if (role && !['admin', 'teacher', 'student'].includes(role)) {
      return reply.status(400).send({ error: 'Invalid role' });
    }

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    
    if (role) {
      authUrl.searchParams.set('state', role);
    }

    return reply.redirect(authUrl.toString());
  });

  fastify.get('/oauth/google/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { env } = await import('../config/env');
      const code = (request.query as any)?.code;
      const state = (request.query as any)?.state;
      
      if (!code) {
        return reply.redirect(`${env.FRONTEND_URL}/?error=oauth_failed`);
      }

      const clientId = env.GOOGLE_CLIENT_ID;
      const clientSecret = env.GOOGLE_CLIENT_SECRET;
      const redirectUri = `${env.API_URL}/api/auth/oauth/google/callback`;

      if (!clientId || !clientSecret) {
        return reply.redirect(`${env.FRONTEND_URL}/?error=oauth_not_configured`);
      }

      const role = state && ['admin', 'teacher', 'student'].includes(state) 
        ? state as 'admin' | 'teacher' | 'student' 
        : 'student';

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        return reply.redirect(`${env.FRONTEND_URL}/?error=token_exchange_failed`);
      }

      const tokenData = await tokenResponse.json() as { access_token: string };
      const accessToken = tokenData.access_token;

      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!userInfoResponse.ok) {
        return reply.redirect(`${env.FRONTEND_URL}/?error=user_info_failed`);
      }

      const googleUser = await userInfoResponse.json() as { email: string; name: string };

      let user = await db
        .selectFrom('users')
        .selectAll()
        .where('email', '=', googleUser.email)
        .executeTakeFirst();

      if (!user) {
        const userId = randomUUID();
        user = await db
          .insertInto('users')
          .values({
            id: userId,
            email: googleUser.email,
            name: googleUser.name || googleUser.email.split('@')[0],
            role: role,
            suspended: false,
            teacher_group_id: null,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returningAll()
          .executeTakeFirst();
      } else {
        if (state && user.role !== role) {
          return reply.redirect(`${env.FRONTEND_URL}/?error=role_mismatch&message=Your account role (${user.role}) does not match the selected role (${role})`);
        }
      }

      if (user?.suspended) {
        return reply.redirect(`${env.FRONTEND_URL}/?error=user_suspended`);
      }

      const token = generateToken({
        userId: user!.id,
        email: user!.email,
        role: user!.role,
      });

      reply.setCookie('token', token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      return reply.redirect(`${env.FRONTEND_URL}/?oauth=success`);
    } catch (error) {
      fastify.log.error(error, 'Google OAuth callback error');
      const { env } = await import('../config/env');
      return reply.redirect(`${env.FRONTEND_URL}/?error=oauth_error`);
    }
  });
}
