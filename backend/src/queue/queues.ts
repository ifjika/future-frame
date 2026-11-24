import { Queue, type JobsOptions } from 'bullmq';
import { getRedisConnectionOptions } from '../config/redis.js';
import { ValidationError } from '../core/errors/AppError.js';

export const QUEUE_NAMES = {
  INGEST: 'ingest-queue',
  INFERENCE: 'inference-queue',
  RENDER: 'render-queue',
} as const;

export interface IngestJobPayload {
  projectId: string;
  inputPath: string;
  preprocessedAudioPath: string;
}

export interface InferenceJobPayload {
  projectId: string;
  audioPath: string;
  sourceDurationSeconds: number;
}

export interface RenderJobPayload {
  projectId: string;
  clipId: string;
  inputPath: string;
  outputPath: string;
  timestampStart: string;
  timestampEnd: string;
  sourceWidth: number;
  sourceHeight: number;
  focusX: number;
  subtitlePath?: string;
}

export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: 100,
  removeOnFail: 200,
};

function assertNonEmptyId(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ValidationError(`${label} tidak boleh kosong`);
  }
  return trimmed;
}

export function buildIngestJobId(projectId: string): string {
  return `ff_ingest_${assertNonEmptyId(projectId, 'projectId')}`;
}

export function buildInferenceJobId(projectId: string): string {
  return `ff_infer_${assertNonEmptyId(projectId, 'projectId')}`;
}

export function buildRenderJobId(projectId: string, clipId: string): string {
  const safeProject = assertNonEmptyId(projectId, 'projectId');
  const safeClip = assertNonEmptyId(clipId, 'clipId');
  return `ff_render_${safeProject}_${safeClip}`;
}

export interface FutureFrameQueues {
  ingestQueue: Queue<IngestJobPayload>;
  inferenceQueue: Queue<InferenceJobPayload>;
  renderQueue: Queue<RenderJobPayload>;
}

export function createQueues(): FutureFrameQueues {
  const connection = getRedisConnectionOptions();

  return {
    ingestQueue: new Queue<IngestJobPayload>(QUEUE_NAMES.INGEST, {
      connection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    }),
    inferenceQueue: new Queue<InferenceJobPayload>(QUEUE_NAMES.INFERENCE, {
      connection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    }),
    renderQueue: new Queue<RenderJobPayload>(QUEUE_NAMES.RENDER, {
      connection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    }),
  };
}
