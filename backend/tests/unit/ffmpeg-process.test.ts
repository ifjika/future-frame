import { describe, expect, it } from 'vitest';
import { RenderError, ValidationError } from '../../src/core/errors/AppError.js';
import {
  FfmpegRenderService,
  buildRenderArgs,
} from '../../src/modules/render/ffmpeg-process.js';

describe('ffmpeg-process (AAA)', () => {
  it('menyusun argumen FFmpeg lengkap dengan crop 9:16, libx264, dan +faststart', () => {
    // Arrange
    const options = {
      inputPath: 'storage/staging/podcast.mp4',
      outputPath: 'storage/rendered/clip-1.mp4',
      timestampStart: '00:04:12.500',
      timestampEnd: '00:04:58.200',
      sourceWidth: 1920,
      sourceHeight: 1080,
      focusX: 0.5,
    };

    // Act
    const args = buildRenderArgs(options);

    // Assert
    expect(args).toContain('-ss');
    expect(args).toContain('00:04:12.500');
    expect(args).toContain('-to');
    expect(args).toContain('00:04:58.200');
    expect(args).toContain('-filter_complex');
    expect(args).toContain('libx264');
    expect(args).toContain('+faststart');
    expect(args[args.length - 1]).toContain('clip-1.mp4');
  });

  it('mendukung encoder akselerasi hardware h264_nvenc saat dipilih', () => {
    const args = buildRenderArgs({
      inputPath: 'storage/staging/podcast.mp4',
      outputPath: 'storage/rendered/clip-nvenc.mp4',
      timestampStart: '00:00:10.000',
      timestampEnd: '00:00:40.000',
      sourceWidth: 1920,
      sourceHeight: 1080,
      focusX: 0.5,
      encoder: 'h264_nvenc',
    });

    expect(args).toContain('h264_nvenc');
  });

  it('melempar ValidationError jika timestampEnd <= timestampStart atau format salah', () => {
    expect(() =>
      buildRenderArgs({
        inputPath: 'storage/staging/podcast.mp4',
        outputPath: 'storage/rendered/bad.mp4',
        timestampStart: '00:05:00.000',
        timestampEnd: '00:04:00.000',
        sourceWidth: 1920,
        sourceHeight: 1080,
        focusX: 0.5,
      })
    ).toThrow(ValidationError);

    expect(() =>
      buildRenderArgs({
        inputPath: 'storage/staging/podcast.mp4',
        outputPath: 'storage/rendered/bad.mp4',
        timestampStart: '05:00',
        timestampEnd: '05:30',
        sourceWidth: 1920,
        sourceHeight: 1080,
        focusX: 0.5,
      })
    ).toThrow(ValidationError);
  });

  it('melempar RenderError jika berkas video sumber tidak ditemukan di disk', async () => {
    const service = new FfmpegRenderService();
    await expect(
      service.renderClip({
        inputPath: 'storage/staging/tidak-ada.mp4',
        outputPath: 'storage/rendered/out.mp4',
        timestampStart: '00:00:05.000',
        timestampEnd: '00:00:25.000',
        sourceWidth: 1920,
        sourceHeight: 1080,
        focusX: 0.5,
      })
    ).rejects.toThrow(RenderError);
  });
});
