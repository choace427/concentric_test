import { buildServer } from '../../server';
import type { FastifyInstance } from 'fastify';

export async function createTestServer(): Promise<FastifyInstance> {
  const server = await buildServer();
  return server;
}

export async function closeTestServer(server: FastifyInstance): Promise<void> {
  await server.close();
}

