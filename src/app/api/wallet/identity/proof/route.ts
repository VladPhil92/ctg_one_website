import { createHash } from 'node:crypto';

import { NextResponse } from 'next/server';

import {
  createAdminClient,
  createAuthenticatedRequestContext,
  isSupabaseConfigured,
} from '@/lib/supabase/server';
import { applyWalletCors, walletCorsPreflight } from '@/lib/wallet/cors';

const CORS_METHODS = ['GET', 'OPTIONS'] as const;
const PROOF_VERSION = 'ctg-wallet-identity-proof-v1' as const;

type IdentityLinkRow = {
  id: string;
  user_id: string;
  provider: 'privy';
  provider_user_id: string;
  status: 'pending' | 'verified' | 'revoked';
  link_mode: 'new' | 'legacy_preserve';
  verified_at: string | null;
};

type ExternalAccountRow = {
  id: string;
  user_id: string;
  identity_link_id: string | null;
  provider: 'privy' | 'external';
  chain_family: 'evm' | 'bitcoin';
  account_kind: 'embedded' | 'external' | 'watch_only';
  address_normalized: string;
  status: 'pending' | 'verified' | 'revoked';
  is_primary: boolean;
  legacy_preserved: boolean;
  verified_at: string | null;
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

function buildPrincipalBindingDigest(params: {
  canonicalUserId: string;
  providerUserId: string;
  walletAddress: string;
  linkMode: 'new' | 'legacy_preserve';
  verifiedAt: string;
}) {
  return createHash('sha256')
    .update(
      [
        PROOF_VERSION,
        params.canonicalUserId,
        params.providerUserId,
        params.walletAddress,
        params.linkMode,
        params.verifiedAt,
      ].join('\0'),
      'utf8',
    )
    .digest('hex');
}

export function OPTIONS(request: Request) {
  return walletCorsPreflight(request, CORS_METHODS);
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return noStoreJson(request, { error: 'WALLET_IDENTITY_PROOF_UNAVAILABLE' }, { status: 503 });
  }

  const auth = await createAuthenticatedRequestContext(request);
  if (!auth) {
    return noStoreJson(request, { error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const { user } = auth;
  const serviceRole = createAdminClient();
  const [identityResult, accountsResult] = await Promise.all([
    serviceRole
      .from('wallet_identity_links')
      .select('id,user_id,provider,provider_user_id,status,link_mode,verified_at')
      .eq('user_id', user.id)
      .eq('provider', 'privy')
      .maybeSingle(),
    serviceRole
      .from('wallet_external_accounts')
      .select(
        'id,user_id,identity_link_id,provider,chain_family,account_kind,address_normalized,status,is_primary,legacy_preserved,verified_at',
      )
      .eq('user_id', user.id)
      .eq('provider', 'privy')
      .eq('chain_family', 'evm')
      .eq('status', 'verified')
      .eq('is_primary', true)
      .limit(2),
  ]);

  if (identityResult.error || accountsResult.error) {
    return noStoreJson(request, { error: 'WALLET_IDENTITY_PROOF_UNAVAILABLE' }, { status: 503 });
  }

  const identity = identityResult.data as IdentityLinkRow | null;
  if (
    !identity ||
    identity.user_id !== user.id ||
    identity.provider !== 'privy' ||
    identity.status !== 'verified' ||
    !identity.verified_at ||
    !identity.provider_user_id?.trim()
  ) {
    return noStoreJson(request, { error: 'WALLET_IDENTITY_NOT_VERIFIED' }, { status: 409 });
  }

  const accounts = (accountsResult.data ?? []) as ExternalAccountRow[];
  if (accounts.length !== 1) {
    return noStoreJson(
      request,
      { error: accounts.length === 0 ? 'WALLET_IDENTITY_WALLET_MISSING' : 'WALLET_IDENTITY_AMBIGUOUS' },
      { status: 409 },
    );
  }

  const account = accounts[0];
  const walletAddress = account.address_normalized?.trim().toLowerCase();
  if (
    account.user_id !== user.id ||
    account.identity_link_id !== identity.id ||
    account.provider !== 'privy' ||
    account.chain_family !== 'evm' ||
    account.account_kind !== 'embedded' ||
    account.status !== 'verified' ||
    account.is_primary !== true ||
    !account.verified_at ||
    !walletAddress ||
    !/^0x[0-9a-f]{40}$/.test(walletAddress)
  ) {
    return noStoreJson(request, { error: 'WALLET_IDENTITY_CONTRACT_VIOLATION' }, { status: 409 });
  }

  const expectedLegacyPreserved = identity.link_mode === 'legacy_preserve';
  if (account.legacy_preserved !== expectedLegacyPreserved) {
    return noStoreJson(request, { error: 'WALLET_IDENTITY_LEGACY_MISMATCH' }, { status: 409 });
  }

  const principalBindingDigestSha256 = buildPrincipalBindingDigest({
    canonicalUserId: user.id,
    providerUserId: identity.provider_user_id,
    walletAddress,
    linkMode: identity.link_mode,
    verifiedAt: identity.verified_at,
  });

  return noStoreJson(request, {
    proof: {
      version: PROOF_VERSION,
      status: 'verified',
      canonicalUserId: user.id,
      walletAddress,
      linkMode: identity.link_mode,
      legacyPreserved: account.legacy_preserved,
      verifiedAt: identity.verified_at,
      walletVerifiedAt: account.verified_at,
      principalBindingDigestSha256,
    },
  });
}
