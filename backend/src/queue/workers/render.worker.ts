import { Worker, type Job } from 'bullmq';
import { getRedisConnectionOptions } from '../../config/redis.js';
import {
  FfmpegRenderService,
  type RenderClipResult,
} from '../../modules/render/ffmpeg-process.js';
import { QUEUE_NAMES, type RenderJobPayload } from '../queues.js';

export async function processRenderJob(
  data: RenderJobPayload,
  renderService: FfmpegRenderService = new FfmpegRenderService()
): Promise<RenderClipResult> {
  return renderService.renderClip({
    inputPath: data.inputPath,
    outputPath: data.outputPath,
    timestampStart: data.timestampStart,
    timestampEnd: data.timestampEnd,
    sourceWidth: data.sourceWidth,
    sourceHeight: data.sourceHeight,
    focusX: data.focusX,
    ...(data.subtitlePath ? { subtitlePath: data.subtitlePath } : {}),
  });
}

export function createRenderWorker(concurrency = 2): Worker<RenderJobPayload, RenderClipResult> {
  const renderService = new FfmpegRenderService();

  return new Worker<RenderJobPayload, RenderClipResult>(
    QUEUE_NAMES.RENDER,
    async (job: Job<RenderJobPayload>) => processRenderJob(job.data, renderService),
    {
      connection: getRedisConnectionOptions(),
      concurrency,
    }
  );
}
