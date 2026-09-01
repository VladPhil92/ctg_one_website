import 'server-only';

import { createPublicKey, type KeyObject } from 'node:crypto';
import type { JsonWebKey as NodeJsonWebKey } from 'node:crypto';
import { NextResponse } from 'next/server';

import {
  createAdminClient,
  createAuthenticatedRequestContext,
  isSupabaseConfigured,
} from '@/lib/supabase/server';
import { applyWalletCors, walletCorsPreflight } from '@/lib/wallet/cors';
import { inspectPrivyServerTrust } from '@/lib/wallet/privy-server-trust';

const READINESS_VERSION = 'ctg-wallet-identity-readiness-v1' as const;
const CORS_METHODS = ['GET', 'OPTIONS'] as const;
const JWKS_TIMEOUT_MS = 4_000;
const SUPPORTED_SUPABASE_ALGS = new Set(['RS256', 'ES256']);

type ReadinessCheck = {
  ready: boolean;
  code: string;
};

type SupabaseJwtCheck = ReadinessCheck & {
  algorithms: string[];
};

type IdentityStorageCheck = ReadinessCheck & {
  state: 'unlinked' | 'legacy_pending' | 'linked' | 'conflict';
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

function isEcP256Key(key: KeyObject): boolean {
  if (key.asymmetricKeyType !== 'ec') return false;
  const curve = key.asymmetricKeyDetails?.namedCurve;
  return curve === 'prime256v1' || curve === 'P-256';
}

function inspectSupabaseJwk(rawKey: unknown): string | null {
  if (!rawKey || typeof rawKey !== 'object' || Array.isArray(rawKey)) return null;
  const jwk = rawKey as NodeJsonWebKey & { alg?: unknown };
  if (typeof jwk.alg !== 'string' || !SUPPORTED_SUPABASE_ALGS.has(jwk.alg)) return null;

  try {
    if (jwk.alg === 'ES256') {
      if (jwk.kty !== 'EC' || jwk.crv !== 'P-256') return null;
      const key = createPublicKey({ key: jwk, format: 'jwk' });
      return isEcP256Key(key) ? 'ES256' : null;
    }

    if (jwk.alg === 'RS256') {
      if (jwk.kty !== 'RSA') return null;
      const key = createPublicKey({ key: jwk, format: 'jwk' });
      return key.asymmetricKeyType === 'rsa' || key.asymmetricKeyType === 'rsa-pss'
        ? 'RS256'
        : null;
    }
  } catch {
    return null;
  }

  return null;
}

async function inspectSupabaseJwtDiscovery(): Promise<SupabaseJwtCheck> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, '');
  if (!baseUrl) {
    return { ready: false, code: 'SUPABASE_URL_MISSING', algorithms: [] };
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/auth/v1/.well-known/jwks.json`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(JWKS_TIMEOUT_MS),
    });
  } catch {
    return { ready: false, code: 'SUPABASE_JWKS_UNAVAILABLE', algorithms: [] };
  }

  if (!response.ok) {
    return { ready: false, code: 'SUPABASE_JWKS_UNAVAILABLE', algorithms: [] };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { ready: false, code: 'SUPABASE_JWKS_INVALID', algorithms: [] };
  }

  const keys =
    payload && typeof payload === 'object' && !Array.isArray(payload) && 'keys' in payload
      ? (payload as { keys?: unknown }).keys
      : null;

  if (!Array.isArray(keys)) {
    return { ready: false, code: 'SUPABASE_JWKS_INVALID', algorithms: [] };
  }

  const algorithms = [...new Set(
    keys
      .map(inspectSupabaseJwk)
      .filter((alg): alg is string => alg !== null),
  )].sort();

  if (algorithms.length === 0) {
    return { ready: false, code: 'SUPABASE_ASYMMETRIC_JWKS_REQUIRED', algorithms: [] };
  }

  return { ready: true, code: 'SUPABASE_ASYMMETRIC_JWKS_READY', algorithms };
}

async function inspectIdentityStorage(userId: string): Promise<IdentityStorageCheck> {
  const serviceRole = createAdminClient();
  const [linkResult, accountResult, evidenceResult] = await Promise.all([
    serviceRole
      .from('wallet_identity_links')
      .select('id,status,link_mode')
      .eq('user_id', userId)
      .eq('provider', 'privy')
      .limit(2),
    serviceRole
      .from('wallet_external_accounts')
      .select('identity_link_id,status,is_primary,chain_family,provider,account_kind,legacy_preserved')
      .eq('user_id', userId)
      .eq('provider', 'privy')
      .eq('chain_family', 'evm')
      .eq('is_primary', true)
      .neq('status', 'revoked')
      .limit(2),
    serviceRole
      .from('wallet_legacy_migration_evidence')
      .select('status')
      .eq('user_id', userId)
      .eq('provider', 'privy')
      .limit(2),
  ]);

  if (linkResult.error || accountResult.error || evidenceResult.error) {
    return { ready: false, code: 'IDENTITY_STORAGE_UNAVAILABLE', state: 'conflict' };
  }

  const links = linkResult.data ?? [];
  const accounts = accountResult.data ?? [];
  const evidence = evidenceResult.data ?? [];

  if (links.length > 1 || accounts.length > 1 || evidence.length > 1) {
    return { ready: false, code: 'IDENTITY_STORAGE_AMBIGUOUS', state: 'conflict' };
  }

  const link = links[0] ?? null;
  const account = accounts[0] ?? null;
  const legacyEvidence = evidence[0] ?? null;

  if (link?.status === 'revoked') {
    return { ready: false, code: 'IDENTITY_LINK_REVOKED', state: 'conflict' };
  }

  if (link && account) {
    const legacyPreservedExpected = link.link_mode === 'legacy_preserve';
    const relationshipConsistent =
      link.status === 'verified' &&
      account.status === 'verified' &&
      account.account_kind === 'embedded' &&
      account.identity_link_id === link.id &&
      account.legacy_preserved === legacyPreservedExpected;

    if (!relationshipConsistent) {
      return { ready: false, code: 'IDENTITY_STORAGE_INCONSISTENT', state: 'conflict' };
    }
    return { ready: true, code: 'IDENTITY_STORAGE_LINKED', state: 'linked' };
  }

  if (link || account) {
    return { ready: false, code: 'IDENTITY_STORAGE_PARTIAL', state: 'conflict' };
  }

  if (legacyEvidence?.status === 'rejected') {
    return { ready: false, code: 'LEGACY_EVIDENCE_REJECTED', state: 'conflict' };
  }

  if (legacyEvidence?.status === 'pending') {
    return { ready: true, code: 'IDENTITY_STORAGE_LEGACY_PENDING', state: 'legacy_pending' };
  }

  return { ready: true, code: 'IDENTITY_STORAGE_UNLINKED', state: 'unlinked' };
}

export function OPTIONS(request: Request) {
  return walletCorsPreflight(request, CORS_METHODS);
}

/**
 * Authenticated, non-mutating identity convergence handshake.
 *
 * This endpoint returns readiness codes only. It never returns Privy keys,
 * wallet addresses, provider user ids, access tokens or migration evidence.
 * CTG Wallet uses it before opening another Privy authentication ceremony so
 * infrastructure blockers are surfaced before an OTP can be requested.
 */
export async function GET(request: Request) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return noStoreJson(request, { error: 'WALLET_IDENTITY_NOT_CONFIGURED' }, { status: 503 });
  }

  const auth = await createAuthenticatedRequestContext(request);
  if (!auth) {
    return noStoreJson(request, { error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const [supabaseJwt, storage, privyVerifier] = await Promise.all([
    inspectSupabaseJwtDiscovery(),
    inspectIdentityStorage(auth.user.id),
    inspectPrivyServerTrust(),
  ]);

  const ready = supabaseJwt.ready && privyVerifier.ready && storage.ready;

  return noStoreJson(request, {
    version: READINESS_VERSION,
    ready,
    checks: {
      canonicalSession: { ready: true, code: 'CANONICAL_SESSION_READY' },
      supabaseJwt,
      privyVerifier,
      storage,
    },
  });
}
