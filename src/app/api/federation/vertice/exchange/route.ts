import { NextResponse } from 'next/server';

import {
  federationSecretState,
  isValidPkceVerifier,
  pkceChallengeForVerifier,
  sha256Hex,
  VERTICE_FEDERATION_PROVIDER,
} from '@/lib/federation/vertice';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const JSON_MIME = 'application/json';
const MAX_BODY_BYTES = 4 * 1024;
const SERVICE_RATE_LIMIT_SCOPE = 'federation.vertice.exchange';
const SERVICE_RATE_LIMIT_ACTOR = 'vertice';
const EXCHANGE_KEYS = new Set(['code', 'code_verifier']);

type ExchangeBody = {
  code?: unknown;
  code_verifier?: unknown;
};

type ServiceRateLimitRow = {
  allowed: boolean;
  remaining: number;
  retry_after_seconds: number;
};

class RequestBodyError extends Error {
  constructor(
    readonly code: 'INVALID_JSON' | 'PAYLOAD_TOO_LARGE',
    readonly status: 400 | 413,
  ) {
    super(code);
  }
}

function noStoreJson(
  body: unknown,
  status: number,
  extraHeaders: HeadersInit = {},
) {
  const headers = new Headers(extraHeaders);
  headers.set('Cache-Control', 'no-store');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('X-Content-Type-Options', 'nosniff');
  return NextResponse.json(body, { status, headers });
}

function requestMime(request: Request): string {
  return (request.headers.get('content-type') ?? '')
    .split(';', 1)[0]
    .trim()
    .toLowerCase();
}

async function readBoundedJson(request: Request): Promise<unknown> {
  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (!Number.isFinite(contentLength) || contentLength < 0) {
      throw new RequestBodyError('INVALID_JSON', 400);
    }
    if (contentLength > MAX_BODY_BYTES) {
      throw new RequestBodyError('PAYLOAD_TOO_LARGE', 413);
    }
  }

  if (!request.body) {
    throw new RequestBodyError('INVALID_JSON', 400);
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let raw = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new RequestBodyError('PAYLOAD_TOO_LARGE', 413);
      }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
  } catch (error) {
    if (error instanceof RequestBodyError) throw error;
    throw new RequestBodyError('INVALID_JSON', 400);
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new RequestBodyError('INVALID_JSON', 400);
  }
}

function parseExchangeBody(value: unknown): ExchangeBody | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !EXCHANGE_KEYS.has(key))) return null;
  return record;
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return noStoreJson({ error: 'FEDERATION_UNAVAILABLE' }, 503);
  }

  const secretState = federationSecretState(request);
  if (secretState === 'unconfigured') {
    return noStoreJson({ error: 'FEDERATION_SECRET_NOT_CONFIGURED' }, 503);
  }
  if (secretState !== 'authorized') {
    return noStoreJson({ error: 'UNAUTHORIZED' }, 401);
  }

  const admin = createAdminClient();
  const { data: rateData, error: rateError } = await admin.rpc(
    'consume_service_api_rate_limit',
    {
      p_scope: SERVICE_RATE_LIMIT_SCOPE,
      p_actor_key: SERVICE_RATE_LIMIT_ACTOR,
    },
  );
  if (rateError) {
    return noStoreJson({ error: 'FEDERATION_RATE_LIMIT_UNAVAILABLE' }, 503);
  }

  const rateRow = (
    Array.isArray(rateData) ? rateData[0] : rateData
  ) as ServiceRateLimitRow | null;
  if (!rateRow) {
    return noStoreJson({ error: 'FEDERATION_RATE_LIMIT_UNAVAILABLE' }, 503);
  }
  if (rateRow.allowed !== true) {
    const retryAfterSeconds = Math.max(1, Number(rateRow.retry_after_seconds ?? 1));
    return noStoreJson(
      { error: 'RATE_LIMITED', retryAfterSeconds },
      429,
      { 'Retry-After': String(retryAfterSeconds) },
    );
  }

  if (requestMime(request) !== JSON_MIME) {
    return noStoreJson({ error: 'UNSUPPORTED_MEDIA_TYPE' }, 415);
  }

  let body: ExchangeBody;
  try {
    const parsed = parseExchangeBody(await readBoundedJson(request));
    if (!parsed) {
      return noStoreJson({ error: 'INVALID_EXCHANGE_REQUEST' }, 400);
    }
    body = parsed;
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return noStoreJson({ error: error.code }, error.status);
    }
    return noStoreJson({ error: 'INVALID_JSON' }, 400);
  }

  const code = typeof body.code === 'string' ? body.code : '';
  if (!/^[A-Za-z0-9_-]{43}$/.test(code) || !isValidPkceVerifier(body.code_verifier)) {
    return noStoreJson({ error: 'INVALID_EXCHANGE_REQUEST' }, 400);
  }

  const codeHash = sha256Hex(code);
  const challenge = pkceChallengeForVerifier(body.code_verifier);
  const consumedAt = new Date().toISOString();

  const { data, error } = await admin
    .from('identity_federation_authorization_codes')
    .update({ consumed_at: consumedAt })
    .eq('provider', VERTICE_FEDERATION_PROVIDER)
    .eq('code_hash', codeHash)
    .eq('code_challenge', challenge)
    .is('consumed_at', null)
    .gt('expires_at', consumedAt)
    .select('subject_user_id, subject_email, subject_email_verified')
    .maybeSingle();

  if (error) {
    return noStoreJson({ error: 'FEDERATION_EXCHANGE_FAILED' }, 503);
  }
  if (!data || !data.subject_email_verified) {
    return noStoreJson({ error: 'INVALID_OR_EXPIRED_CODE' }, 401);
  }

  // Authorities are server-managed attestations. They are never derived from
  // user_metadata or other user-editable claims. VERTICE uses the bootstrap
  // authority only to establish its first superadmin; ongoing grants are
  // managed inside VERTICE itself.
  const { data: authorityRows, error: authorityError } = await admin
    .from('identity_federation_authorities')
    .select('authority')
    .eq('provider', VERTICE_FEDERATION_PROVIDER)
    .eq('subject_user_id', data.subject_user_id)
    .is('revoked_at', null);

  if (authorityError) {
    return noStoreJson({ error: 'FEDERATION_AUTHORITY_LOOKUP_FAILED' }, 503);
  }

  return noStoreJson({
    provider: VERTICE_FEDERATION_PROVIDER,
    subject: data.subject_user_id,
    email: data.subject_email,
    email_verified: true,
    authorities: (authorityRows ?? []).map((row) => row.authority),
  }, 200);
}
