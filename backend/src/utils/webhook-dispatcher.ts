import { createHmac } from 'node:crypto';
import { ValidationError } from '../core/errors/AppError.js';

export interface WebhookEventPayload {
  event: 'clip.completed' | 'clip.failed' | 'project.analyzed';
  projectId: string;
  clipId?: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface DispatchWebhookOptions {
  url: string;
  secret: string;
  payload: WebhookEventPayload;
  fetchImpl?: typeof fetch;
}

export interface WebhookDispatchResult {
  ok: boolean;
  statusCode: number;
  signature: string;
}

/**
 * Menghasilkan signature HMAC-SHA256 (`sha256=<hex>`) agar penerima webhook dapat
 * memverifikasi bahwa payload benar-benar berasal dari FutureFrame dan tidak dimodifikasi.
 */
export function signWebhookPayload(payloadJson: string, secret: string): string {
  const trimmedSecret = secret.trim();
  if (!trimmedSecret) {
    throw new ValidationError('Webhook secret tidak boleh kosong');
  }

  const digest = createHmac('sha256', trimmedSecret).update(payloadJson).digest('hex');
  return `sha256=${digest}`;
}

export async function dispatchWebhook(
  options: DispatchWebhookOptions
): Promise<WebhookDispatchResult> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(options.url);
  } catch {
    throw new ValidationError('URL webhook tidak valid');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new ValidationError('URL webhook wajib menggunakan protokol http atau https');
  }

  const body = JSON.stringify(options.payload);
  const signature = signWebhookPayload(body, options.secret);
  const fetchFn = options.fetchImpl ?? fetch;

  const response = await fetchFn(parsedUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-FutureFrame-Signature': signature,
      'X-FutureFrame-Timestamp': options.payload.timestamp,
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });

  return {
    ok: response.ok,
    statusCode: response.status,
    signature,
  };
}
