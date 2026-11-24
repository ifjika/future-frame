import { describe, expect, it, vi } from 'vitest';
import { ValidationError } from '../../src/core/errors/AppError.js';
import {
  dispatchWebhook,
  signWebhookPayload,
} from '../../src/utils/webhook-dispatcher.js';

describe('webhook-dispatcher (AAA)', () => {
  it('menghasilkan signature HMAC-SHA256 deterministik berawalan sha256=', () => {
    const sig1 = signWebhookPayload('{"ok":true}', 'my-secret');
    const sig2 = signWebhookPayload('{"ok":true}', 'my-secret');

    expect(sig1).toMatch(/^sha256=[a-f0-9]{64}$/);
    expect(sig1).toBe(sig2);
  });

  it('mengirim POST webhook dengan header X-FutureFrame-Signature dan X-FutureFrame-Timestamp', async () => {
    // Arrange
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 }) as unknown as typeof fetch;

    // Act
    const result = await dispatchWebhook({
      url: 'https://example.com/webhooks/futureframe',
      secret: 'super-secret',
      payload: {
        event: 'clip.completed',
        projectId: 'proj-1',
        clipId: 'clip-1',
        timestamp: '2026-11-25T00:00:00.000Z',
        data: { outputUrl: '/rendered/clip-1.mp4' },
      },
      fetchImpl: mockFetch,
    });

    // Assert
    expect(result.ok).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callInit = (mockFetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as {
      headers: Record<string, string>;
    };
    expect(callInit.headers['X-FutureFrame-Signature']).toBe(result.signature);
    expect(callInit.headers['X-FutureFrame-Timestamp']).toBe('2026-11-25T00:00:00.000Z');
  });

  it('melempar ValidationError jika secret kosong atau URL tidak valid', async () => {
    expect(() => signWebhookPayload('{}', '   ')).toThrow(ValidationError);

    await expect(
      dispatchWebhook({
        url: 'not-a-url',
        secret: 'secret',
        payload: {
          event: 'clip.failed',
          projectId: 'proj-1',
          timestamp: '2026-11-25T00:00:00.000Z',
          data: {},
        },
      })
    ).rejects.toThrow(ValidationError);
  });
});
