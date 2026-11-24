import { describe, expect, it } from 'vitest';
import {
  GeminiClipExtractionResponseSchema,
  calculateHookScore,
  parseTimestampToSeconds,
} from '../../src/core/schemas/gemini-response.schema.js';

describe('gemini-response.schema (AAA)', () => {
  it('menghitung hook score tertimbang secara deterministik', () => {
    // Arrange
    const curiosity = 9.0;
    const emotion = 8.0;
    const actionable = 7.0;

    // Act
    const score = calculateHookScore(curiosity, emotion, actionable);

    // Assert (9*0.4 + 8*0.3 + 7*0.3 = 3.6 + 2.4 + 2.1 = 8.1)
    expect(score).toBe(8.1);
  });

  it('mengonversi timestamp HH:MM:SS.mmm ke detik secara akurat', () => {
    // Arrange & Act
    const seconds = parseTimestampToSeconds('00:04:12.500');

    // Assert
    expect(seconds).toBe(252.5);
  });

  it('lolos validasi untuk payload JSON Gemini yang valid', () => {
    // Arrange
    const payload = {
      project_id: 'proj-123',
      source_duration_seconds: 1800,
      clips: [
        {
          clip_id: 'clip-1',
          timestamp_start: '00:04:12.500',
          timestamp_end: '00:05:01.000',
          duration_seconds: 48.5,
          curiosity_score: 9.0,
          emotion_score: 8.5,
          actionable_score: 8.0,
          hook_score: 8.55,
          topic: 'Kesalahan umum kreator di 3 detik pertama',
          suggested_title: 'Kenapa 90% Konten Gagal di 3 Detik Awal',
          recommended_aspect_ratio: '9:16',
          crop_focus_coordinates: { x: 0.5, y: 0.45 },
        },
      ],
    };

    // Act
    const result = GeminiClipExtractionResponseSchema.safeParse(payload);

    // Assert
    expect(result.success).toBe(true);
  });

  it('menolak payload jika timestamp_end lebih kecil dari timestamp_start', () => {
    // Arrange
    const invalidPayload = {
      project_id: 'proj-123',
      source_duration_seconds: 1800,
      clips: [
        {
          clip_id: 'clip-bad',
          timestamp_start: '00:05:01.000',
          timestamp_end: '00:04:12.500',
          duration_seconds: 48.5,
          curiosity_score: 8.0,
          emotion_score: 8.0,
          actionable_score: 8.0,
          hook_score: 8.0,
          topic: 'Topik uji',
          suggested_title: 'Judul Uji Minimal Lima Karakter',
          recommended_aspect_ratio: '9:16',
          crop_focus_coordinates: { x: 0.5, y: 0.5 },
        },
      ],
    };

    // Act
    const result = GeminiClipExtractionResponseSchema.safeParse(invalidPayload);

    // Assert
    expect(result.success).toBe(false);
  });

  it('menolak payload jika format timestamp tidak sesuai HH:MM:SS.mmm', () => {
    // Arrange
    const badFormatPayload = {
      project_id: 'proj-123',
      source_duration_seconds: 600,
      clips: [
        {
          clip_id: 'clip-bad-ts',
          timestamp_start: '04:12',
          timestamp_end: '05:00',
          duration_seconds: 48,
          curiosity_score: 8.0,
          emotion_score: 8.0,
          actionable_score: 8.0,
          hook_score: 8.0,
          topic: 'Topik uji',
          suggested_title: 'Judul Uji Minimal Lima Karakter',
          recommended_aspect_ratio: '9:16',
          crop_focus_coordinates: { x: 0.5, y: 0.5 },
        },
      ],
    };

    // Act
    const result = GeminiClipExtractionResponseSchema.safeParse(badFormatPayload);

    // Assert
    expect(result.success).toBe(false);
  });
});
