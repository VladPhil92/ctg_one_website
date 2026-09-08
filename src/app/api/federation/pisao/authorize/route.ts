import { NextResponse } from 'next/server';

import {
  createAuthorizationCode,
  isValidFederationState,
  isValidPkceChallenge,
  PISAO_AUTHORIZATION_CODE_TTL_MS,
  PISAO_CANONICAL_ORIGIN,
  PISAO_FEDERATION_PROVIDER,
  sha256Hex,
} from '@/lib/federation/pisao';
import {
  createAdminClient,
  createAuthenticatedRequestContext,
  isSupabaseConfigured,
} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function noStoreJson(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return noStoreJson({ error: 'FEDERATION_UNAVAILABLE' }, 503);
  }

  const url = new URL(request.url);
  const codeChallenge = url.searchParams.get('code_challenge');
  const state = url.searchParams.get('state');

  if (!isValidPkceChallenge(codeChallenge) || !isValidFederationState(state)) {
    return noStoreJson({ error: 'INVALID_FEDERATION_REQUEST' }, 400);
  }

  const auth = await createAuthenticatedRequestContext(request);
  if (!auth) {
    const publicOrigin = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
    const loginUrl = new URL('/iniciar-sesion', publicOrigin);
    loginUrl.searchParams.set('next', `${url.pathname}${url.search}`);
    const response = NextResponse.redirect(loginUrl, 302);
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('Referrer-Policy', 'no-referrer');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    return response;
  }

  const email = auth.user.email?.trim().toLowerCase() ?? '';
  const emailVerified = Boolean(auth.user.email_confirmed_at);
  if (!email || !emailVerified) {
    return noStoreJson({ error: 'VERIFIED_EMAIL_REQUIRED' }, 403);
  }

  const code = createAuthorizationCode();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + PISAO_AUTHORIZATION_CODE_TTL_MS);

  const admin = createAdminClient();
  const { error } = await admin
    .from('identity_federation_authorization_codes')
    .insert({
      provider: PISAO_FEDERATION_PROVIDER,
      subject_user_id: auth.user.id,
      subject_email: email,
      subject_email_verified: true,
      code_hash: sha256Hex(code),
      code_challenge: codeChallenge,
      expires_at: expiresAt.toISOString(),
      created_at: createdAt.toISOString(),
    });

  if (error) {
    return noStoreJson({ error: 'FEDERATION_CODE_ISSUE_FAILED' }, 503);
  }

  const destination = new URL('/auth/ctgone/callback', PISAO_CANONICAL_ORIGIN);
  destination.searchParams.set('code', code);
  destination.searchParams.set('state', state);

  const response = NextResponse.redirect(destination, 302);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}
