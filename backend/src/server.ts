import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import sensible from '@fastify/sensible';
import 'dotenv/config';
import Fastify, { type FastifyInstance } from 'fastify';
import { InMemoryProjectStore } from './modules/ingest/project.store.js';
import { registerProjectRoutes } from './routes/projects.routes.js';

export async function buildServer(
  store: InMemoryProjectStore = new InMemoryProjectStore()
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      transport: {
        target: 'pino-pretty',
        options: { colorize: true },
      },
    },
  });

  await app.register(cors, {
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:5173',
  });
  await app.register(sensible);
  await app.register(multipart, {
    limits: {
      fileSize: 3 * 1024 * 1024 * 1024, // Maksimal 3 GB
    },
  });

  app.get('/health', async () => ({
    status: 'ok',
    service: 'FutureFrame API Gateway',
    timeStamp: new Date().toISOString(),
  }));

  await registerProjectRoutes(app, { store });
  return app;
}

const currentFilePath = path.resolve(fileURLToPath(import.meta.url)).toLowerCase();
const entryFilePath = process.argv[1] ? path.resolve(process.argv[1]).toLowerCase() : '';
const isMainModule = currentFilePath === entryFilePath;

if (isMainModule) {
  const start = async (): Promise<void> => {
    const app = await buildServer();
    try {
      const port = Number(process.env['PORT'] ?? 3000);
      const host = process.env['HOST'] ?? '0.0.0.0';
      await app.listen({ port, host });
    } catch (err) {
      app.log.error(err);
      process.exit(1);
    }
  };
  void start();
}
