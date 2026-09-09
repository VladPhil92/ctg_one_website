import { NextResponse } from 'next/server';

export class BoundedJsonError extends Error {
  constructor(
    readonly code: 'INVALID_JSON' | 'PAYLOAD_TOO_LARGE',
    readonly status: 400 | 413,
  ) {
    super(code);
  }
}

export function noStoreJson(body: unknown, status: number, extraHeaders: HeadersInit = {}) {
  const headers = new Headers(extraHeaders);
  headers.set('Cache-Control', 'no-store');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('X-Content-Type-Options', 'nosniff');
  return NextResponse.json(body, { status, headers });
}

export function isJsonRequest(request: Request): boolean {
  return (request.headers.get('content-type') ?? '').split(';', 1)[0].trim().toLowerCase() === 'application/json';
}

export async function readBoundedJson(request: Request, maxBytes = 8 * 1024): Promise<unknown> {
  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    const parsed = Number(contentLength);
    if (!Number.isFinite(parsed) || parsed < 0) throw new BoundedJsonError('INVALID_JSON', 400);
    if (parsed > maxBytes) throw new BoundedJsonError('PAYLOAD_TOO_LARGE', 413);
  }
  if (!request.body) throw new BoundedJsonError('INVALID_JSON', 400);

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let raw = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new BoundedJsonError('PAYLOAD_TOO_LARGE', 413);
      }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
    return JSON.parse(raw) as unknown;
  } catch (error) {
    if (error instanceof BoundedJsonError) throw error;
    throw new BoundedJsonError('INVALID_JSON', 400);
  }
}
