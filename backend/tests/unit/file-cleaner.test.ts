import { mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanupExpiredFiles } from '../../src/utils/file-cleaner.js';

describe('file-cleaner', () => {
  let tempDir: string | null = null;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('menghapus berkas kedaluwarsa dan mempertahankan .gitkeep serta berkas baru', async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'ff-cleaner-'));
    const gitkeepPath = path.join(tempDir, '.gitkeep');
    const oldFilePath = path.join(tempDir, 'old-video.mp4');
    const freshFilePath = path.join(tempDir, 'fresh-video.mp4');

    await writeFile(gitkeepPath, '');
    await writeFile(oldFilePath, 'old');
    await writeFile(freshFilePath, 'fresh');

    const nowMs = Date.now();
    const twoHoursAgo = new Date(nowMs - 2 * 60 * 60 * 1000);
    await utimes(gitkeepPath, twoHoursAgo, twoHoursAgo);
    await utimes(oldFilePath, twoHoursAgo, twoHoursAgo);

    const result = await cleanupExpiredFiles([tempDir], 60 * 60 * 1000, nowMs);

    expect(result.deletedFiles).toEqual([oldFilePath]);
    expect(result.skippedFiles).toContain(gitkeepPath);
    expect(result.skippedFiles).toContain(freshFilePath);
    expect(result.errors).toHaveLength(0);
  });

  it('mencatat error jika direktori tidak ditemukan tanpa melempar exception', async () => {
    const result = await cleanupExpiredFiles(['path/yang/tidak/ada'], 1000);
    expect(result.deletedFiles).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
  });
});
