import { describe, expect, it, vi } from 'vitest';
import type { FfmpegRenderService } from '../../src/modules/render/ffmpeg-process.js';
import { processRenderJob } from '../../src/queue/workers/render.worker.js';

describe('render.worker (AAA)', () => {
  it('meneruskan payload job ke FfmpegRenderService.renderClip', async () => {
    // Arrange
    const renderClipMock = vi.fn().mockResolvedValue({
      outputPath: 'storage/rendered/clip-1.mp4',
      sizeBytes: 1_250_000,
      durationMs: 4200,
    });
    const fakeService = { renderClip: renderClipMock } as unknown as FfmpegRenderService;

    // Act
    const result = await processRenderJob(
      {
        projectId: 'proj-1',
        clipId: 'clip-1',
        inputPath: 'storage/staging/podcast.mp4',
        outputPath: 'storage/rendered/clip-1.mp4',
        timestampStart: '00:01:00.000',
        timestampEnd: '00:01:45.000',
        sourceWidth: 1920,
        sourceHeight: 1080,
        focusX: 0.5,
      },
      fakeService
    );

    // Assert
    expect(renderClipMock).toHaveBeenCalledTimes(1);
    expect(result.outputPath).toBe('storage/rendered/clip-1.mp4');
    expect(result.sizeBytes).toBe(1_250_000);
  });
});
