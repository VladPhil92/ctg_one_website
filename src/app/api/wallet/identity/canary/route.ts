import 'server-only';

import { NextResponse } from 'next/server';

import {
  createAuthenticatedRequestContext,
  isSupabaseConfigured,
} from '@/lib/supabase/server';
import {
  IdentityConvergenceCanaryError,
  inspectIdentityConvergenceCanary,
} from '@/lib/wallet/identity-convergence-canary';
import { applyWalletCors, walletCorsPreflight } from '@/lib/wallet/cors';

const CORS_METHODS = ['GET', 'OPTIONS'] as const;

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
 * Privacy-safe evidence endpoint for the first production identity convergence.
 * It never returns the canonical UUID, Privy DID, EVM address, database ids,
 * tokens or migration digests. The authenticated caller sees only whether this
 * admin-only canary is eligible, resumable, converged or in conflict.
 */
export async function GET(request: Request) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return noStoreJson(
      request,
      { error: 'WALLET_IDENTITY_NOT_CONFIGURED' },
      { status: 503 },
    );
  }

  const auth = await createAuthenticatedRequestContext(request);
  if (!auth) {
    return noStoreJson(request, { error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  try {
    const inspection = await inspectIdentityConvergenceCanary(auth.user.id);
    return noStoreJson(request, inspection);
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
}
