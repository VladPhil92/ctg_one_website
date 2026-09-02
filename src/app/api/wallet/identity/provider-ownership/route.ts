import 'server-only';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createAuthenticatedRequestContext,
  isSupabaseConfigured,
} from '@/lib/supabase/server';
import {
  IdentityConvergenceCanaryError,
  inspectIdentityConvergenceCanary,
} from '@/lib/wallet/identity-convergence-canary';
import { applyWalletCors, walletCorsPreflight } from '@/lib/wallet/cors';
import {
  inspectPrivyOwnership,
  isPrivyUserRegistryConfigured,
  PrivyUserRegistryError,
} from '@/lib/wallet/privy-user-registry';

const MAX_REQUEST_BYTES = 2 * 1024;
const CORS_METHODS = ['POST', 'OPTIONS'] as const;
const requestSchema = z.object({
  historicalPrivyUserId: z.string().regex(/^did:privy:[a-zA-Z0-9_-]+$/),
  historicalWalletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
}).strict();

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

export function OPTIONS(request: Request) {
  return walletCorsPreflight(request, CORS_METHODS);
}

/**
 * Read-only Privy ownership preflight for the first legacy-preservation canary.
 *
 * The browser-supplied DID/address never establish authority. Privy's server API
 * independently resolves the owner of the wallet address, and the final mutation
 * remains `legacy-bootstrap`, which requires a fresh signed Privy identity token.
 * This route exists only to prevent futile OTP/link loops when `custom_auth` is
 * already owned by a different Privy principal.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return noStoreJson(request, { error: 'WALLET_IDENTITY_NOT_CONFIGURED' }, { status: 503 });
  }
  if (!isPrivyUserRegistryConfigured()) {
    return noStoreJson(request, { error: 'PRIVY_USER_REGISTRY_NOT_CONFIGURED' }, { status: 503 });
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
    const canary = await inspectIdentityConvergenceCanary(auth.user.id);
    if (!canary.eligible) {
      return noStoreJson(
        request,
        { error: 'IDENTITY_CONVERGENCE_CANARY_ADMIN_ONLY' },
        { status: 403 },
      );
    }
    if (canary.state === 'conflict') {
      return noStoreJson(request, { error: canary.code }, { status: 409 });
    }
  } catch (error) {
    if (error instanceof IdentityConvergenceCanaryError) {
      return noStoreJson(request, { error: error.code }, { status: 503 });
    }
    return noStoreJson(
      request,
      { error: 'IDENTITY_CONVERGENCE_CANARY_UNAVAILABLE' },
      { status: 503 },
    );
  }

  let body: z.infer<typeof requestSchema>;
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, 'utf8') > MAX_REQUEST_BYTES) {
      return noStoreJson(request, { error: 'REQUEST_TOO_LARGE' }, { status: 413 });
    }
    body = requestSchema.parse(JSON.parse(rawBody || '{}'));
  } catch {
    return noStoreJson(request, { error: 'INVALID_REQUEST' }, { status: 400 });
  }

  try {
    const inspection = await inspectPrivyOwnership({
      canonicalUserId: auth.user.id,
      historicalPrivyUserId: body.historicalPrivyUserId,
      historicalWalletAddress: body.historicalWalletAddress,
    });

    if (inspection.state === 'ownership_conflict') {
      return noStoreJson(
        request,
        {
          ok: false,
          state: inspection.state,
          historicalWalletOwnerVerified: true,
          conflictingPrincipalHasEmbeddedWallet: inspection.conflictingPrincipalHasEmbeddedWallet,
          conflictingPrincipalLinkedAccountCount: inspection.conflictingPrincipalLinkedAccountCount,
        },
        { status: 409 },
      );
    }

    return noStoreJson(request, {
      ok: true,
      state: inspection.state,
      historicalWalletOwnerVerified: true,
    });
  } catch (error) {
    if (error instanceof PrivyUserRegistryError) {
      const status = error.code === 'PRIVY_USER_REGISTRY_NOT_CONFIGURED'
        || error.code === 'PRIVY_USER_REGISTRY_AUTH_FAILED'
        || error.code === 'PRIVY_USER_REGISTRY_UNAVAILABLE'
        ? 503
        : 409;
      return noStoreJson(request, { error: error.code }, { status });
    }
    return noStoreJson(request, { error: 'PRIVY_USER_REGISTRY_UNAVAILABLE' }, { status: 503 });
  }
}
