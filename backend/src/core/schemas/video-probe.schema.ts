import { z } from 'zod';

// Skema validasi output mentah binary FFprobe
export const RawFFprobeStreamSchema = z.object({
  codec_type: z.enum(['video', 'audio', 'subtitle', 'data']),
  codec_name: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  r_frame_rate: z.string().optional(),
  duration: z.string().optional(),
  bit_rate: z.string().optional()
});

export const RawFFprobeFormatSchema = z.object({
  filename: z.string(),
  format_name: z.string(),
  duration: z.string(),
  size: z.string(),
  bit_rate: z.string().optional()
});

export const RawFFprobeOutputSchema = z.object({
  streams: z.array(RawFFprobeStreamSchema),
  format: RawFFprobeFormatSchema
});

// Domain Model bersih yang dikonsumsi oleh seluruh sistem FutureFrame
export const VideoMetadataSchema = z.object({
  filePath: z.string().min(1),
  durationSeconds: z.number().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  aspectRatio: z.string(),
  fps: z.number().positive(),
  videoCodec: z.string(),
  audioCodec: z.string().nullable(),
  hasAudio: z.boolean(),
  sizeBytes: z.number().int().nonnegative(),
  bitrateKbps: z.number().int().nonnegative()
});

export type VideoMetadata = z.infer<typeof VideoMetadataSchema>;
