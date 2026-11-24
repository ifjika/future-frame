import type { ConnectionOptions } from 'bullmq';

export function getRedisConnectionOptions(): ConnectionOptions {
  const host = process.env['REDIS_HOST']?.trim() || '127.0.0.1';
  const portRaw = Number(process.env['REDIS_PORT'] ?? 6379);
  const port = Number.isInteger(portRaw) && portRaw > 0 ? portRaw : 6379;
  const password = process.env['REDIS_PASSWORD']?.trim();

  return {
    host,
    port,
    maxRetriesPerRequest: null,
    ...(password ? { password } : {}),
  };
}
