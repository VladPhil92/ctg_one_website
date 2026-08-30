import { NextResponse } from 'next/server';

import {
  createAdminClient,
  createAuthenticatedRequestContext,
  isSupabaseConfigured,
} from '@/lib/supabase/server';
import { applyWalletCors, walletCorsPreflight } from '@/lib/wallet/cors';

const CORS_METHODS = ['POST', 'OPTIONS'] as const;
const MAX_BODY_BYTES = 1024;
const AUTHORIZATION_VERSION = 'ctg-wallet-authorization-v1' as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_RE = /^[0-9a-f]{64}$/i;
const ALLOWED_BODY_KEYS = new Set(['version', 'simulationDigestSha256']);

function noStoreJson(request: Request, body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  return applyWalletCors(request, NextResponse.json(body, { ...init, headers }), CORS_METHODS);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getIntentId(request: Request) {
  const pathname = new URL(request.url).pathname;
  const match = /^\/api\/wallet\/intents\/([^/]+)\/authorize\/?$/.exec(pathname);
  const intentId = match?.[1] ?? '';
  return UUID_RE.test(intentId) ? intentId : null;
}

function parseAuthorizationBody(value: unknown) {
  if (!isRecord(value)) return null;
  if (Object.keys(value).some((key) => !ALLOWED_BODY_KEYS.has(key))) return null;
  if (value.version !== AUTHORIZATION_VERSION) return null;
  if (typeof value.simulationDigestSha256 !== 'string') return null;

  const simulationDigestSha256 = value.simulationDigestSha256.trim().toLowerCase();
  if (!SHA256_RE.test(simulationDigestSha256)) return null;

  return { simulationDigestSha256 };
}

function rpcStatus(message: string) {
  if (message.includes('WALLET_AUTH_RATE_LIMITED')) return 429;
  if (message.includes('WALLET_AUTH_INTENT_NOT_FOUND')) return 404;
  if (message.includes('WALLET_AUTH_REPLAY_CONFLICT')) return 409;
  if (message.includes('WALLET_AUTH_SIGNER_UNAVAILABLE')) return 409;
  if (message.includes('WALLET_AUTH_IDENTITY_UNVERIFIED')) return 409;
  if (message.includes('WALLET_AUTH_INTENT_EXPIRED')) return 409;
  if (message.includes('WALLET_AUTH_STATUS_INVALID')) return 409;
  if (message.includes('WALLET_AUTH_EXTERNAL_STATE_PRESENT')) return 409;
  if (message.includes('WALLET_AUTH_')) return 400;
  return 503;
}

export function OPTIONS(request: Request) {
  return walletCorsPreflight(request, CORS_METHODS);
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return noStoreJson(request, { error: 'WALLET_AUTH_UNAVAILABLE' }, { status: 503 });
  }

  const auth = await createAuthenticatedRequestContext(request);
  if (!auth) {
    return noStoreJson(request, { error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const intentId = getIntentId(request);
  if (!intentId) {
    return noStoreJson(request, { error: 'WALLET_AUTH_INTENT_ID_INVALID' }, { status: 400 });
  }

  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (contentType !== 'application/json') {
    return noStoreJson(request, { error: 'WALLET_AUTH_CONTENT_TYPE_INVALID' }, { status: 415 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return noStoreJson(request, { error: 'WALLET_AUTH_BODY_TOO_LARGE' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStoreJson(request, { error: 'WALLET_AUTH_BODY_INVALID' }, { status: 400 });
  }

  const parsed = parseAuthorizationBody(body);
  if (!parsed) {
    return noStoreJson(request, { error: 'WALLET_AUTH_REQUEST_INVALID' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('authorize_wallet_intent_v1_server', {
    p_user_id: auth.user.id,
    p_intent_id: intentId,
    p_simulation_digest_sha256: parsed.simulationDigestSha256,
  });

  if (error) {
    return noStoreJson(
      request,
      { error: error.message.includes('WALLET_AUTH_') ? error.message : 'WALLET_AUTH_FAILED' },
      { status: rpcStatus(error.message) },
    );
  }

  if (
    !isRecord(data)
    || data.version !== AUTHORIZATION_VERSION
    || typeof data.replayed !== 'boolean'
    || typeof data.authorizedAt !== 'string'
    || typeof data.authorizedWalletAddress !== 'string'
    || typeof data.simulationDigestSha256 !== 'string'
    || !isRecord(data.intent)
  ) {
    return noStoreJson(request, { error: 'WALLET_AUTH_RESPONSE_INVALID' }, { status: 503 });
  }

  return noStoreJson(request, data, { status: 200 });
}
