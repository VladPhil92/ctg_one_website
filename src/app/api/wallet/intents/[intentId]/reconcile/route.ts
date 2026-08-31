import { NextResponse } from 'next/server';

import {
  createAdminClient,
  createAuthenticatedRequestContext,
  isSupabaseConfigured,
} from '@/lib/supabase/server';
import { applyWalletCors, walletCorsPreflight } from '@/lib/wallet/cors';
import {
  inspectPolygonWalletIntentV1,
  WALLET_CHAIN_RECONCILIATION_VERSION,
  WalletChainReconciliationError,
} from '@/lib/wallet/chain-reconciliation';

const CORS_METHODS = ['POST', 'OPTIONS'] as const;
const MAX_BODY_BYTES = 256;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TX_HASH_RE = /^0x[0-9a-f]{64}$/;
const EVM_ADDRESS_RE = /^0x[0-9a-f]{40}$/;
const BASE_UNITS_RE = /^[1-9][0-9]*$/;
const SUPPORTED_ASSETS = new Set(['POL', 'CTG', 'USDC', 'USDT']);
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

type IntentSnapshot = {
  id: string;
  user_id: string;
  status: string;
  intent_type: string;
  rail: string;
  chain_id: number;
  asset_symbol: string;
  amount_base_units: string;
  destination_address: string;
  tx_hash: string;
  submitted_at: string;
  authorized_wallet_address: string;
};

function normalizeIntent(value: unknown): IntentSnapshot | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string'
    || typeof value.user_id !== 'string'
    || typeof value.status !== 'string'
    || value.intent_type !== 'crypto_send'
    || value.rail !== 'polygon'
    || value.chain_id !== 137
    || typeof value.asset_symbol !== 'string'
    || !SUPPORTED_ASSETS.has(value.asset_symbol)
    || typeof value.amount_base_units !== 'string'
    || !BASE_UNITS_RE.test(value.amount_base_units)
    || value.amount_base_units.length > 78
    || typeof value.destination_address !== 'string'
    || typeof value.tx_hash !== 'string'
    || typeof value.submitted_at !== 'string'
    || typeof value.authorized_wallet_address !== 'string'
  ) return null;

  const destinationAddress = value.destination_address.toLowerCase();
  const txHash = value.tx_hash.toLowerCase();
  const authorizedWalletAddress = value.authorized_wallet_address.toLowerCase();
  if (
    !EVM_ADDRESS_RE.test(destinationAddress)
    || !TX_HASH_RE.test(txHash)
    || !EVM_ADDRESS_RE.test(authorizedWalletAddress)
  ) return null;

  return {
    id: value.id,
    user_id: value.user_id,
    status: value.status,
    intent_type: 'crypto_send',
    rail: 'polygon',
    chain_id: 137,
    asset_symbol: value.asset_symbol,
    amount_base_units: value.amount_base_units,
    destination_address: destinationAddress,
    tx_hash: txHash,
    submitted_at: value.submitted_at,
    authorized_wallet_address: authorizedWalletAddress,
  };
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
    .select('id,user_id,status,intent_type,rail,chain_id,asset_symbol,amount_base_units,destination_address,tx_hash,submitted_at,authorized_wallet_address')
    .eq('id', intentId)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (intentError) {
    return noStoreJson(request, { error: 'WALLET_CHAIN_INTENT_READ_FAILED' }, { status: 503 });
  }
  if (!rawIntent) return noStoreJson(request, { error: 'WALLET_CHAIN_INTENT_NOT_FOUND' }, { status: 404 });

  const intent = normalizeIntent(rawIntent);
  if (!intent || intent.user_id !== auth.user.id) {
    return noStoreJson(request, { error: 'WALLET_CHAIN_INTENT_SHAPE_INVALID' }, { status: 409 });
  }

  let observation;
  try {
    observation = await inspectPolygonWalletIntentV1({
      intentId: intent.id,
      canonicalUserId: intent.user_id,
      txHash: intent.tx_hash,
      chainId: intent.chain_id,
      assetSymbol: intent.asset_symbol,
      amountBaseUnits: intent.amount_base_units,
      destinationAddress: intent.destination_address,
      authorizedWalletAddress: intent.authorized_wallet_address,
    });
  } catch (error) {
    if (error instanceof WalletChainReconciliationError) {
      return noStoreJson(request, { error: error.code }, { status: adapterStatus(error.code) });
    }
    return noStoreJson(request, { error: 'WALLET_CHAIN_RECONCILIATION_ADAPTER_FAILED' }, { status: 503 });
  }

  const { data, error } = await admin.rpc('record_wallet_chain_reconciliation_v1_server', {
    p_user_id: auth.user.id,
    p_intent_id: intent.id,
    p_tx_hash: intent.tx_hash,
    p_observation_status: observation.status,
    p_evidence_digest_sha256: observation.evidenceDigestSha256,
    p_chain_observed: observation.chainObserved,
    p_block_number: observation.blockNumber,
    p_confirmations: observation.confirmations,
    p_failure_code: observation.failureCode,
  });

  if (error) {
    return noStoreJson(
      request,
      { error: error.message.includes('WALLET_CHAIN_') ? error.message : 'WALLET_CHAIN_RECONCILIATION_FAILED' },
      { status: rpcStatus(error.message) },
    );
  }

  if (
    !isRecord(data)
    || data.version !== WALLET_CHAIN_RECONCILIATION_VERSION
    || data.intentId !== intent.id
    || data.txHash !== intent.tx_hash
    || typeof data.status !== 'string'
    || typeof data.replayed !== 'boolean'
  ) {
    return noStoreJson(request, { error: 'WALLET_CHAIN_RECONCILIATION_RESPONSE_INVALID' }, { status: 503 });
  }

  return noStoreJson(request, {
    ...data,
    observation: {
      status: observation.status,
      blockNumber: observation.blockNumber,
      confirmations: observation.confirmations,
      failureCode: observation.failureCode,
      evidenceDigestSha256: observation.evidenceDigestSha256,
    },
  });
}
