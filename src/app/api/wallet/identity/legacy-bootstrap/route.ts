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

type LegacyEvidenceRow = {
  id: string;
  user_id: string;
  provider_user_id: string;
  expected_address_normalized: string;
  source_digest_sha256: string;
  status: 'pending' | 'consumed' | 'rejected';
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

async function readLegacyEvidence(
  serviceRole: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<LegacyEvidenceRow | null> {
  const { data, error } = await serviceRole
    .from('wallet_legacy_migration_evidence')
    .select('id,user_id,provider_user_id,expected_address_normalized,source_digest_sha256,status')
    .eq('user_id', userId)
    .eq('provider', 'privy')
    .maybeSingle();

  if (error) throw new Error('LEGACY_MIGRATION_EVIDENCE_UNAVAILABLE');
  return data as LegacyEvidenceRow | null;
}

export function OPTIONS(request: Request) {
  return walletCorsPreflight(request, CORS_METHODS);
}

/**
 * One-time legacy claim boundary.
 *
 * The browser submits no wallet address, Privy principal or provenance data.
 * Both identities are proven by signed bearer material: the canonical CTG One
 * access token and the Privy identity token. The server derives the historical
 * embedded wallet from the verified Privy token, records deterministic evidence,
 * then delegates the actual link to the existing transactional RPC.
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

  let body: z.infer<typeof requestSchema>;
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, 'utf8') > MAX_REQUEST_BYTES) {
      return noStoreJson(request, { error: 'REQUEST_TOO_LARGE' }, { status: 413 });
    }
    body = requestSchema.parse(rawBody ? JSON.parse(rawBody) : {});
  } catch {
    return noStoreJson(request, { error: 'INVALID_REQUEST' }, { status: 400 });
  }
  void body;

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
    verifiedIdentity = verifyPrivyIdentityToken({
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

  let existing: LegacyEvidenceRow | null;
  try {
    existing = await readLegacyEvidence(serviceRole, user.id);
  } catch {
    return noStoreJson(
      request,
      { error: 'LEGACY_MIGRATION_EVIDENCE_UNAVAILABLE' },
      { status: 503 },
    );
  }

  if (existing) {
    if (existing.status === 'rejected') {
      return noStoreJson(request, { error: 'LEGACY_MIGRATION_REJECTED' }, { status: 409 });
    }
    if (
      existing.provider_user_id !== verifiedIdentity.privyUserId ||
      existing.expected_address_normalized !== address ||
      existing.source_digest_sha256 !== sourceDigestSha256
    ) {
      return noStoreJson(request, { error: 'LEGACY_MIGRATION_EVIDENCE_CONFLICT' }, { status: 409 });
    }
  } else {
    const now = new Date().toISOString();
    const { error: insertError } = await serviceRole
      .from('wallet_legacy_migration_evidence')
      .insert({
        user_id: user.id,
        provider: 'privy',
        provider_user_id: verifiedIdentity.privyUserId,
        chain_family: 'evm',
        expected_address: address,
        source_digest_sha256: sourceDigestSha256,
        evidence_captured_at: now,
        status: 'pending',
      });

    if (insertError) {
      // A concurrent identical request may win one of the uniqueness constraints.
      // Re-read and accept only an exact server-derived match; all other races fail closed.
      try {
        existing = await readLegacyEvidence(serviceRole, user.id);
      } catch {
        return noStoreJson(
          request,
          { error: 'LEGACY_MIGRATION_EVIDENCE_UNAVAILABLE' },
          { status: 503 },
        );
      }
      if (
        !existing ||
        existing.status === 'rejected' ||
        existing.provider_user_id !== verifiedIdentity.privyUserId ||
        existing.expected_address_normalized !== address ||
        existing.source_digest_sha256 !== sourceDigestSha256
      ) {
        return noStoreJson(request, { error: 'LEGACY_MIGRATION_EVIDENCE_CONFLICT' }, { status: 409 });
      }
    }
  }

  const { data: linkData, error: linkError } = await serviceRole.rpc(
    'link_verified_wallet_identity',
    {
      p_user_id: user.id,
      p_provider_user_id: verifiedIdentity.privyUserId,
      p_evm_address: address,
      p_link_mode: 'legacy_preserve',
    },
  );

  if (linkError) {
    const message = linkError.message ?? '';
    if (
      message.includes('LEGACY_WALLET_MISMATCH') ||
      message.includes('LEGACY_PROVIDER_IDENTITY_MISMATCH') ||
      message.includes('LEGACY_MIGRATION_EVIDENCE_REQUIRED') ||
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
