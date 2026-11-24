import { execFile } from 'node:child_process';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { RenderError, ValidationError } from '../../core/errors/AppError.js';
import {
  TimestampStringSchema,
  parseTimestampToSeconds,
} from '../../core/schemas/gemini-response.schema.js';
import { assertSafeMediaPath } from '../preprocessor/audio-extractor.js';
import { buildVerticalFiltergraph } from './filtergraph-builder.js';

const execFileAsync = promisify(execFile);

export type VideoEncoder = 'libx264' | 'h264_nvenc';

export interface RenderClipOptions {
  inputPath: string;
  outputPath: string;
  timestampStart: string;
  timestampEnd: string;
  sourceWidth: number;
  sourceHeight: number;
  focusX: number;
  subtitlePath?: string;
  encoder?: VideoEncoder;
  preset?: string;
  crf?: number;
}

export interface RenderClipResult {
  outputPath: string;
  sizeBytes: number;
  durationMs: number;
}

/**
 * Builds parameterized FFmpeg arguments to trim, crop 9:16, and burn subtitles
 * into a streaming-ready MP4 (`+faststart`).
 */
export function buildRenderArgs(options: RenderClipOptions): string[] {
  const safeInput = assertSafeMediaPath(options.inputPath, 'inputPath');
  const safeOutput = assertSafeMediaPath(options.outputPath, 'outputPath');

  const startCheck = TimestampStringSchema.safeParse(options.timestampStart);
  const endCheck = TimestampStringSchema.safeParse(options.timestampEnd);
  if (!startCheck.success || !endCheck.success) {
    throw new ValidationError('timestampStart and timestampEnd must follow HH:MM:SS.mmm format');
  }

  if (
    parseTimestampToSeconds(options.timestampEnd) <=
    parseTimestampToSeconds(options.timestampStart)
  ) {
    throw new ValidationError('timestampEnd must be greater than timestampStart');
  }

  const filterComplex = buildVerticalFiltergraph({
    sourceWidth: options.sourceWidth,
    sourceHeight: options.sourceHeight,
    focusX: options.focusX,
    ...(options.subtitlePath ? { subtitlePath: options.subtitlePath } : {}),
  });

  const encoder = options.encoder ?? 'libx264';
  const preset = options.preset ?? 'fast';
  const crf = options.crf ?? 21;

  return [
    '-y',
    '-ss',
    options.timestampStart,
    '-to',
    options.timestampEnd,
    '-i',
    safeInput,
    '-filter_complex',
    filterComplex,
    '-map',
    '[v_out]',
    '-map',
    '0:a?',
    '-c:v',
    encoder,
    '-preset',
    preset,
    '-crf',
    String(crf),
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-movflags',
    '+faststart',
    safeOutput,
  ];
}

export class FfmpegRenderService {
  public async renderClip(options: RenderClipOptions): Promise<RenderClipResult> {
    const safeInput = assertSafeMediaPath(options.inputPath, 'inputPath');
    const safeOutput = assertSafeMediaPath(options.outputPath, 'outputPath');

    try {
      await stat(safeInput);
    } catch {
      throw new RenderError(`Source video file not found: ${safeInput}`);
    }

    await mkdir(path.dirname(safeOutput), { recursive: true });
    const args = buildRenderArgs(options);
    const startedAt = Date.now();

    try {
      await execFileAsync('ffmpeg', args, {
        timeout: 300_000,
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch (err: unknown) {
      throw new RenderError(
        `FFmpeg failed to render clip to: ${safeOutput}`,
        err instanceof Error ? err.message : err
      );
    }

    let outputStats;
    try {
      outputStats = await stat(safeOutput);
    } catch {
      throw new RenderError(`Rendered MP4 file not found: ${safeOutput}`);
    }

    if (outputStats.size <= 0) {
      throw new RenderError(`Rendered MP4 file is empty (0 bytes): ${safeOutput}`);
    }

    return {
      outputPath: safeOutput,
      sizeBytes: outputStats.size,
      durationMs: Date.now() - startedAt,
    };
  }
}
