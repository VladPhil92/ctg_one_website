import { NextResponse } from 'next/server';

import {
  createAdminClient,
  createAuthenticatedRequestContext,
  isSupabaseConfigured,
} from '@/lib/supabase/server';
import { applyWalletCors, walletCorsPreflight } from '@/lib/wallet/cors';
import {
  assertWalletCryptoSendCanaryIntentAllowed,
  assertWalletCryptoSendExecutionAllowed,
  WalletExecutionRolloutError,
} from '@/lib/wallet/execution-rollout';
import {
  simulateTrustedWalletIntentV1,
  WalletTrustedSimulationError,
} from '@/lib/wallet/trusted-simulation';

const CORS_METHODS = ['POST', 'OPTIONS'] as const;
const MAX_BODY_BYTES = 256;
const AUTHORIZATION_VERSION = 'ctg-wallet-authorization-v1' as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_RE = /^[0-9a-f]{64}$/;
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
  const match = /^\/api\/wallet\/intents\/([^/]+)\/authorize\/?$/.exec(pathname);
  const intentId = match?.[1] ?? '';
  return UUID_RE.test(intentId) ? intentId : null;
}

function executionRevalidationRequested(request: Request): boolean | null {
  const execution = new URL(request.url).searchParams.get('execution');
  if (execution === null) return false;
  return execution === 'canary' ? true : null;
}

function parseAuthorizationBody(value: unknown) {
  if (!isRecord(value)) return false;
  if (Object.keys(value).some((key) => !ALLOWED_BODY_KEYS.has(key))) return false;
  return value.version === AUTHORIZATION_VERSION;
}

function rpcStatus(message: string) {
  if (message.includes('WALLET_AUTH_RATE_LIMITED')) return 429;
  if (message.includes('WALLET_AUTH_INTENT_NOT_FOUND')) return 404;
  if (message.includes('WALLET_AUTH_CANARY_SINGLE_FLIGHT_CONFLICT')) return 409;
  if (message.includes('WALLET_AUTH_REPLAY_CONFLICT')) return 409;
  if (message.includes('WALLET_AUTH_SIMULATION_BINDING_CONFLICT')) return 409;
  if (message.includes('WALLET_AUTH_SIGNER_BINDING_CONFLICT')) return 409;
  if (message.includes('WALLET_AUTH_SIGNER_UNAVAILABLE')) return 409;
  if (message.includes('WALLET_AUTH_IDENTITY_UNVERIFIED')) return 409;
  if (message.includes('WALLET_AUTH_INTENT_EXPIRED')) return 409;
  if (message.includes('WALLET_AUTH_STATUS_INVALID')) return 409;
  if (message.includes('WALLET_AUTH_EXTERNAL_STATE_PRESENT')) return 409;
  if (message.includes('WALLET_AUTH_')) return 400;
  return 503;
}

function rolloutStatus(code: string) {
  return code === 'WALLET_EXECUTION_CONFIG_INVALID'
    || code === 'WALLET_EXECUTION_CANARY_GUARDRAILS_NOT_CONFIGURED'
    ? 503
    : 403;
}

function simulationStatus(code: string) {
  if (
    code === 'WALLET_AUTH_TRUSTED_NATIVE_BALANCE_INSUFFICIENT'
    || code === 'WALLET_AUTH_TRUSTED_TOKEN_CALL_REJECTED'
  ) return 409;
  if (
    code === 'WALLET_AUTH_TRUSTED_RPC_UNAVAILABLE'
    || code === 'WALLET_AUTH_TRUSTED_RPC_INVALID'
    || code === 'WALLET_AUTH_TRUSTED_RPC_INSECURE'
    || code === 'WALLET_AUTH_TRUSTED_RPC_FAILED'
    || code === 'WALLET_AUTH_TRUSTED_RPC_RESPONSE_INVALID'
    || code === 'WALLET_AUTH_TRUSTED_RPC_REJECTED'
    || code === 'WALLET_AUTH_TRUSTED_CHAIN_INVALID'
    || code === 'WALLET_AUTH_TRUSTED_CHAIN_MISMATCH'
    || code === 'WALLET_AUTH_TRUSTED_GAS_INVALID'
    || code === 'WALLET_AUTH_TRUSTED_BALANCE_INVALID'
    || code === 'WALLET_AUTH_TRUSTED_BLOCK_INVALID'
    || code === 'WALLET_AUTH_TRUSTED_GAS_PRICE_INVALID'
    || code === 'WALLET_AUTH_TRUSTED_SIMULATION_INVALID'
  ) return 503;
  return 400;
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
  authorized_at: string | null;
  authorized_wallet_address: string | null;
  simulation_digest_sha256: string | null;
};

function normalizeIntentSnapshot(value: unknown): IntentSnapshot | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string'
    || typeof value.user_id !== 'string'
    || typeof value.status !== 'string'
    || typeof value.intent_type !== 'string'
  ) return null;

  const rail = typeof value.rail === 'string' ? value.rail : null;
  const chainId = typeof value.chain_id === 'number' ? value.chain_id : null;
  const assetSymbol = typeof value.asset_symbol === 'string' ? value.asset_symbol : null;
  const amountBaseUnits = typeof value.amount_base_units === 'string' ? value.amount_base_units : null;
  const destinationAddress = typeof value.destination_address === 'string'
    ? value.destination_address.toLowerCase()
    : null;

  if (
    value.intent_type !== 'crypto_send'
    || rail !== 'polygon'
    || chainId !== 137
    || !assetSymbol
    || !SUPPORTED_ASSETS.has(assetSymbol)
    || !amountBaseUnits
    || !BASE_UNITS_RE.test(amountBaseUnits)
    || !destinationAddress
    || !EVM_ADDRESS_RE.test(destinationAddress)
  ) return null;

  const nullableString = (candidate: unknown) => typeof candidate === 'string' ? candidate : null;

  return {
    id: value.id,
    user_id: value.user_id,
    status: value.status,
    intent_type: value.intent_type,
    rail,
    chain_id: chainId,
    asset_symbol: assetSymbol,
    amount_base_units: amountBaseUnits,
    destination_address: destinationAddress,
    tx_hash: nullableString(value.tx_hash),
    external_reference: nullableString(value.external_reference),
    settled_at: nullableString(value.settled_at),
    authorized_at: nullableString(value.authorized_at),
    authorized_wallet_address: nullableString(value.authorized_wallet_address)?.toLowerCase() ?? null,
    simulation_digest_sha256: nullableString(value.simulation_digest_sha256)?.toLowerCase() ?? null,
  };
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

  const executionRevalidation = executionRevalidationRequested(request);
  if (executionRevalidation === null) {
    return noStoreJson(request, { error: 'WALLET_EXECUTION_QUERY_INVALID' }, { status: 400 });
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

  if (!parseAuthorizationBody(body)) {
    return noStoreJson(request, { error: 'WALLET_AUTH_REQUEST_INVALID' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: rawIntent, error: intentError } = await admin
    .from('wallet_intents_v2')
    .select('id,user_id,status,intent_type,rail,chain_id,asset_symbol,amount_base_units,destination_address,tx_hash,external_reference,settled_at,authorized_at,authorized_wallet_address,simulation_digest_sha256')
    .eq('id', intentId)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (intentError) {
    return noStoreJson(request, { error: 'WALLET_AUTH_INTENT_READ_FAILED' }, { status: 503 });
  }
  if (!rawIntent) {
    return noStoreJson(request, { error: 'WALLET_AUTH_INTENT_NOT_FOUND' }, { status: 404 });
  }

  const intent = normalizeIntentSnapshot(rawIntent);
  if (!intent || intent.user_id !== auth.user.id) {
    return noStoreJson(request, { error: 'WALLET_AUTH_INTENT_SHAPE_INVALID' }, { status: 409 });
  }
  if (intent.tx_hash || intent.external_reference || intent.settled_at) {
    return noStoreJson(request, { error: 'WALLET_AUTH_EXTERNAL_STATE_PRESENT' }, { status: 409 });
  }

  // A first created -> authorized transition is execution-enabling evidence and
  // therefore can never be created outside the current server-side canary gate.
  // Durable authorized replays remain available without creating new evidence;
  // when the caller explicitly requests pre-broadcast revalidation, both the
  // kill-switch and the exact asset/amount/destination exposure guard are
  // checked again immediately before the signer boundary.
  if (intent.status === 'created' || executionRevalidation) {
    try {
      assertWalletCryptoSendExecutionAllowed(auth.user.id);
      assertWalletCryptoSendCanaryIntentAllowed({
        assetSymbol: intent.asset_symbol,
        amountBaseUnits: intent.amount_base_units,
        destinationAddress: intent.destination_address,
      });
    } catch (error) {
      if (error instanceof WalletExecutionRolloutError) {
        return noStoreJson(request, { error: error.code }, { status: rolloutStatus(error.code) });
      }
      return noStoreJson(request, { error: 'WALLET_EXECUTION_GATE_FAILED' }, { status: 503 });
    }
  }

  let simulationDigestSha256: string;
  let expectedWalletAddress: string;

  if (intent.status === 'authorized') {
    if (
      !intent.authorized_at
      || !intent.authorized_wallet_address
      || !EVM_ADDRESS_RE.test(intent.authorized_wallet_address)
      || !intent.simulation_digest_sha256
      || !SHA256_RE.test(intent.simulation_digest_sha256)
    ) {
      return noStoreJson(request, { error: 'WALLET_AUTH_REPLAY_EVIDENCE_INVALID' }, { status: 409 });
    }

    // Durable replay uses only the evidence that was already committed by a
    // successful trusted simulation. It does not require a fresh RPC call or a
    // still-unexpired creation TTL because no new authorization occurs.
    simulationDigestSha256 = intent.simulation_digest_sha256;
    expectedWalletAddress = intent.authorized_wallet_address;
  } else if (intent.status === 'created') {
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

    if (accountError) {
      return noStoreJson(request, { error: 'WALLET_AUTH_SIGNER_LOOKUP_FAILED' }, { status: 503 });
    }
    if (!accountRows || accountRows.length !== 1) {
      return noStoreJson(request, { error: 'WALLET_AUTH_SIGNER_UNAVAILABLE' }, { status: 409 });
    }

    const account = accountRows[0];
    if (
      typeof account.identity_link_id !== 'string'
      || typeof account.address_normalized !== 'string'
      || !EVM_ADDRESS_RE.test(account.address_normalized.toLowerCase())
    ) {
      return noStoreJson(request, { error: 'WALLET_AUTH_SIGNER_INVALID' }, { status: 409 });
    }

    const { data: identity, error: identityError } = await admin
      .from('wallet_identity_links')
      .select('id')
      .eq('id', account.identity_link_id)
      .eq('user_id', auth.user.id)
      .eq('provider', 'privy')
      .eq('status', 'verified')
      .maybeSingle();

    if (identityError) {
      return noStoreJson(request, { error: 'WALLET_AUTH_IDENTITY_LOOKUP_FAILED' }, { status: 503 });
    }
    if (!identity) {
      return noStoreJson(request, { error: 'WALLET_AUTH_IDENTITY_UNVERIFIED' }, { status: 409 });
    }

    expectedWalletAddress = account.address_normalized.toLowerCase();

    try {
      const trustedSimulation = await simulateTrustedWalletIntentV1({
        intentId: intent.id,
        canonicalUserId: intent.user_id,
        chainId: intent.chain_id,
        assetSymbol: intent.asset_symbol,
        amountBaseUnits: intent.amount_base_units,
        destinationAddress: intent.destination_address,
        fromAddress: expectedWalletAddress,
      });
      simulationDigestSha256 = trustedSimulation.simulationDigestSha256;
    } catch (error) {
      if (error instanceof WalletTrustedSimulationError) {
        return noStoreJson(request, { error: error.code }, { status: simulationStatus(error.code) });
      }
      return noStoreJson(request, { error: 'WALLET_AUTH_TRUSTED_SIMULATION_FAILED' }, { status: 503 });
    }
  } else {
    return noStoreJson(request, { error: 'WALLET_AUTH_STATUS_INVALID' }, { status: 409 });
  }

  const { data, error } = await admin.rpc('authorize_wallet_intent_v2_server', {
    p_user_id: auth.user.id,
    p_intent_id: intent.id,
    p_simulation_digest_sha256: simulationDigestSha256,
    p_expected_wallet_address: expectedWalletAddress,
    p_expected_chain_id: intent.chain_id,
    p_expected_asset_symbol: intent.asset_symbol,
    p_expected_amount_base_units: intent.amount_base_units,
    p_expected_destination_address: intent.destination_address,
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
    || data.authorizedWalletAddress.toLowerCase() !== expectedWalletAddress
    || data.simulationDigestSha256.toLowerCase() !== simulationDigestSha256
    || !isRecord(data.intent)
  ) {
    return noStoreJson(request, { error: 'WALLET_AUTH_RESPONSE_INVALID' }, { status: 503 });
  }

  return noStoreJson(request, data, { status: 200 });
}
