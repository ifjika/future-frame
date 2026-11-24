import { execFile } from 'node:child_process';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { PreprocessError, ValidationError } from '../../core/errors/AppError.js';

const execFileAsync = promisify(execFile);

export interface AudioExtractionResult {
  outputPath: string;
  sizeBytes: number;
  durationMs: number;
}

/**
 * Validates file paths to prevent null-byte and FFmpeg flag injection attacks.
 */
export function assertSafeMediaPath(filePath: string, label: string): string {
  const trimmed = filePath.trim();
  if (!trimmed) {
    throw new ValidationError(`${label} cannot be empty`);
  }
  if (trimmed.includes('\0')) {
    throw new ValidationError(`${label} contains an invalid null-byte character`);
  }
  if (trimmed.startsWith('-')) {
    throw new ValidationError(`${label} cannot start with '-'`);
  }
  return path.resolve(trimmed);
}

/**
 * Builds parameterized FFmpeg arguments for mono 64 kbps AAC audio extraction.
 */
export function buildAudioExtractArgs(inputPath: string, outputPath: string): string[] {
  const safeInput = assertSafeMediaPath(inputPath, 'inputPath');
  const safeOutput = assertSafeMediaPath(outputPath, 'outputPath');

  return [
    '-y',
    '-i',
    safeInput,
    '-vn',
    '-ac',
    '1',
    '-c:a',
    'aac',
    '-b:a',
    '64k',
    '-ar',
    '24000',
    safeOutput,
  ];
}

export class AudioExtractorService {
  /**
   * Mengekstrak track audio mono 64 kbps AAC dari video sumber menggunakan FFmpeg.
   */
  public async extractMonoAudio(
    inputPath: string,
    outputPath: string
  ): Promise<AudioExtractionResult> {
    const safeInput = assertSafeMediaPath(inputPath, 'inputPath');
    const safeOutput = assertSafeMediaPath(outputPath, 'outputPath');

    try {
      await stat(safeInput);
    } catch {
      throw new PreprocessError(`Source video file not found: ${safeInput}`);
    }

    await mkdir(path.dirname(safeOutput), { recursive: true });
    const args = buildAudioExtractArgs(safeInput, safeOutput);
    const startedAt = Date.now();

    try {
      await execFileAsync('ffmpeg', args, {
        timeout: 120_000,
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch (err: unknown) {
      throw new PreprocessError(
        `FFmpeg failed to extract audio from: ${safeInput}`,
        err instanceof Error ? err.message : err
      );
    }

    let outputStats;
    try {
      outputStats = await stat(safeOutput);
    } catch {
      throw new PreprocessError(`Extracted audio file not found: ${safeOutput}`);
    }

    if (outputStats.size <= 0) {
      throw new PreprocessError(`Extracted audio file is empty (0 bytes): ${safeOutput}`);
    }

    return {
      outputPath: safeOutput,
      sizeBytes: outputStats.size,
      durationMs: Date.now() - startedAt,
    };
  }
}
