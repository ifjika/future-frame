import { describe, expect, it, vi } from 'vitest';
import { IngestError } from '../../src/core/errors/AppError.js';

const execFileMock = vi.fn();

vi.mock('node:child_process', () => ({
  execFile: execFileMock,
}));

const { VideoProbeService } = await import('../../src/modules/ingest/video-probe.js');

describe('VideoProbeService', () => {
  it('mem-parsing metadata FFprobe 16:9 dengan benar', async () => {
    execFileMock.mockImplementationOnce(
      (_cmd: string, _args: string[], _opts: unknown, cb: (err: Error | null, res: { stdout: string; stderr: string }) => void) => {
        cb(null, {
          stdout: JSON.stringify({
            streams: [
              {
                codec_type: 'video',
                codec_name: 'h264',
                width: 1920,
                height: 1080,
                r_frame_rate: '30000/1001',
              },
              {
                codec_type: 'audio',
                codec_name: 'aac',
              },
            ],
            format: {
              filename: 'storage/staging/demo.mp4',
              format_name: 'mov,mp4,m4a,3gp,3g2,mj2',
              duration: '125.5',
              size: '52428800',
              bit_rate: '3342000',
            },
          }),
          stderr: '',
        });
      }
    );

    const probeService = new VideoProbeService();
    const metadata = await probeService.probe('storage/staging/demo.mp4');

    expect(metadata.aspectRatio).toBe('16:9');
    expect(metadata.fps).toBe(29.97);
    expect(metadata.videoCodec).toBe('h264');
    expect(metadata.audioCodec).toBe('aac');
    expect(metadata.hasAudio).toBe(true);
    expect(metadata.durationSeconds).toBe(125.5);
  });

  it('melempar IngestError jika berkas tidak memiliki stream video', async () => {
    execFileMock.mockImplementationOnce(
      (_cmd: string, _args: string[], _opts: unknown, cb: (err: Error | null, res: { stdout: string; stderr: string }) => void) => {
        cb(null, {
          stdout: JSON.stringify({
            streams: [{ codec_type: 'audio', codec_name: 'aac' }],
            format: {
              filename: 'storage/staging/audio-only.m4a',
              format_name: 'mov,mp4,m4a,3gp,3g2,mj2',
              duration: '60',
              size: '1024',
            },
          }),
          stderr: '',
        });
      }
    );

    const probeService = new VideoProbeService();
    await expect(probeService.probe('storage/staging/audio-only.m4a')).rejects.toThrow(IngestError);
  });
});
