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
 * Memvalidasi path berkas agar aman dari null-byte maupun flag injection saat diteruskan ke FFmpeg.
 */
export function assertSafeMediaPath(filePath: string, label: string): string {
  const trimmed = filePath.trim();
  if (!trimmed) {
    throw new ValidationError(`${label} tidak boleh kosong`);
  }
  if (trimmed.includes('\0')) {
    throw new ValidationError(`${label} mengandung karakter null-byte yang tidak valid`);
  }
  if (trimmed.startsWith('-')) {
    throw new ValidationError(`${label} tidak boleh diawali karakter '-'`);
  }
  return path.resolve(trimmed);
}

/**
 * Menyusun array argumen FFmpeg terparameterisasi untuk ekstraksi audio mono 64 kbps AAC.
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
      throw new PreprocessError(`Berkas video sumber tidak ditemukan: ${safeInput}`);
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
        `FFmpeg gagal mengekstrak audio dari: ${safeInput}`,
        err instanceof Error ? err.message : err
      );
    }

    let outputStats;
    try {
      outputStats = await stat(safeOutput);
    } catch {
      throw new PreprocessError(`Berkas audio hasil ekstraksi tidak ditemukan: ${safeOutput}`);
    }

    if (outputStats.size <= 0) {
      throw new PreprocessError(`Berkas audio hasil ekstraksi kosong (0 byte): ${safeOutput}`);
    }

    return {
      outputPath: safeOutput,
      sizeBytes: outputStats.size,
      durationMs: Date.now() - startedAt,
    };
  }
}
