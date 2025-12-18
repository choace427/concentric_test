import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import { env } from './config/env';
import { redis } from './config/redis';
import { rateLimiters } from './middleware/rate-limit';
import { authRoutes } from './routes/auth';
import { adminRoutes } from './routes/admin';
import { teacherRoutes } from './routes/teacher';
import { studentRoutes } from './routes/student';
import { statsRoutes } from './routes/stats';
import { chatbotRoutes } from './routes/chatbot';

let serverInstance: ReturnType<typeof Fastify> | null = null;

async function buildServer() {
  const server = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
    bodyLimit: 1048576,
  });

  await server.register(cors, {
    origin: env.NODE_ENV === 'production' 
      ? (process.env.ALLOWED_ORIGINS?.split(',') || [])
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await server.register(cookie, {
    secret: env.JWT_SECRET,
    parseOptions: {},
  });

  server.addHook('onRequest', rateLimiters.general);

  server.get('/health', async () => {
    let redisStatus = 'unknown';
    try {
      await redis.ping();
      redisStatus = 'connected';
    } catch (error) {
      redisStatus = 'disconnected';
    }

    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      redis: redisStatus,
    };
  });

  server.get('/api/test-db', async (_request, reply) => {
    try {
      const { db } = await import('./config/database');
      const result = await db.selectFrom('users').select(['id', 'email']).limit(1).execute();
      return { 
        status: 'ok', 
        message: 'Database connection successful',
        sampleUser: result[0] || null 
      };
    } catch (error) {
      server.log.error(error, 'Database test failed');
      return reply.status(500).send({ 
        status: 'error',
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  server.setErrorHandler((error: Error & { statusCode?: number }, request, reply) => {
    server.log.error({
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
      body: request.body,
    }, 'Unhandled error caught by global error handler');
    
    reply.status(error.statusCode || 500).send({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  });
  await server.register(authRoutes, { prefix: '/api/auth' });
  await server.register(adminRoutes, { prefix: '/api/admin' });
  await server.register(teacherRoutes, { prefix: '/api/teacher' });
  await server.register(studentRoutes, { prefix: '/api/student' });
  await server.register(statsRoutes, { prefix: '/api/v0/stats' });
  await server.register(chatbotRoutes, { prefix: '/api/chatbot' });

  return server;
}

async function start() {
  try {
    const app = await buildServer();
    serverInstance = app;
    await app.listen({
      port: parseInt(env.PORT),
      host: '0.0.0.0',
    });
  } catch (err) {
    if (serverInstance) {
      serverInstance.log.error(err);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  process.on('SIGTERM', async () => {
    if (serverInstance) {
      await serverInstance.close();
    }
    redis.disconnect();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    if (serverInstance) {
      await serverInstance.close();
    }
    redis.disconnect();
    process.exit(0);
  });

  start();
}

export { buildServer, start };

