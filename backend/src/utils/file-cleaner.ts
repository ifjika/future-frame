import { readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';

export interface CleanupResult {
  deletedFiles: string[];
  skippedFiles: string[];
  errors: Array<{ filePath: string; reason: string }>;
}

const DEFAULT_PROTECTED_FILES = new Set(['.gitkeep']);

/**
 * Removes temporary files older than `maxAgeMs` inside target directories
 * while preserving `.gitkeep` and subdirectories.
 */
export async function cleanupExpiredFiles(
  targetDirs: string[],
  maxAgeMs: number,
  nowMs: number = Date.now()
): Promise<CleanupResult> {
  const result: CleanupResult = {
    deletedFiles: [],
    skippedFiles: [],
    errors: [],
  };

  if (maxAgeMs < 0) {
    return result;
  }

  const cutoffMs = nowMs - maxAgeMs;

  for (const dir of targetDirs) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (err: unknown) {
      result.errors.push({
        filePath: dir,
        reason: err instanceof Error ? err.message : String(err),
      });
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (!entry.isFile() || DEFAULT_PROTECTED_FILES.has(entry.name)) {
        result.skippedFiles.push(fullPath);
        continue;
      }

      try {
        const fileStat = await stat(fullPath);
        if (fileStat.mtimeMs <= cutoffMs) {
          await unlink(fullPath);
          result.deletedFiles.push(fullPath);
        } else {
          result.skippedFiles.push(fullPath);
        }
      } catch (err: unknown) {
        result.errors.push({
          filePath: fullPath,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return result;
}
