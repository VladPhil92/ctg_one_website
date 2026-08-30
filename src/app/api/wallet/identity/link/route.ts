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

const requestSchema = z.object({
  linkMode: z.enum(['new', 'legacy_preserve']),
}).strict();

type LegacyMigrationEvidence = {
  provider_user_id: string;
  expected_address_normalized: string;
  status: 'pending' | 'consumed' | 'rejected';
};

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
    return noStoreJson(
      request,
      { error: 'WALLET_IDENTITY_NOT_CONFIGURED' },
      { status: 503 },
    );
  }

  if (
    error.code === 'LEGACY_WALLET_MISMATCH' ||
    error.code === 'PRIVY_EMBEDDED_WALLET_AMBIGUOUS'
  ) {
    return noStoreJson(
      request,
      { error: error.code },
      { status: 409 },
    );
  }

  return noStoreJson(
    request,
    { error: error.code },
    { status: 401 },
  );
}

export function OPTIONS(request: Request) {
  return walletCorsPreflight(request, CORS_METHODS);
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return noStoreJson(
      request,
      { error: 'WALLET_IDENTITY_NOT_CONFIGURED' },
      { status: 503 },
    );
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return noStoreJson(request, { error: 'REQUEST_TOO_LARGE' }, { status: 413 });
  }

  const auth = await createAuthenticatedRequestContext(request);
  if (!auth) {
    return noStoreJson(request, { error: 'UNAUTHENTICATED' }, { status: 401 });
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

  const identityToken = request.headers.get('privy-id-token')?.trim();
  if (!identityToken) {
    return noStoreJson(request, { error: 'PRIVY_IDENTITY_TOKEN_REQUIRED' }, { status: 401 });
  }

  let body: z.infer<typeof requestSchema>;
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, 'utf8') > MAX_REQUEST_BYTES) {
      return noStoreJson(request, { error: 'REQUEST_TOO_LARGE' }, { status: 413 });
    }
    body = requestSchema.parse(JSON.parse(rawBody));
  } catch {
    return noStoreJson(request, { error: 'INVALID_REQUEST' }, { status: 400 });
  }

  let legacyEvidence: LegacyMigrationEvidence | null = null;
  if (body.linkMode === 'legacy_preserve') {
    const { data, error } = await serviceRole
      .from('wallet_legacy_migration_evidence')
      .select('provider_user_id,expected_address_normalized,status')
      .eq('user_id', user.id)
      .eq('provider', 'privy')
      .maybeSingle();

    if (error) {
      return noStoreJson(
        request,
        { error: 'LEGACY_MIGRATION_EVIDENCE_UNAVAILABLE' },
        { status: 503 },
      );
    }

    legacyEvidence = data as LegacyMigrationEvidence | null;
    if (!legacyEvidence || legacyEvidence.status === 'rejected') {
      return noStoreJson(
        request,
        { error: 'LEGACY_MIGRATION_EVIDENCE_REQUIRED' },
        { status: 409 },
      );
    }
  }

  let verifiedIdentity;
  try {
    verifiedIdentity = verifyPrivyIdentityToken({
      token: identityToken,
      canonicalCtgUserId: user.id,
      expectedLegacyAddress: legacyEvidence?.expected_address_normalized ?? null,
    });
  } catch (error) {
    if (error instanceof PrivyIdentityTokenError) {
      return privyErrorResponse(request, error);
    }
    return noStoreJson(request, { error: 'INVALID_PRIVY_IDENTITY_TOKEN' }, { status: 401 });
  }

  if (
    legacyEvidence &&
    legacyEvidence.provider_user_id !== verifiedIdentity.privyUserId
  ) {
    return noStoreJson(
      request,
      { error: 'LEGACY_PROVIDER_IDENTITY_MISMATCH' },
      { status: 409 },
    );
  }

  const { data, error } = await serviceRole.rpc('link_verified_wallet_identity', {
    p_user_id: user.id,
    p_provider_user_id: verifiedIdentity.privyUserId,
    p_evm_address: verifiedIdentity.embeddedEvmAddress,
    p_link_mode: body.linkMode,
  });

  if (error) {
    const message = error.message ?? '';
    if (
      message.includes('LEGACY_WALLET_MISMATCH') ||
      message.includes('LEGACY_PROVIDER_IDENTITY_MISMATCH') ||
      message.includes('LEGACY_MIGRATION_EVIDENCE_REQUIRED') ||
      message.includes('LEGACY_MIGRATION_REQUIRED') ||
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

  return noStoreJson(request, {
    ok: true,
    identity: data,
  });
}
