import { NextResponse } from 'next/server';

import {
  createAdminClient,
  createAuthenticatedRequestContext,
  isSupabaseConfigured,
} from '@/lib/supabase/server';
import { applyWalletCors, walletCorsPreflight } from '@/lib/wallet/cors';
import {
  verifyTrustedWalletSubmissionV1,
  WALLET_SUBMISSION_VERSION,
  WalletTrustedSubmissionError,
} from '@/lib/wallet/trusted-submission';

const CORS_METHODS = ['POST', 'OPTIONS'] as const;
const MAX_BODY_BYTES = 512;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TX_HASH_RE = /^0x[0-9a-f]{64}$/;
const EVM_ADDRESS_RE = /^0x[0-9a-f]{40}$/;
const BASE_UNITS_RE = /^[1-9][0-9]*$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const SUPPORTED_ASSETS = new Set(['POL', 'CTG', 'USDC', 'USDT']);
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

function parseSubmissionBody(value: unknown) {
  if (!isRecord(value)) return null;
  if (Object.keys(value).some((key) => !ALLOWED_BODY_KEYS.has(key))) return null;
  if (value.version !== WALLET_SUBMISSION_VERSION) return null;
  const txHash = typeof value.txHash === 'string' ? value.txHash.trim().toLowerCase() : '';
  return TX_HASH_RE.test(txHash) ? txHash : null;
}

function submissionStatus(code: string) {
  if (code === 'WALLET_SUBMISSION_RATE_LIMITED') return 429;
  if (code === 'WALLET_SUBMISSION_INTENT_NOT_FOUND') return 404;
  if (code === 'WALLET_SUBMISSION_TX_NOT_PROPAGATED') return 409;
  if (
    code === 'WALLET_SUBMISSION_RPC_UNAVAILABLE'
    || code === 'WALLET_SUBMISSION_RPC_INVALID'
    || code === 'WALLET_SUBMISSION_RPC_INSECURE'
    || code === 'WALLET_SUBMISSION_RPC_FAILED'
    || code === 'WALLET_SUBMISSION_RPC_RESPONSE_INVALID'
    || code === 'WALLET_SUBMISSION_RPC_REJECTED'
    || code === 'WALLET_SUBMISSION_CHAIN_INVALID'
    || code === 'WALLET_SUBMISSION_CHAIN_MISMATCH'
    || code === 'WALLET_SUBMISSION_TX_RESPONSE_INVALID'
    || code === 'WALLET_SUBMISSION_TX_VALUE_INVALID'
  ) return 503;
  if (code.startsWith('WALLET_SUBMISSION_')) return 409;
  return 503;
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
  tx_hash: string | null;
  external_reference: string | null;
  settled_at: string | null;
  authorized_at: string;
  authorized_wallet_address: string;
  simulation_digest_sha256: string;
  submitted_at: string | null;
};

function normalizeIntentSnapshot(value: unknown): IntentSnapshot | null {
  if (!isRecord(value)) return null;
  const assetSymbol = typeof value.asset_symbol === 'string' ? value.asset_symbol : '';
  const amountBaseUnits = typeof value.amount_base_units === 'string' ? value.amount_base_units : '';
  const destinationAddress = typeof value.destination_address === 'string'
    ? value.destination_address.toLowerCase()
    : '';
  const authorizedWalletAddress = typeof value.authorized_wallet_address === 'string'
    ? value.authorized_wallet_address.toLowerCase()
    : '';
  const digest = typeof value.simulation_digest_sha256 === 'string'
    ? value.simulation_digest_sha256.toLowerCase()
    : '';

  if (
    typeof value.id !== 'string'
    || typeof value.user_id !== 'string'
    || (value.status !== 'authorized' && value.status !== 'submitted')
    || value.intent_type !== 'crypto_send'
    || value.rail !== 'polygon'
    || value.chain_id !== 137
    || !SUPPORTED_ASSETS.has(assetSymbol)
    || !BASE_UNITS_RE.test(amountBaseUnits)
    || !EVM_ADDRESS_RE.test(destinationAddress)
    || typeof value.authorized_at !== 'string'
    || !EVM_ADDRESS_RE.test(authorizedWalletAddress)
    || !SHA256_RE.test(digest)
  ) return null;

  const nullableString = (candidate: unknown) => typeof candidate === 'string' ? candidate : null;
  const txHash = nullableString(value.tx_hash)?.toLowerCase() ?? null;
  if (txHash !== null && !TX_HASH_RE.test(txHash)) return null;

  return {
    id: value.id,
    user_id: value.user_id,
    status: value.status,
    intent_type: value.intent_type,
    rail: value.rail,
    chain_id: value.chain_id,
    asset_symbol: assetSymbol,
    amount_base_units: amountBaseUnits,
    destination_address: destinationAddress,
    tx_hash: txHash,
    external_reference: nullableString(value.external_reference),
    settled_at: nullableString(value.settled_at),
    authorized_at: value.authorized_at,
    authorized_wallet_address: authorizedWalletAddress,
    simulation_digest_sha256: digest,
    submitted_at: nullableString(value.submitted_at),
  };
}

export function OPTIONS(request: Request) {
  return walletCorsPreflight(request, CORS_METHODS);
}

export async function POST(request: Request) {
  if (process.env.WALLET_INTENT_SUBMISSION_ENABLED !== 'true') {
    return noStoreJson(request, { error: 'WALLET_SUBMISSION_DISABLED' }, { status: 503 });
  }
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return noStoreJson(request, { error: 'WALLET_SUBMISSION_UNAVAILABLE' }, { status: 503 });
  }

  const auth = await createAuthenticatedRequestContext(request);
  if (!auth) return noStoreJson(request, { error: 'UNAUTHENTICATED' }, { status: 401 });

  const intentId = getIntentId(request);
  if (!intentId) return noStoreJson(request, { error: 'WALLET_SUBMISSION_INTENT_ID_INVALID' }, { status: 400 });

  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (contentType !== 'application/json') {
    return noStoreJson(request, { error: 'WALLET_SUBMISSION_CONTENT_TYPE_INVALID' }, { status: 415 });
  }
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return noStoreJson(request, { error: 'WALLET_SUBMISSION_BODY_TOO_LARGE' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStoreJson(request, { error: 'WALLET_SUBMISSION_BODY_INVALID' }, { status: 400 });
  }
  const txHash = parseSubmissionBody(body);
  if (!txHash) return noStoreJson(request, { error: 'WALLET_SUBMISSION_REQUEST_INVALID' }, { status: 400 });

  const admin = createAdminClient();
  const { data: rawIntent, error: intentError } = await admin
    .from('wallet_intents_v2')
    .select('id,user_id,status,intent_type,rail,chain_id,asset_symbol,amount_base_units,destination_address,tx_hash,external_reference,settled_at,authorized_at,authorized_wallet_address,simulation_digest_sha256,submitted_at')
    .eq('id', intentId)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (intentError) return noStoreJson(request, { error: 'WALLET_SUBMISSION_INTENT_READ_FAILED' }, { status: 503 });
  if (!rawIntent) return noStoreJson(request, { error: 'WALLET_SUBMISSION_INTENT_NOT_FOUND' }, { status: 404 });

  const intent = normalizeIntentSnapshot(rawIntent);
  if (!intent || intent.user_id !== auth.user.id) {
    return noStoreJson(request, { error: 'WALLET_SUBMISSION_INTENT_SHAPE_INVALID' }, { status: 409 });
  }
  if (intent.external_reference || intent.settled_at) {
    return noStoreJson(request, { error: 'WALLET_SUBMISSION_EXTERNAL_STATE_CONFLICT' }, { status: 409 });
  }

  let expectedWalletAddress = intent.authorized_wallet_address;

  if (intent.status === 'submitted') {
    if (intent.tx_hash !== txHash || !intent.submitted_at) {
      return noStoreJson(request, { error: 'WALLET_SUBMISSION_REPLAY_CONFLICT' }, { status: 409 });
    }
    // A durable submitted replay never depends on current RPC propagation or a
    // current account-link lookup. No new external action occurs.
  } else {
    const { data: accountRows, error: accountError } = await admin
      .from('wallet_external_accounts')
      .select('identity_link_id,address_normalized')
      .eq('user_id', auth.user.id)
      .eq('provider', 'privy')
      .eq('chain_family', 'evm')
      .eq('account_kind', 'embedded')
      .eq('status', 'verified')
      .eq('is_primary', true)
      .limit(2);

    if (accountError) return noStoreJson(request, { error: 'WALLET_SUBMISSION_SIGNER_LOOKUP_FAILED' }, { status: 503 });
    if (!accountRows || accountRows.length !== 1) {
      return noStoreJson(request, { error: 'WALLET_SUBMISSION_SIGNER_UNAVAILABLE' }, { status: 409 });
    }
    const account = accountRows[0];
    const address = typeof account.address_normalized === 'string' ? account.address_normalized.toLowerCase() : '';
    if (!EVM_ADDRESS_RE.test(address) || address !== intent.authorized_wallet_address) {
      return noStoreJson(request, { error: 'WALLET_SUBMISSION_SIGNER_BINDING_CONFLICT' }, { status: 409 });
    }

    const { data: identity, error: identityError } = await admin
      .from('wallet_identity_links')
      .select('id')
      .eq('id', account.identity_link_id)
      .eq('user_id', auth.user.id)
      .eq('provider', 'privy')
      .eq('status', 'verified')
      .maybeSingle();

    if (identityError) return noStoreJson(request, { error: 'WALLET_SUBMISSION_IDENTITY_LOOKUP_FAILED' }, { status: 503 });
    if (!identity) return noStoreJson(request, { error: 'WALLET_SUBMISSION_IDENTITY_UNVERIFIED' }, { status: 409 });
    expectedWalletAddress = address;

    try {
      await verifyTrustedWalletSubmissionV1({
        txHash,
        chainId: intent.chain_id,
        assetSymbol: intent.asset_symbol,
        amountBaseUnits: intent.amount_base_units,
        destinationAddress: intent.destination_address,
        fromAddress: expectedWalletAddress,
      });
    } catch (error) {
      if (error instanceof WalletTrustedSubmissionError) {
        return noStoreJson(request, { error: error.code }, { status: submissionStatus(error.code) });
      }
      return noStoreJson(request, { error: 'WALLET_SUBMISSION_VERIFICATION_FAILED' }, { status: 503 });
    }
  }

  const { data, error } = await admin.rpc('submit_wallet_intent_v1_server', {
    p_user_id: auth.user.id,
    p_intent_id: intent.id,
    p_tx_hash: txHash,
    p_expected_wallet_address: expectedWalletAddress,
    p_expected_chain_id: intent.chain_id,
    p_expected_asset_symbol: intent.asset_symbol,
    p_expected_amount_base_units: intent.amount_base_units,
    p_expected_destination_address: intent.destination_address,
  });

  if (error) {
    const code = error.message.includes('WALLET_SUBMISSION_') ? error.message : 'WALLET_SUBMISSION_FAILED';
    return noStoreJson(request, { error: code }, { status: submissionStatus(code) });
  }

  if (
    !isRecord(data)
    || data.version !== WALLET_SUBMISSION_VERSION
    || typeof data.replayed !== 'boolean'
    || typeof data.submittedAt !== 'string'
    || typeof data.submittedWalletAddress !== 'string'
    || data.submittedWalletAddress.toLowerCase() !== expectedWalletAddress
    || typeof data.txHash !== 'string'
    || data.txHash.toLowerCase() !== txHash
    || !isRecord(data.intent)
  ) {
    return noStoreJson(request, { error: 'WALLET_SUBMISSION_RESPONSE_INVALID' }, { status: 503 });
  }

  return noStoreJson(request, data, { status: 200 });
}
