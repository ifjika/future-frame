import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../src/core/errors/AppError.js';
import {
  buildYtDlpArgs,
  isYouTubeUrl,
  validatePublicVideoUrl,
} from '../../src/modules/ingest/url-downloader.js';

describe('url-downloader (AAA)', () => {
  it('mengenali URL YouTube (youtube.com dan youtu.be) dengan benar', () => {
    expect(isYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    expect(isYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    expect(isYouTubeUrl('https://example.com/video.mp4')).toBe(false);
  });

  it('menolak URL lokal/internal (SSRF protection) dan protokol non-HTTP', () => {
    expect(() => validatePublicVideoUrl('http://127.0.0.1:3001/secret.mp4')).toThrow(
      ValidationError
    );
    expect(() => validatePublicVideoUrl('http://localhost/video.mp4')).toThrow(ValidationError);
    expect(() => validatePublicVideoUrl('file:///C:/video.mp4')).toThrow(ValidationError);
  });

  it('menyusun argumen yt-dlp dengan --no-playlist dan format MP4', () => {
    const args = buildYtDlpArgs(
      'https://www.youtube.com/watch?v=abc123',
      'storage/staging/proj-1.mp4'
    );

    expect(args).toContain('--no-playlist');
    expect(args).toContain('--merge-output-format');
    expect(args).toContain('mp4');
    expect(args[args.length - 1]).toBe('https://www.youtube.com/watch?v=abc123');
  });
});
