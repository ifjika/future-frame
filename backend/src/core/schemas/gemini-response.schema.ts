import { z } from 'zod';

export const TimestampRegex = /^([0-9]{2}):([0-5][0-9]):([0-5][0-9])\.([0-9]{3})$/;

export const TimestampStringSchema = z
  .string()
  .regex(TimestampRegex, 'Timestamp wajib berformat HH:MM:SS.mmm');

export function parseTimestampToSeconds(timestamp: string): number {
  const [hms = '00:00:00', msStr = '0'] = timestamp.split('.');
  const [hStr = '0', mStr = '0', sStr = '0'] = hms.split(':');
  const hours = Number(hStr);
  const minutes = Number(mStr);
  const seconds = Number(sStr);
  const millis = Number(msStr);
  return hours * 3600 + minutes * 60 + seconds + millis / 1000;
}

export function calculateHookScore(
  curiosity: number,
  emotion: number,
  actionable: number
): number {
  const weighted = curiosity * 0.4 + emotion * 0.3 + actionable * 0.3;
  return Number(weighted.toFixed(2));
}

export const CropCoordinatesSchema = z.object({
  x: z.number().min(0.0).max(1.0).default(0.5),
  y: z.number().min(0.0).max(1.0).default(0.5),
});

export const ExtractedClipSchema = z
  .object({
    clip_id: z.string().min(1),
    timestamp_start: TimestampStringSchema,
    timestamp_end: TimestampStringSchema,
    duration_seconds: z.number().min(15.0).max(90.0),
    curiosity_score: z.number().min(1.0).max(10.0),
    emotion_score: z.number().min(1.0).max(10.0),
    actionable_score: z.number().min(1.0).max(10.0),
    hook_score: z.number().min(1.0).max(10.0),
    topic: z.string().min(3).max(150),
    suggested_title: z.string().min(5).max(120),
    recommended_aspect_ratio: z.enum(['9:16', '1:1', '16:9']).default('9:16'),
    crop_focus_coordinates: CropCoordinatesSchema,
  })
  .refine(
    (clip) =>
      parseTimestampToSeconds(clip.timestamp_end) >
      parseTimestampToSeconds(clip.timestamp_start),
    {
      message: 'timestamp_end harus lebih besar dari timestamp_start',
      path: ['timestamp_end'],
    }
  );

export const GeminiClipExtractionResponseSchema = z.object({
  project_id: z.string().min(1),
  source_duration_seconds: z.number().positive(),
  clips: z.array(ExtractedClipSchema).min(1),
});

export type CropCoordinates = z.infer<typeof CropCoordinatesSchema>;
export type ExtractedClip = z.infer<typeof ExtractedClipSchema>;
export type GeminiClipExtractionResponse = z.infer<typeof GeminiClipExtractionResponseSchema>;
