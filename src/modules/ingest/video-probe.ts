import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { IngestError } from '../../core/errors/AppError.js';
import {
    RawFFprobeOutputSchema,
    type VideoMetadata
} from '../../core/schemas/video-probe.schema.js';

const execFileAsync = promisify(execFile);

export class VideoProbeService {
  /**
   * Menghitung nilai FPS desimal dari string rasio FFprobe (misal: "30000/1001" -> 29.97)
   */
  private parseFps(rFrameRate?: string): number {
    if (!rFrameRate || rFrameRate === '0/0') return 30.0;
    const parts = rFrameRate.split('/');
    if (parts.length === 2) {
      const num = Number(parts[0]);
      const den = Number(parts[1]);
      if (den > 0) return Number((num / den).toFixed(2));
    }
    return 30.0;
  }

  /**
   * Menginspeksi berkas video menggunakan binary FFprobe
   * @param filePath Path absolut menuju berkas video di staging
   */
  public async probe(filePath: string): Promise<VideoMetadata> {
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath
    ];

    let stdout: string;
    try {
      const result = await execFileAsync('ffprobe', args, {
        timeout: 15000, // 15 detik hard timeout
        maxBuffer: 10 * 1024 * 1024 // Buffer maksimal 10MB
      });
      stdout = result.stdout;
    } catch (err: unknown) {
      throw new IngestError(
        `FFprobe gagal membaca berkas media pada path: ${filePath}`,
        err instanceof Error ? err.message : err
      );
    }

    // 1. Parsing JSON stdout FFprobe
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(stdout);
    } catch {
      throw new IngestError('Gagal mem-parsing output JSON dari FFprobe');
    }

    // 2. Validasi struktur JSON dengan Zod
    const parsed = RawFFprobeOutputSchema.safeParse(parsedJson);
    if (!parsed.success) {
      throw new IngestError('Struktur metadata FFprobe tidak valid', parsed.error.issues);
    }

    const { streams, format } = parsed.data;

    // 3. Ekstraksi Stream Video
    const videoStream = streams.find((s) => s.codec_type === 'video');
    if (!videoStream || !videoStream.width || !videoStream.height) {
      throw new IngestError('Berkas media tidak memiliki stream visual (video) yang valid');
    }

    // 4. Ekstraksi Stream Audio
    const audioStream = streams.find((s) => s.codec_type === 'audio');

    const durationSeconds = Number(format.duration);
    if (isNaN(durationSeconds) || durationSeconds <= 0) {
      throw new IngestError('Durasi berkas media tidak valid atau bernilai 0 detik');
    }

    const width = videoStream.width;
    const height = videoStream.height;
    const gcdVal = (a: number, b: number): number => (b === 0 ? a : gcdVal(b, a % b));
    const divisor = gcdVal(width, height);
    const aspectRatio = `${width / divisor}:${height / divisor}`;

    return {
      filePath,
      durationSeconds: Number(durationSeconds.toFixed(2)),
      width,
      height,
      aspectRatio,
      fps: this.parseFps(videoStream.r_frame_rate),
      videoCodec: videoStream.codec_name ?? 'unknown',
      audioCodec: audioStream?.codec_name ?? null,
      hasAudio: Boolean(audioStream),
      sizeBytes: Number(format.size),
      bitrateKbps: Math.round(Number(format.bit_rate ?? 0) / 1000)
    };
  }
}
