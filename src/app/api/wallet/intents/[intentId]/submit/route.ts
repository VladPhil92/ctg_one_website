import { NextResponse } from 'next/server';

import {
  createAdminClient,
  createAuthenticatedRequestContext,
  isSupabaseConfigured,
} from '@/lib/supabase/server';
import { applyWalletCors, walletCorsPreflight } from '@/lib/wallet/cors';
import { WALLET_CHAIN_SUBMISSION_VERSION } from '@/lib/wallet/chain-reconciliation';

const CORS_METHODS = ['POST', 'OPTIONS'] as const;
const MAX_BODY_BYTES = 512;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TX_HASH_RE = /^0x[0-9a-f]{64}$/;
const ALLOWED_BODY_KEYS = new Set(['version', 'txHash']);

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
  const match = /^\/api\/wallet\/intents\/([^/]+)\/submit\/?$/.exec(pathname);
  const intentId = match?.[1] ?? '';
  return UUID_RE.test(intentId) ? intentId : null;
}

function parseBody(value: unknown) {
  if (!isRecord(value)) return null;
  if (Object.keys(value).some((key) => !ALLOWED_BODY_KEYS.has(key))) return null;
  if (value.version !== WALLET_CHAIN_SUBMISSION_VERSION || typeof value.txHash !== 'string') return null;
  const txHash = value.txHash.trim().toLowerCase();
  return TX_HASH_RE.test(txHash) ? { txHash } : null;
}

function rpcStatus(message: string) {
  if (message.includes('WALLET_CHAIN_SUBMIT_RATE_LIMITED')) return 429;
  if (message.includes('WALLET_CHAIN_INTENT_NOT_FOUND')) return 404;
  if (
    message.includes('WALLET_CHAIN_TX_HASH_ALREADY_BOUND')
    || message.includes('WALLET_CHAIN_SUBMISSION_REPLAY_CONFLICT')
    || message.includes('WALLET_CHAIN_EXTERNAL_STATE_CONFLICT')
    || message.includes('WALLET_CHAIN_SUBMISSION_STATUS_INVALID')
    || message.includes('WALLET_CHAIN_AUTHORIZATION_EVIDENCE_MISSING')
  ) return 409;
  if (message.includes('WALLET_CHAIN_')) return 400;
  return 503;
}

export function OPTIONS(request: Request) {
  return walletCorsPreflight(request, CORS_METHODS);
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return noStoreJson(request, { error: 'WALLET_CHAIN_SUBMISSION_UNAVAILABLE' }, { status: 503 });
  }

  const auth = await createAuthenticatedRequestContext(request);
  if (!auth) return noStoreJson(request, { error: 'UNAUTHENTICATED' }, { status: 401 });

  const intentId = getIntentId(request);
  if (!intentId) {
    return noStoreJson(request, { error: 'WALLET_CHAIN_INTENT_ID_INVALID' }, { status: 400 });
  }

  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (contentType !== 'application/json') {
    return noStoreJson(request, { error: 'WALLET_CHAIN_CONTENT_TYPE_INVALID' }, { status: 415 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return noStoreJson(request, { error: 'WALLET_CHAIN_BODY_TOO_LARGE' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStoreJson(request, { error: 'WALLET_CHAIN_BODY_INVALID' }, { status: 400 });
  }

  const parsed = parseBody(body);
  if (!parsed) {
    return noStoreJson(request, { error: 'WALLET_CHAIN_SUBMISSION_REQUEST_INVALID' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('register_wallet_chain_submission_v1_server', {
    p_user_id: auth.user.id,
    p_intent_id: intentId,
    p_tx_hash: parsed.txHash,
  });

  if (error) {
    return noStoreJson(
      request,
      { error: error.message.includes('WALLET_CHAIN_') ? error.message : 'WALLET_CHAIN_SUBMISSION_FAILED' },
      { status: rpcStatus(error.message) },
    );
  }

  if (
    !isRecord(data)
    || data.version !== WALLET_CHAIN_SUBMISSION_VERSION
    || typeof data.replayed !== 'boolean'
    || data.intentId !== intentId
    || data.txHash !== parsed.txHash
    || typeof data.status !== 'string'
    || typeof data.submittedAt !== 'string'
  ) {
    return noStoreJson(request, { error: 'WALLET_CHAIN_SUBMISSION_RESPONSE_INVALID' }, { status: 503 });
  }

  return noStoreJson(request, data, { status: 200 });
}
