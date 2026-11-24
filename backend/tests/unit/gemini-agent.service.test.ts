import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GoogleGenAI } from '@google/genai';
import { InferenceError } from '../../src/core/errors/AppError.js';
import {
  GeminiAgentService,
  buildExtractionPrompt,
} from '../../src/modules/agent/gemini-agent.service.js';

describe('GeminiAgentService (AAA)', () => {
  let tempDir: string | null = null;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('menyusun prompt dengan isolasi boundary XML <untrusted_audio_stream>', () => {
    const prompt = buildExtractionPrompt('proj-1', 600);
    expect(prompt).toContain('<untrusted_audio_stream>');
    expect(prompt).toContain('</untrusted_audio_stream>');
    expect(prompt).toContain('proj-1');
  });

  it('mengunggah audio, memvalidasi JSON, menghitung ulang hook_score, dan menghapus file remote', async () => {
    // Arrange
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'ff-agent-'));
    const audioPath = path.join(tempDir, 'audio.m4a');
    await writeFile(audioPath, 'dummy-audio-bytes');

    const uploadMock = vi.fn().mockResolvedValue({
      name: 'files/abc123',
      uri: 'https://generativelanguage.googleapis.com/v1beta/files/abc123',
      mimeType: 'audio/mp4',
    });
    const deleteMock = vi.fn().mockResolvedValue({});
    const generateContentMock = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        project_id: 'proj-1',
        source_duration_seconds: 600,
        clips: [
          {
            clip_id: 'clip-1',
            timestamp_start: '00:01:00.000',
            timestamp_end: '00:01:45.000',
            duration_seconds: 45,
            curiosity_score: 9.0,
            emotion_score: 8.0,
            actionable_score: 7.0,
            hook_score: 9.99, // sengaja salah agar terverifikasi dihitung ulang
            topic: 'Strategi hook 3 detik',
            suggested_title: 'Rahasia Retensi 3 Detik Pertama',
            recommended_aspect_ratio: '9:16',
            crop_focus_coordinates: { x: 0.5, y: 0.5 },
          },
        ],
      }),
    });

    const mockClient = {
      files: { upload: uploadMock, delete: deleteMock },
      models: { generateContent: generateContentMock },
    } as unknown as GoogleGenAI;

    const service = new GeminiAgentService(() => mockClient);

    // Act
    const result = await service.extractClips({
      projectId: 'proj-1',
      audioPath,
      sourceDurationSeconds: 600,
    });

    // Assert
    expect(uploadMock).toHaveBeenCalledTimes(1);
    expect(generateContentMock).toHaveBeenCalledTimes(1);
    expect(deleteMock).toHaveBeenCalledWith({ name: 'files/abc123' });
    expect(result.clips[0]?.hook_score).toBe(8.1);
  });

  it('melempar InferenceError jika JSON Gemini invalid dan tetap menghapus file remote', async () => {
    // Arrange
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'ff-agent-'));
    const audioPath = path.join(tempDir, 'audio.m4a');
    await writeFile(audioPath, 'dummy-audio-bytes');

    const deleteMock = vi.fn().mockResolvedValue({});
    const mockClient = {
      files: {
        upload: vi.fn().mockResolvedValue({
          name: 'files/bad123',
          uri: 'https://generativelanguage.googleapis.com/v1beta/files/bad123',
        }),
        delete: deleteMock,
      },
      models: {
        generateContent: vi.fn().mockResolvedValue({ text: '{invalid-json' }),
      },
    } as unknown as GoogleGenAI;

    const service = new GeminiAgentService(() => mockClient);

    // Act & Assert
    await expect(
      service.extractClips({ projectId: 'proj-1', audioPath, sourceDurationSeconds: 600 })
    ).rejects.toThrow(InferenceError);
    expect(deleteMock).toHaveBeenCalledWith({ name: 'files/bad123' });
  });

  it('melempar InferenceError jika file audio lokal tidak ditemukan', async () => {
    const service = new GeminiAgentService();
    await expect(
      service.extractClips({
        projectId: 'proj-1',
        audioPath: 'storage/preprocessed/tidak-ada.m4a',
        sourceDurationSeconds: 600,
      })
    ).rejects.toThrow(InferenceError);
  });
});
