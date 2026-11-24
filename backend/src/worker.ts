import 'dotenv/config';
import pino from 'pino';
import { createRenderWorker } from './queue/workers/render.worker.js';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

const renderWorker = createRenderWorker(2);

renderWorker.on('completed', (job, result) => {
  logger.info(
    { jobId: job.id, outputPath: result.outputPath, durationMs: result.durationMs },
    '[FutureFrame Worker] Render job completed'
  );
});

renderWorker.on('failed', (job, err) => {
  logger.error(
    { jobId: job?.id, error: err.message },
    '[FutureFrame Worker] Render job failed'
  );
});

const shutdown = async (): Promise<void> => {
  logger.info('[FutureFrame Worker] Shutting down gracefully...');
  await renderWorker.close();
  process.exit(0);
};

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

logger.info('[FutureFrame Worker] Render worker active (concurrency=2).');
