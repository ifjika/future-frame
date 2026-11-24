import { randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { GeminiAgentService } from '../modules/agent/gemini-agent.service.js';
import { AudioExtractorService } from '../modules/preprocessor/audio-extractor.js';
import { FfmpegRenderService } from '../modules/render/ffmpeg-process.js';
import { InMemoryProjectStore } from '../modules/ingest/project.store.js';
import { UrlDownloaderService } from '../modules/ingest/url-downloader.js';
import { VideoProbeService } from '../modules/ingest/video-probe.js';

const ALLOWED_EXTENSIONS = new Set(['.mp4', '.mov', '.mkv']);

const UrlIngestBodySchema = z.object({
  url: z.string().url(),
});

const RenderRequestBodySchema = z.object({
  focusX: z.number().min(0).max(1).optional(),
});

export interface ProjectsRoutesDeps {
  store: InMemoryProjectStore;
  storageRoot?: string;
}

async function runAnalyzePipeline(
  projectId: string,
  inputPath: string,
  storageRoot: string,
  store: InMemoryProjectStore
): Promise<void> {
  const probeService = new VideoProbeService();
  const audioExtractor = new AudioExtractorService();
  const geminiAgent = new GeminiAgentService();

  try {
    store.update(projectId, { status: 'PREPROCESSING' });
    const metadata = await probeService.probe(inputPath);
    const audioPath = path.join(storageRoot, 'preprocessed', `${projectId}.m4a`);
    await audioExtractor.extractMonoAudio(inputPath, audioPath);

    store.update(projectId, { status: 'INFERRING', metadata });
    const extracted = await geminiAgent.extractClips({
      projectId,
      audioPath,
      sourceDurationSeconds: metadata.durationSeconds,
    });

    store.update(projectId, {
      status: 'ANALYZED',
      clips: extracted.clips.map((clip) => ({
        ...clip,
        renderStatus: 'idle',
      })),
    });
  } catch (err: unknown) {
    store.update(projectId, {
      status: 'FAILED',
      errorMessage: err instanceof Error ? err.message : 'Pipeline processing failed',
    });
  }
}

export async function registerProjectRoutes(
  app: FastifyInstance,
  deps: ProjectsRoutesDeps
): Promise<void> {
  const storageRoot = path.resolve(deps.storageRoot ?? process.env['STORAGE_LOCAL_PATH'] ?? './storage');
  const renderService = new FfmpegRenderService();
  const urlDownloader = new UrlDownloaderService();

  app.post('/projects/url', async (request, reply) => {
    const parsed = UrlIngestBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid video URL' });
    }

    const projectId = randomUUID();
    const stagingDir = path.join(storageRoot, 'staging');
    const inputPath = path.join(stagingDir, `${projectId}.mp4`);

    const project = deps.store.create({
      id: projectId,
      title: parsed.data.url,
      status: 'QUEUED',
      inputPath,
      clips: [],
      createdAt: new Date().toISOString(),
    });

    void urlDownloader
      .download(parsed.data.url, inputPath)
      .then(() => runAnalyzePipeline(projectId, inputPath, storageRoot, deps.store))
      .catch((err: unknown) => {
        deps.store.update(projectId, {
          status: 'FAILED',
          errorMessage: err instanceof Error ? err.message : 'Failed to download video URL',
        });
      });

    return reply.code(202).send({ projectId: project.id, status: project.status });
  });

  app.post('/projects/upload', async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ error: 'Video file is required' });
    }

    const ext = path.extname(file.filename).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return reply.code(400).send({ error: 'Unsupported format. Use MP4, MOV, or MKV.' });
    }

    const projectId = randomUUID();
    const stagingDir = path.join(storageRoot, 'staging');
    await mkdir(stagingDir, { recursive: true });
    const inputPath = path.join(stagingDir, `${projectId}${ext}`);

    await pipeline(file.file, createWriteStream(inputPath));

    const project = deps.store.create({
      id: projectId,
      title: file.filename,
      status: 'QUEUED',
      inputPath,
      clips: [],
      createdAt: new Date().toISOString(),
    });

    void runAnalyzePipeline(projectId, inputPath, storageRoot, deps.store);
    return reply.code(202).send({ projectId: project.id, status: project.status });
  });

  app.get<{ Params: { projectId: string } }>('/projects/:projectId', async (request, reply) => {
    const project = deps.store.get(request.params.projectId);
    if (!project) {
      return reply.code(404).send({ error: 'Project not found' });
    }
    return { project };
  });

  app.get<{ Params: { projectId: string } }>(
    '/projects/:projectId/preview',
    async (request, reply) => {
      const project = deps.store.get(request.params.projectId);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }
      await stat(project.inputPath);
      reply.header('Content-Type', 'video/mp4');
      return reply.send(createReadStream(project.inputPath));
    }
  );

  app.post<{ Params: { projectId: string; clipId: string } }>(
    '/projects/:projectId/clips/:clipId/render',
    async (request, reply) => {
      const project = deps.store.get(request.params.projectId);
      if (!project || !project.metadata) {
        return reply.code(404).send({ error: 'Project or video metadata not found' });
      }

      const clip = project.clips.find((c) => c.clip_id === request.params.clipId);
      if (!clip) {
        return reply.code(404).send({ error: 'Clip not found' });
      }

      const bodyParsed = RenderRequestBodySchema.safeParse(request.body ?? {});
      if (!bodyParsed.success) {
        return reply.code(400).send({ error: 'Invalid render parameters' });
      }

      const focusX = bodyParsed.data.focusX ?? clip.crop_focus_coordinates.x;
      const outputPath = path.join(storageRoot, 'rendered', `${project.id}_${clip.clip_id}.mp4`);

      clip.renderStatus = 'rendering';
      void renderService
        .renderClip({
          inputPath: project.inputPath,
          outputPath,
          timestampStart: clip.timestamp_start,
          timestampEnd: clip.timestamp_end,
          sourceWidth: project.metadata.width,
          sourceHeight: project.metadata.height,
          focusX,
        })
        .then((res) => {
          clip.renderStatus = 'completed';
          clip.outputPath = res.outputPath;
        })
        .catch(() => {
          clip.renderStatus = 'failed';
        });

      return reply.code(202).send({ status: 'rendering', clipId: clip.clip_id });
    }
  );

  app.get<{ Params: { projectId: string; clipId: string } }>(
    '/projects/:projectId/clips/:clipId/download',
    async (request, reply) => {
      const project = deps.store.get(request.params.projectId);
      const clip = project?.clips.find((c) => c.clip_id === request.params.clipId);
      if (!clip?.outputPath) {
        return reply.code(404).send({ error: 'Rendered clip is not available yet' });
      }

      await stat(clip.outputPath);
      reply.header('Content-Type', 'video/mp4');
      reply.header('Content-Disposition', `attachment; filename="${clip.clip_id}.mp4"`);
      return reply.send(createReadStream(clip.outputPath));
    }
  );
}
