import { NextResponse } from 'next/server';

import {
  createAdminClient,
  createAuthenticatedRequestContext,
  isSupabaseConfigured,
} from '@/lib/supabase/server';
import {
  assertReviewedWalletCanaryClientCommitSha,
  WALLET_CANARY_CLIENT_VERSION,
  WalletCanaryClientProvenanceError,
} from '@/lib/wallet/canary-client-provenance';
import { applyWalletCors, walletCorsPreflight } from '@/lib/wallet/cors';
import {
  assertWalletCryptoSendExecutionAllowed,
  WalletExecutionRolloutError,
} from '@/lib/wallet/execution-rollout';

const CORS_METHODS = ['POST', 'OPTIONS'] as const;
const MAX_BODY_BYTES = 256;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_BODY_KEYS = new Set(['version', 'clientCommitSha']);

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
  const match = /^\/api\/wallet\/intents\/([^/]+)\/canary-client\/?$/.exec(pathname);
  const intentId = match?.[1] ?? '';
  return UUID_RE.test(intentId) ? intentId : null;
}

function parseBody(value: unknown) {
  if (!isRecord(value)) return null;
  if (Object.keys(value).some((key) => !ALLOWED_BODY_KEYS.has(key))) return null;
  if (value.version !== WALLET_CANARY_CLIENT_VERSION) return null;
  try {
    return assertReviewedWalletCanaryClientCommitSha(value.clientCommitSha);
  } catch (error) {
    if (error instanceof WalletCanaryClientProvenanceError) throw error;
    return null;
  }
}

function rpcStatus(message: string) {
  if (message.includes('WALLET_CANARY_CLIENT_INTENT_NOT_FOUND')) return 404;
  if (message.includes('WALLET_CANARY_CLIENT_COMMIT_CONFLICT')) return 409;
  if (message.includes('WALLET_CANARY_CLIENT_INTENT_NOT_BINDABLE')) return 409;
  if (message.includes('WALLET_CANARY_CLIENT_')) return 400;
  return 503;
}

function rolloutStatus(code: string) {
  return code === 'WALLET_EXECUTION_CONFIG_INVALID' ? 503 : 403;
}

export function OPTIONS(request: Request) {
  return walletCorsPreflight(request, CORS_METHODS);
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return noStoreJson(request, { error: 'WALLET_CANARY_CLIENT_UNAVAILABLE' }, { status: 503 });
  }

  const auth = await createAuthenticatedRequestContext(request);
  if (!auth) return noStoreJson(request, { error: 'UNAUTHENTICATED' }, { status: 401 });

  const intentId = getIntentId(request);
  if (!intentId) return noStoreJson(request, { error: 'WALLET_CANARY_CLIENT_INTENT_ID_INVALID' }, { status: 400 });

  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (contentType !== 'application/json') {
    return noStoreJson(request, { error: 'WALLET_CANARY_CLIENT_CONTENT_TYPE_INVALID' }, { status: 415 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return noStoreJson(request, { error: 'WALLET_CANARY_CLIENT_BODY_TOO_LARGE' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStoreJson(request, { error: 'WALLET_CANARY_CLIENT_BODY_INVALID' }, { status: 400 });
  }

  let clientCommitSha: string;
  try {
    const parsed = parseBody(body);
    if (!parsed) return noStoreJson(request, { error: 'WALLET_CANARY_CLIENT_REQUEST_INVALID' }, { status: 400 });
    clientCommitSha = parsed;
  } catch (error) {
    if (error instanceof WalletCanaryClientProvenanceError) {
      const status = error.code === 'WALLET_CANARY_CLIENT_COMMIT_NOT_REVIEWED' ? 403 : 503;
      return noStoreJson(request, { error: error.code }, { status });
    }
    return noStoreJson(request, { error: 'WALLET_CANARY_CLIENT_REQUEST_INVALID' }, { status: 400 });
  }

  try {
    assertWalletCryptoSendExecutionAllowed(auth.user.id);
  } catch (error) {
    if (error instanceof WalletExecutionRolloutError) {
      return noStoreJson(request, { error: error.code }, { status: rolloutStatus(error.code) });
    }
    return noStoreJson(request, { error: 'WALLET_EXECUTION_GATE_FAILED' }, { status: 503 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('bind_wallet_canary_client_v1_server', {
    p_user_id: auth.user.id,
    p_intent_id: intentId,
    p_client_commit_sha: clientCommitSha,
  });

  if (error) {
    return noStoreJson(
      request,
      { error: error.message.includes('WALLET_CANARY_CLIENT_') ? error.message : 'WALLET_CANARY_CLIENT_BIND_FAILED' },
      { status: rpcStatus(error.message) },
    );
  }

  if (
    !isRecord(data)
    || data.version !== WALLET_CANARY_CLIENT_VERSION
    || typeof data.replayed !== 'boolean'
    || data.intentId !== intentId
    || data.clientCommitSha !== clientCommitSha
    || typeof data.boundAt !== 'string'
    || Number.isNaN(Date.parse(data.boundAt))
  ) {
    return noStoreJson(request, { error: 'WALLET_CANARY_CLIENT_CONTRACT_VIOLATION' }, { status: 503 });
  }

  return noStoreJson(request, {
    version: WALLET_CANARY_CLIENT_VERSION,
    replayed: data.replayed,
    intentId,
    clientCommitSha,
    boundAt: data.boundAt,
  });
}
