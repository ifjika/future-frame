import { describe, expect, it } from 'vitest';
import { InMemoryProjectStore } from '../../src/modules/ingest/project.store.js';
import { buildServer } from '../../src/server.js';

describe('projects.routes & server (AAA)', () => {
  it('returns 200 OK on GET /health', async () => {
    // Arrange
    const app = await buildServer(new InMemoryProjectStore(), { logger: false });

    // Act
    const response = await app.inject({ method: 'GET', url: '/health' });

    // Assert
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'ok',
      service: 'FutureFrame API Gateway',
    });
    await app.close();
  }, 20_000);

  it('returns 404 when project is not found on GET /projects/:id', async () => {
    const app = await buildServer(new InMemoryProjectStore(), { logger: false });
    const response = await app.inject({ method: 'GET', url: '/projects/non-existent' });

    expect(response.statusCode).toBe(404);
    await app.close();
  });

  it('returns 202 Accepted when triggering render for a valid clip', async () => {
    // Arrange
    const store = new InMemoryProjectStore();
    store.create({
      id: 'proj-1',
      title: 'demo.mp4',
      status: 'ANALYZED',
      inputPath: 'storage/staging/tidak-ada.mp4',
      metadata: {
        filePath: 'storage/staging/tidak-ada.mp4',
        durationSeconds: 120,
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        fps: 30,
        videoCodec: 'h264',
        audioCodec: 'aac',
        hasAudio: true,
        sizeBytes: 1024,
        bitrateKbps: 1000,
      },
      clips: [
        {
          clip_id: 'clip-1',
          timestamp_start: '00:00:05.000',
          timestamp_end: '00:00:35.000',
          duration_seconds: 30,
          curiosity_score: 8.5,
          emotion_score: 8.0,
          actionable_score: 8.5,
          hook_score: 8.35,
          topic: 'Pembuka',
          suggested_title: 'Hook Pembuka Video',
          recommended_aspect_ratio: '9:16',
          crop_focus_coordinates: { x: 0.5, y: 0.5 },
          renderStatus: 'idle',
        },
      ],
      createdAt: new Date().toISOString(),
    });

    const app = await buildServer(store, { logger: false });

    // Act
    const response = await app.inject({
      method: 'POST',
      url: '/projects/proj-1/clips/clip-1/render',
      payload: { focusX: 0.6 },
    });

    // Assert
    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ status: 'rendering', clipId: 'clip-1' });
    await app.close();
  });
});
