import { NextResponse } from 'next/server';

import {
  createAdminClient,
  createAuthenticatedRequestContext,
  isSupabaseConfigured,
} from '@/lib/supabase/server';
import { applyWalletCors, walletCorsPreflight } from '@/lib/wallet/cors';
import {
  WALLET_CHAIN_RECONCILIATION_VERSION,
  WalletChainReconciliationError,
} from '@/lib/wallet/chain-reconciliation';
import {
  normalizeWalletChainIntentSnapshot,
  reconcileWalletChainIntentV1,
  WALLET_CHAIN_INTENT_SELECT,
  WalletChainPersistenceError,
} from '@/lib/wallet/chain-reconciliation-service';

const CORS_METHODS = ['POST', 'OPTIONS'] as const;
const MAX_BODY_BYTES = 256;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_BODY_KEYS = new Set(['version']);

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
  const match = /^\/api\/wallet\/intents\/([^/]+)\/reconcile\/?$/.exec(pathname);
  const intentId = match?.[1] ?? '';
  return UUID_RE.test(intentId) ? intentId : null;
}

function validBody(value: unknown) {
  return isRecord(value)
    && !Object.keys(value).some((key) => !ALLOWED_BODY_KEYS.has(key))
    && value.version === WALLET_CHAIN_RECONCILIATION_VERSION;
}

function rpcStatus(message: string) {
  if (message.includes('WALLET_CHAIN_RECONCILE_RATE_LIMITED')) return 429;
  if (message.includes('WALLET_CHAIN_INTENT_NOT_FOUND')) return 404;
  if (
    message.includes('WALLET_CHAIN_RECONCILED_TERMINAL')
    || message.includes('WALLET_CHAIN_FAILED_TERMINAL')
    || message.includes('WALLET_CHAIN_SUBMISSION_BINDING_INVALID')
    || message.includes('WALLET_CHAIN_RECONCILIATION_STATUS_INVALID')
  ) return 409;
  if (message.includes('WALLET_CHAIN_')) return 400;
  return 503;
}

function adapterStatus(code: string) {
  if (
    code === 'WALLET_CHAIN_RPC_UNAVAILABLE'
    || code === 'WALLET_CHAIN_RPC_INVALID'
    || code === 'WALLET_CHAIN_RPC_INSECURE'
    || code === 'WALLET_CHAIN_RPC_FAILED'
    || code === 'WALLET_CHAIN_RPC_RESPONSE_INVALID'
    || code === 'WALLET_CHAIN_RPC_REJECTED'
    || code === 'WALLET_CHAIN_RPC_CHAIN_INVALID'
    || code === 'WALLET_CHAIN_RPC_CHAIN_MISMATCH'
    || code === 'WALLET_CHAIN_CONFIRMATION_CONFIG_INVALID'
    || code === 'WALLET_CHAIN_TRANSACTION_INVALID'
    || code === 'WALLET_CHAIN_TRANSACTION_TO_INVALID'
    || code === 'WALLET_CHAIN_TRANSACTION_BLOCK_INVALID'
    || code === 'WALLET_CHAIN_TRANSACTION_VALUE_INVALID'
    || code === 'WALLET_CHAIN_RECEIPT_INVALID'
    || code === 'WALLET_CHAIN_RECEIPT_TO_INVALID'
    || code === 'WALLET_CHAIN_RECEIPT_STATUS_INVALID'
    || code === 'WALLET_CHAIN_RECEIPT_BLOCK_INVALID'
    || code === 'WALLET_CHAIN_LATEST_BLOCK_INVALID'
    || code === 'WALLET_CHAIN_CONFIRMATIONS_INVALID'
  ) return 503;
  return 400;
}

export function OPTIONS(request: Request) {
  return walletCorsPreflight(request, CORS_METHODS);
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return noStoreJson(request, { error: 'WALLET_CHAIN_RECONCILIATION_UNAVAILABLE' }, { status: 503 });
  }

  const auth = await createAuthenticatedRequestContext(request);
  if (!auth) return noStoreJson(request, { error: 'UNAUTHENTICATED' }, { status: 401 });

  const intentId = getIntentId(request);
  if (!intentId) return noStoreJson(request, { error: 'WALLET_CHAIN_INTENT_ID_INVALID' }, { status: 400 });

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
  if (!validBody(body)) {
    return noStoreJson(request, { error: 'WALLET_CHAIN_RECONCILIATION_REQUEST_INVALID' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: rawIntent, error: intentError } = await admin
    .from('wallet_intents_v2')
    .select(WALLET_CHAIN_INTENT_SELECT)
    .eq('id', intentId)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (intentError) {
    return noStoreJson(request, { error: 'WALLET_CHAIN_INTENT_READ_FAILED' }, { status: 503 });
  }
  if (!rawIntent) return noStoreJson(request, { error: 'WALLET_CHAIN_INTENT_NOT_FOUND' }, { status: 404 });

  const intent = normalizeWalletChainIntentSnapshot(rawIntent);
  if (!intent || intent.user_id !== auth.user.id) {
    return noStoreJson(request, { error: 'WALLET_CHAIN_INTENT_SHAPE_INVALID' }, { status: 409 });
  }

  try {
    const result = await reconcileWalletChainIntentV1(admin, intent);
    return noStoreJson(request, {
      ...result.record,
      observation: {
        status: result.observation.status,
        blockNumber: result.observation.blockNumber,
        confirmations: result.observation.confirmations,
        failureCode: result.observation.failureCode,
        evidenceDigestSha256: result.observation.evidenceDigestSha256,
      },
    });
  } catch (error) {
    if (error instanceof WalletChainReconciliationError) {
      return noStoreJson(request, { error: error.code }, { status: adapterStatus(error.code) });
    }
    if (error instanceof WalletChainPersistenceError) {
      return noStoreJson(request, { error: error.code }, { status: rpcStatus(error.code) });
    }
    return noStoreJson(request, { error: 'WALLET_CHAIN_RECONCILIATION_ADAPTER_FAILED' }, { status: 503 });
  }
}
