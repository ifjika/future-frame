import { execFile } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { promisify } from 'node:util';
import { IngestError, ValidationError } from '../../core/errors/AppError.js';
import { assertSafeMediaPath } from '../preprocessor/audio-extractor.js';

const execFileAsync = promisify(execFile);

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'music.youtube.com',
]);

export function validatePublicVideoUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new ValidationError('Invalid video URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new ValidationError('Video URL must use http or https protocol');
  }

  const host = parsed.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host.startsWith('169.254.')
  ) {
    throw new ValidationError('Local/internal URLs are not allowed (SSRF protection)');
  }

  return parsed;
}

export function isYouTubeUrl(rawUrl: string): boolean {
  const parsed = validatePublicVideoUrl(rawUrl);
  return YOUTUBE_HOSTS.has(parsed.hostname.toLowerCase());
}

export function buildYtDlpArgs(url: string, outputPath: string): string[] {
  const safeOutput = assertSafeMediaPath(outputPath, 'outputPath');
  return [
    '-f',
    'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b',
    '--merge-output-format',
    'mp4',
    '--no-playlist',
    '-o',
    safeOutput,
    url,
  ];
}

export class UrlDownloaderService {
  public async download(
    rawUrl: string,
    outputPath: string
  ): Promise<{ outputPath: string; sizeBytes: number }> {
    const parsedUrl = validatePublicVideoUrl(rawUrl);
    const safeOutput = assertSafeMediaPath(outputPath, 'outputPath');
    await mkdir(path.dirname(safeOutput), { recursive: true });

    if (isYouTubeUrl(parsedUrl.toString())) {
      const args = buildYtDlpArgs(parsedUrl.toString(), safeOutput);
      try {
        await execFileAsync('yt-dlp', args, {
          timeout: 300_000,
          maxBuffer: 10 * 1024 * 1024,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('ENOENT')) {
          throw new IngestError(
            'yt-dlp is not installed on the server. Run: winget install yt-dlp.yt-dlp'
          );
        }
        throw new IngestError(`Failed to download YouTube video: ${message}`);
      }
    } else {
      const response = await fetch(parsedUrl.toString(), {
        signal: AbortSignal.timeout(120_000),
      });
      if (!response.ok || !response.body) {
        throw new IngestError(`Failed to download video URL (HTTP ${response.status})`);
      }
      await pipeline(
        Readable.fromWeb(response.body as WebReadableStream<Uint8Array>),
        createWriteStream(safeOutput)
      );
    }

    const fileStat = await stat(safeOutput).catch(() => null);
    if (!fileStat || fileStat.size <= 0) {
      throw new IngestError('Downloaded video file is empty or missing');
    }

    return { outputPath: safeOutput, sizeBytes: fileStat.size };
  }
}
