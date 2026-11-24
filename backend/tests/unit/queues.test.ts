import { afterEach, describe, expect, it } from 'vitest';
import { getRedisConnectionOptions } from '../../src/config/redis.js';
import { ValidationError } from '../../src/core/errors/AppError.js';
import {
  DEFAULT_JOB_OPTIONS,
  buildInferenceJobId,
  buildIngestJobId,
  buildRenderJobId,
} from '../../src/queue/queues.js';

describe('redis & queues (AAA)', () => {
  const originalHost = process.env['REDIS_HOST'];
  const originalPort = process.env['REDIS_PORT'];
  const originalPass = process.env['REDIS_PASSWORD'];

  afterEach(() => {
    process.env['REDIS_HOST'] = originalHost;
    process.env['REDIS_PORT'] = originalPort;
    process.env['REDIS_PASSWORD'] = originalPass;
  });

  it('membaca konfigurasi Redis dengan maxRetriesPerRequest: null untuk BullMQ', () => {
    // Arrange
    process.env['REDIS_HOST'] = '127.0.0.1';
    process.env['REDIS_PORT'] = '6379';
    process.env['REDIS_PASSWORD'] = '';

    // Act
    const conn = getRedisConnectionOptions();

    // Assert
    expect(conn).toEqual({
      host: '127.0.0.1',
      port: 6379,
      maxRetriesPerRequest: null,
    });
  });

  it('menghasilkan Job ID deterministik untuk mencegah duplikasi job (idempotency)', () => {
    expect(buildIngestJobId('proj-1')).toBe('ff_ingest_proj-1');
    expect(buildInferenceJobId('proj-1')).toBe('ff_infer_proj-1');
    expect(buildRenderJobId('proj-1', 'clip-2')).toBe('ff_render_proj-1_clip-2');
  });

  it('melempar ValidationError jika projectId atau clipId kosong', () => {
    expect(() => buildIngestJobId('   ')).toThrow(ValidationError);
    expect(() => buildRenderJobId('proj-1', '')).toThrow(ValidationError);
  });

  it('mengonfigurasi retry 3x dengan exponential backoff pada DEFAULT_JOB_OPTIONS', () => {
    expect(DEFAULT_JOB_OPTIONS.attempts).toBe(3);
    expect(DEFAULT_JOB_OPTIONS.backoff).toEqual({
      type: 'exponential',
      delay: 2000,
    });
  });
});
