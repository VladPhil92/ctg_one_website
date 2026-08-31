import { NextResponse } from 'next/server';

import {
  createAdminClient,
  createAuthenticatedRequestContext,
  isSupabaseConfigured,
} from '@/lib/supabase/server';
import { probeRuntimeSchemaCompatibility } from '@/lib/observability/runtime-schema';
import { applyWalletCors, walletCorsPreflight } from '@/lib/wallet/cors';
import {
  WALLET_CANARY_PREFLIGHT_VERSION,
  probePolygonCanaryInfrastructureV1,
  WalletCanaryPreflightError,
} from '@/lib/wallet/canary-preflight';
import {
  inspectWalletCryptoSendExecutionConfiguration,
  WalletExecutionRolloutError,
} from '@/lib/wallet/execution-rollout';

const CORS_METHODS = ['POST', 'OPTIONS'] as const;
const MAX_BODY_BYTES = 256;
const EVM_ADDRESS_RE = /^0x[0-9a-f]{40}$/;
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

function parseBody(value: unknown) {
  if (!isRecord(value)) return false;
  if (Object.keys(value).some((key) => !ALLOWED_BODY_KEYS.has(key))) return false;
  return value.version === WALLET_CANARY_PREFLIGHT_VERSION;
}

export function OPTIONS(request: Request) {
  return walletCorsPreflight(request, CORS_METHODS);
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return noStoreJson(request, { error: 'WALLET_CANARY_PREFLIGHT_UNAVAILABLE' }, { status: 503 });
  }

  const auth = await createAuthenticatedRequestContext(request);
  if (!auth) {
    return noStoreJson(request, { error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (contentType !== 'application/json') {
    return noStoreJson(request, { error: 'WALLET_CANARY_PREFLIGHT_CONTENT_TYPE_INVALID' }, { status: 415 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return noStoreJson(request, { error: 'WALLET_CANARY_PREFLIGHT_BODY_TOO_LARGE' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStoreJson(request, { error: 'WALLET_CANARY_PREFLIGHT_BODY_INVALID' }, { status: 400 });
  }

  if (!parseBody(body)) {
    return noStoreJson(request, { error: 'WALLET_CANARY_PREFLIGHT_REQUEST_INVALID' }, { status: 400 });
  }

  let rollout: ReturnType<typeof inspectWalletCryptoSendExecutionConfiguration>;
  try {
    rollout = inspectWalletCryptoSendExecutionConfiguration(auth.user.id);
  } catch (error) {
    if (error instanceof WalletExecutionRolloutError) {
      return noStoreJson(request, { error: error.code }, { status: 503 });
    }
    return noStoreJson(request, { error: 'WALLET_CANARY_PREFLIGHT_ROLLOUT_FAILED' }, { status: 503 });
  }

  const schema = await probeRuntimeSchemaCompatibility();
  const admin = createAdminClient();
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
    return noStoreJson(request, { error: 'WALLET_CANARY_PREFLIGHT_SIGNER_LOOKUP_FAILED' }, { status: 503 });
  }

  let signerAddress: string | null = null;
  let identityVerified = false;
  if (accountRows?.length === 1) {
    const account = accountRows[0];
    const address = typeof account.address_normalized === 'string'
      ? account.address_normalized.toLowerCase()
      : null;
    const identityLinkId = typeof account.identity_link_id === 'string'
      ? account.identity_link_id
      : null;

    if (address && EVM_ADDRESS_RE.test(address) && identityLinkId) {
      const { data: identity, error: identityError } = await admin
        .from('wallet_identity_links')
        .select('id')
        .eq('id', identityLinkId)
        .eq('user_id', auth.user.id)
        .eq('provider', 'privy')
        .eq('status', 'verified')
        .maybeSingle();

      if (identityError) {
        return noStoreJson(request, { error: 'WALLET_CANARY_PREFLIGHT_IDENTITY_LOOKUP_FAILED' }, { status: 503 });
      }

      if (identity) {
        signerAddress = address;
        identityVerified = true;
      }
    }
  }

  let infrastructure: Awaited<ReturnType<typeof probePolygonCanaryInfrastructureV1>> | null = null;
  if (signerAddress && identityVerified) {
    try {
      infrastructure = await probePolygonCanaryInfrastructureV1(signerAddress);
    } catch (error) {
      if (error instanceof WalletCanaryPreflightError) {
        return noStoreJson(
          request,
          {
            version: WALLET_CANARY_PREFLIGHT_VERSION,
            status: 'blocked',
            readyForActivation: false,
            readyForCanaryExecution: false,
            executionMode: rollout.mode,
            checks: {
              schemaCompatible: schema.compatible,
              canaryUserConfigured: rollout.canaryUserConfigured,
              verifiedPrimaryPrivyWallet: identityVerified,
              polygonRpcHealthy: false,
              polygonChainId: null,
              nativeGasBalanceAvailable: false,
            },
            blocker: error.code,
            nextAction: 'RESOLVE_PREFLIGHT_BLOCKERS',
          },
          { status: 503 },
        );
      }
      return noStoreJson(request, { error: 'WALLET_CANARY_PREFLIGHT_RPC_PROBE_FAILED' }, { status: 503 });
    }
  }

  const schemaCompatible = schema.compatible;
  const verifiedPrimaryPrivyWallet = Boolean(signerAddress && identityVerified);
  const polygonRpcHealthy = Boolean(infrastructure);
  const nativeGasBalanceAvailable = infrastructure?.hasNativeGasBalance ?? false;
  const prerequisitesReady = schemaCompatible
    && rollout.canaryUserConfigured
    && verifiedPrimaryPrivyWallet
    && polygonRpcHealthy
    && nativeGasBalanceAvailable;

  const readyForActivation = prerequisitesReady && rollout.mode === 'disabled';
  const readyForCanaryExecution = prerequisitesReady && rollout.mode === 'canary';
  const status = readyForCanaryExecution
    ? 'ready_for_canary_execution'
    : readyForActivation
      ? 'ready_for_activation'
      : 'blocked';

  const blockers: string[] = [];
  if (!schemaCompatible) blockers.push('WALLET_CANARY_SCHEMA_INCOMPATIBLE');
  if (!rollout.canaryUserConfigured) blockers.push('WALLET_CANARY_USER_NOT_CONFIGURED');
  if (!verifiedPrimaryPrivyWallet) blockers.push('WALLET_CANARY_PRIVY_WALLET_UNAVAILABLE');
  if (verifiedPrimaryPrivyWallet && !polygonRpcHealthy) blockers.push('WALLET_CANARY_POLYGON_RPC_UNAVAILABLE');
  if (polygonRpcHealthy && !nativeGasBalanceAvailable) blockers.push('WALLET_CANARY_NATIVE_GAS_BALANCE_EMPTY');

  const nextAction = readyForCanaryExecution
    ? 'BUILD_REVIEWED_CANARY_ARTIFACT'
    : readyForActivation
      ? 'ACTIVATE_CANARY_MODE_AND_REDEPLOY'
      : 'RESOLVE_PREFLIGHT_BLOCKERS';

  return noStoreJson(request, {
    version: WALLET_CANARY_PREFLIGHT_VERSION,
    status,
    readyForActivation,
    readyForCanaryExecution,
    executionMode: rollout.mode,
    checks: {
      schemaCompatible,
      canaryUserConfigured: rollout.canaryUserConfigured,
      verifiedPrimaryPrivyWallet,
      polygonRpcHealthy,
      polygonChainId: infrastructure?.chainId ?? null,
      nativeGasBalanceAvailable,
      minConfirmations: infrastructure?.minConfirmations ?? null,
      observedBlockNumber: infrastructure?.observedBlockNumber ?? null,
    },
    blockers,
    nextAction,
  });
}
