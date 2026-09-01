import 'server-only';

import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createAdminClient,
  createAuthenticatedRequestContext,
  isSupabaseConfigured,
} from '@/lib/supabase/server';
import { applyWalletCors, walletCorsPreflight } from '@/lib/wallet/cors';
import {
  PrivyIdentityTokenError,
  verifyPrivyIdentityToken,
} from '@/lib/wallet/privy-identity-token';

const MAX_REQUEST_BYTES = 4 * 1024;
const CORS_METHODS = ['POST', 'OPTIONS'] as const;
const LEGACY_CLAIM_VERSION = 'ctg-wallet-legacy-claim-v1' as const;
const requestSchema = z.object({}).strict();

type RateLimitRow = {
  allowed: boolean;
  remaining: number;
  retry_after_seconds: number;
};

function noStoreJson(request: Request, body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  return applyWalletCors(
    request,
    NextResponse.json(body, { ...init, headers }),
    CORS_METHODS,
  );
}

function privyErrorResponse(request: Request, error: PrivyIdentityTokenError) {
  if (error.code === 'PRIVY_IDENTITY_NOT_CONFIGURED') {
    return noStoreJson(request, { error: 'WALLET_IDENTITY_NOT_CONFIGURED' }, { status: 503 });
  }
  if (
    error.code === 'PRIVY_EMBEDDED_WALLET_AMBIGUOUS' ||
    error.code === 'LEGACY_WALLET_MISMATCH'
  ) {
    return noStoreJson(request, { error: error.code }, { status: 409 });
  }
  return noStoreJson(request, { error: error.code }, { status: 401 });
}

function buildLegacyEvidenceDigest(params: {
  canonicalUserId: string;
  privyUserId: string;
  embeddedEvmAddress: string;
}) {
  const payload = [
    LEGACY_CLAIM_VERSION,
    params.canonicalUserId,
    params.privyUserId,
    params.embeddedEvmAddress.toLowerCase(),
  ].join('\n');
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}

export function OPTIONS(request: Request) {
  return walletCorsPreflight(request, CORS_METHODS);
}

/**
 * One-time legacy claim boundary.
 *
 * The browser submits no wallet address, Privy principal or provenance data.
 * Both identities are proven by signed bearer material. After cryptographic
 * verification, a service-role-only RPC creates/reuses legacy evidence and
 * links the identity in one PostgreSQL transaction.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return noStoreJson(request, { error: 'WALLET_IDENTITY_NOT_CONFIGURED' }, { status: 503 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return noStoreJson(request, { error: 'REQUEST_TOO_LARGE' }, { status: 413 });
  }

  const auth = await createAuthenticatedRequestContext(request);
  if (!auth) {
    return noStoreJson(request, { error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, 'utf8') > MAX_REQUEST_BYTES) {
      return noStoreJson(request, { error: 'REQUEST_TOO_LARGE' }, { status: 413 });
    }
    requestSchema.parse(rawBody ? JSON.parse(rawBody) : {});
  } catch {
    return noStoreJson(request, { error: 'INVALID_REQUEST' }, { status: 400 });
  }

  const identityToken = request.headers.get('privy-id-token')?.trim();
  if (!identityToken) {
    return noStoreJson(request, { error: 'PRIVY_IDENTITY_TOKEN_REQUIRED' }, { status: 401 });
  }

  const { user } = auth;
  const serviceRole = createAdminClient();
  const { data: rateData, error: rateError } = await serviceRole.rpc(
    'consume_wallet_identity_link_rate_limit',
    { p_user_id: user.id },
  );
  if (rateError) {
    return noStoreJson(request, { error: 'RATE_LIMIT_UNAVAILABLE' }, { status: 503 });
  }

  const rateRow = (Array.isArray(rateData) ? rateData[0] : rateData) as RateLimitRow | null;
  if (!rateRow) {
    return noStoreJson(request, { error: 'RATE_LIMIT_UNAVAILABLE' }, { status: 503 });
  }
  if (rateRow.allowed !== true) {
    const retryAfterSeconds = Math.max(1, Number(rateRow.retry_after_seconds ?? 1));
    return noStoreJson(
      request,
      { error: 'RATE_LIMITED', retryAfterSeconds },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfterSeconds) },
      },
    );
  }

  let verifiedIdentity;
  try {
    verifiedIdentity = await verifyPrivyIdentityToken({
      token: identityToken,
      canonicalCtgUserId: user.id,
    });
  } catch (error) {
    if (error instanceof PrivyIdentityTokenError) {
      return privyErrorResponse(request, error);
    }
    return noStoreJson(request, { error: 'INVALID_PRIVY_IDENTITY_TOKEN' }, { status: 401 });
  }

  const address = verifiedIdentity.embeddedEvmAddress.toLowerCase();
  const sourceDigestSha256 = buildLegacyEvidenceDigest({
    canonicalUserId: user.id,
    privyUserId: verifiedIdentity.privyUserId,
    embeddedEvmAddress: address,
  });

  const { data: linkData, error: linkError } = await serviceRole.rpc(
    'bootstrap_verified_legacy_wallet_identity',
    {
      p_user_id: user.id,
      p_provider_user_id: verifiedIdentity.privyUserId,
      p_evm_address: address,
      p_source_digest_sha256: sourceDigestSha256,
    },
  );

  if (linkError) {
    const message = linkError.message ?? '';
    if (
      message.includes('LEGACY_WALLET_MISMATCH') ||
      message.includes('LEGACY_PROVIDER_IDENTITY_MISMATCH') ||
      message.includes('already linked') ||
      message.includes('already has a different active primary') ||
      message.includes('conflicts with verified Privy identity') ||
      message.includes('require operator review') ||
      message.includes('cannot change implicitly')
    ) {
      return noStoreJson(request, { error: 'WALLET_IDENTITY_CONFLICT' }, { status: 409 });
    }
    return noStoreJson(request, { error: 'WALLET_IDENTITY_LINK_FAILED' }, { status: 500 });
  }

  if (!linkData) {
    return noStoreJson(request, { error: 'WALLET_IDENTITY_LINK_FAILED' }, { status: 500 });
  }

  return noStoreJson(request, {
    ok: true,
    version: LEGACY_CLAIM_VERSION,
    legacyPreserved: true,
    sourceDigestSha256,
  });
}
