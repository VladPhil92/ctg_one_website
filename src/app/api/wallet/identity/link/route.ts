import { NextResponse } from 'next/server';
import { z } from 'zod';

import { consumeAuthenticatedRateLimit } from '@/lib/security/api-rate-limit';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import {
  PrivyIdentityTokenError,
  verifyPrivyIdentityToken,
} from '@/lib/wallet/privy-identity-token';

const MAX_REQUEST_BYTES = 4 * 1024;

const requestSchema = z.object({
  linkMode: z.enum(['new', 'legacy_preserve']),
  expectedLegacyWalletAddress: z.string().trim().regex(/^0x[0-9a-fA-F]{40}$/).nullable().optional(),
}).strict().superRefine((value, context) => {
  if (value.linkMode === 'legacy_preserve' && !value.expectedLegacyWalletAddress) {
    context.addIssue({
      code: 'custom',
      path: ['expectedLegacyWalletAddress'],
      message: 'legacy_preserve requires the expected legacy wallet address',
    });
  }
  if (value.linkMode === 'new' && value.expectedLegacyWalletAddress) {
    context.addIssue({
      code: 'custom',
      path: ['expectedLegacyWalletAddress'],
      message: 'new links must not supply a legacy wallet address',
    });
  }
});

function noStoreJson(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  return NextResponse.json(body, { ...init, headers });
}

function privyErrorResponse(error: PrivyIdentityTokenError) {
  if (error.code === 'PRIVY_IDENTITY_NOT_CONFIGURED') {
    return noStoreJson(
      { error: 'WALLET_IDENTITY_NOT_CONFIGURED' },
      { status: 503 },
    );
  }

  if (
    error.code === 'LEGACY_WALLET_MISMATCH' ||
    error.code === 'PRIVY_EMBEDDED_WALLET_AMBIGUOUS'
  ) {
    return noStoreJson(
      { error: error.code },
      { status: 409 },
    );
  }

  return noStoreJson(
    { error: error.code },
    { status: 401 },
  );
}

export async function POST(request: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return noStoreJson({ error: 'WALLET_IDENTITY_NOT_CONFIGURED' }, { status: 503 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return noStoreJson({ error: 'REQUEST_TOO_LARGE' }, { status: 413 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return noStoreJson({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  let decision;
  try {
    decision = await consumeAuthenticatedRateLimit(supabase, 'wallet.identity-link');
  } catch {
    return noStoreJson({ error: 'RATE_LIMIT_UNAVAILABLE' }, { status: 503 });
  }

  if (!decision.allowed) {
    return noStoreJson(
      { error: 'RATE_LIMITED', retryAfterSeconds: decision.retryAfterSeconds },
      {
        status: 429,
        headers: { 'Retry-After': String(decision.retryAfterSeconds) },
      },
    );
  }

  const identityToken = request.headers.get('privy-id-token')?.trim();
  if (!identityToken) {
    return noStoreJson({ error: 'PRIVY_IDENTITY_TOKEN_REQUIRED' }, { status: 401 });
  }

  let body: z.infer<typeof requestSchema>;
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, 'utf8') > MAX_REQUEST_BYTES) {
      return noStoreJson({ error: 'REQUEST_TOO_LARGE' }, { status: 413 });
    }
    body = requestSchema.parse(JSON.parse(rawBody));
  } catch {
    return noStoreJson({ error: 'INVALID_REQUEST' }, { status: 400 });
  }

  let verifiedIdentity;
  try {
    verifiedIdentity = verifyPrivyIdentityToken({
      token: identityToken,
      canonicalCtgUserId: user.id,
      expectedLegacyAddress: body.expectedLegacyWalletAddress ?? null,
    });
  } catch (error) {
    if (error instanceof PrivyIdentityTokenError) return privyErrorResponse(error);
    return noStoreJson({ error: 'INVALID_PRIVY_IDENTITY_TOKEN' }, { status: 401 });
  }

  const serviceRole = createAdminClient();
  const { data, error } = await serviceRole.rpc('link_verified_wallet_identity', {
    p_user_id: user.id,
    p_provider_user_id: verifiedIdentity.privyUserId,
    p_evm_address: verifiedIdentity.embeddedEvmAddress,
    p_link_mode: body.linkMode,
    p_expected_legacy_address: body.expectedLegacyWalletAddress ?? null,
  });

  if (error) {
    const message = error.message ?? '';
    if (
      message.includes('LEGACY_WALLET_MISMATCH') ||
      message.includes('already linked') ||
      message.includes('already has a different active primary') ||
      message.includes('conflicts with verified Privy identity') ||
      message.includes('require operator review') ||
      message.includes('cannot change implicitly')
    ) {
      return noStoreJson({ error: 'WALLET_IDENTITY_CONFLICT' }, { status: 409 });
    }
    return noStoreJson({ error: 'WALLET_IDENTITY_LINK_FAILED' }, { status: 500 });
  }

  return noStoreJson({
    ok: true,
    identity: data,
  });
}
