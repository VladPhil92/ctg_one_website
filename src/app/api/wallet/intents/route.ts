import { NextResponse } from 'next/server';

import {
  createAdminClient,
  createAuthenticatedRequestContext,
  isSupabaseConfigured,
} from '@/lib/supabase/server';
import { applyWalletCors, walletCorsPreflight } from '@/lib/wallet/cors';

const CORS_METHODS = ['POST', 'OPTIONS'] as const;
const MAX_BODY_BYTES = 4096;
const INTENT_VERSION = 'ctg-wallet-intent-v1' as const;
const POLYGON_CHAIN_ID = 137 as const;
const SUPPORTED_ASSETS = new Set(['POL', 'CTG', 'USDC', 'USDT']);
const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const BASE_UNITS_RE = /^[1-9][0-9]*$/;
const ALLOWED_BODY_KEYS = new Set([
  'version',
  'kind',
  'idempotencyKey',
  'rail',
  'chainId',
  'assetSymbol',
  'amountBaseUnits',
  'destinationAddress',
]);

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

function parseCreateIntentBody(value: unknown) {
  if (!isRecord(value)) return null;
  if (Object.keys(value).some((key) => !ALLOWED_BODY_KEYS.has(key))) return null;
  if (value.version !== INTENT_VERSION || value.kind !== 'crypto_send' || value.rail !== 'polygon') {
    return null;
  }
  if (value.chainId !== POLYGON_CHAIN_ID) return null;
  if (typeof value.idempotencyKey !== 'string') return null;
  const idempotencyKey = value.idempotencyKey.trim();
  if (idempotencyKey.length < 16 || idempotencyKey.length > 128) return null;

  if (typeof value.assetSymbol !== 'string') return null;
  const assetSymbol = value.assetSymbol.trim().toUpperCase();
  if (!SUPPORTED_ASSETS.has(assetSymbol)) return null;

  if (typeof value.amountBaseUnits !== 'string') return null;
  const amountBaseUnits = value.amountBaseUnits.trim();
  if (
    amountBaseUnits.length < 1
    || amountBaseUnits.length > 78
    || !BASE_UNITS_RE.test(amountBaseUnits)
  ) return null;

  if (typeof value.destinationAddress !== 'string') return null;
  const destinationAddress = value.destinationAddress.trim().toLowerCase();
  if (!EVM_ADDRESS_RE.test(destinationAddress)) return null;

  return {
    idempotencyKey,
    assetSymbol,
    amountBaseUnits,
    destinationAddress,
  };
}

function rpcStatus(message: string) {
  if (message.includes('WALLET_INTENT_RATE_LIMITED')) return 429;
  if (message.includes('WALLET_INTENT_IDEMPOTENCY_CONFLICT')) return 409;
  if (message.includes('WALLET_INTENT_CANONICAL_USER_INVALID')) return 409;
  if (message.includes('WALLET_INTENT_')) return 400;
  return 503;
}

export function OPTIONS(request: Request) {
  return walletCorsPreflight(request, CORS_METHODS);
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return noStoreJson(request, { error: 'WALLET_INTENT_UNAVAILABLE' }, { status: 503 });
  }

  const auth = await createAuthenticatedRequestContext(request);
  if (!auth) {
    return noStoreJson(request, { error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (contentType !== 'application/json') {
    return noStoreJson(request, { error: 'WALLET_INTENT_CONTENT_TYPE_INVALID' }, { status: 415 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return noStoreJson(request, { error: 'WALLET_INTENT_BODY_TOO_LARGE' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStoreJson(request, { error: 'WALLET_INTENT_BODY_INVALID' }, { status: 400 });
  }

  const parsed = parseCreateIntentBody(body);
  if (!parsed) {
    return noStoreJson(request, { error: 'WALLET_INTENT_REQUEST_INVALID' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('create_wallet_intent_v1_server', {
    p_user_id: auth.user.id,
    p_idempotency_key: parsed.idempotencyKey,
    p_chain_id: POLYGON_CHAIN_ID,
    p_asset_symbol: parsed.assetSymbol,
    p_amount_base_units: parsed.amountBaseUnits,
    p_destination_address: parsed.destinationAddress,
  });

  if (error) {
    return noStoreJson(
      request,
      { error: error.message.includes('WALLET_INTENT_') ? error.message : 'WALLET_INTENT_CREATE_FAILED' },
      { status: rpcStatus(error.message) },
    );
  }

  if (!isRecord(data) || typeof data.replayed !== 'boolean' || !isRecord(data.intent)) {
    return noStoreJson(request, { error: 'WALLET_INTENT_RESPONSE_INVALID' }, { status: 503 });
  }

  return noStoreJson(
    request,
    data,
    { status: data.replayed ? 200 : 201 },
  );
}
