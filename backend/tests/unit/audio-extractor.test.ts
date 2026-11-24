import { describe, expect, it } from 'vitest';
import {
  AudioExtractorService,
  assertSafeMediaPath,
  buildAudioExtractArgs,
} from '../../src/modules/preprocessor/audio-extractor.js';
import { PreprocessError, ValidationError } from '../../src/core/errors/AppError.js';

describe('audio-extractor', () => {
  it('menyusun argumen FFmpeg mono 64kbps AAC dengan benar', () => {
    const args = buildAudioExtractArgs('storage/staging/sample.mp4', 'storage/preprocessed/sample.m4a');

    expect(args[0]).toBe('-y');
    expect(args[1]).toBe('-i');
    expect(args[2]).toContain('sample.mp4');
    expect(args).toContain('-vn');
    expect(args).toContain('-ac');
    expect(args).toContain('1');
    expect(args).toContain('-c:a');
    expect(args).toContain('aac');
    expect(args).toContain('-b:a');
    expect(args).toContain('64k');
    expect(args[args.length - 1]).toContain('sample.m4a');
  });

  it('menolak path kosong, null-byte, atau diawali tanda minus (flag injection)', () => {
    expect(() => assertSafeMediaPath('   ', 'inputPath')).toThrow(ValidationError);
    expect(() => assertSafeMediaPath('video\0.mp4', 'inputPath')).toThrow(ValidationError);
    expect(() => assertSafeMediaPath('-malicious.mp4', 'inputPath')).toThrow(ValidationError);
  });

  it('melempar PreprocessError jika berkas video sumber tidak ditemukan', async () => {
    const service = new AudioExtractorService();
    await expect(
      service.extractMonoAudio('storage/staging/tidak-ada-file.mp4', 'storage/preprocessed/out.m4a')
    ).rejects.toThrow(PreprocessError);
  });
});
