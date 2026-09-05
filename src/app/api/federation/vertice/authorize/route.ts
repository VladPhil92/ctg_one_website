import { NextResponse } from 'next/server';

import {
  createAuthorizationCode,
  isValidFederationState,
  isValidPkceChallenge,
  sha256Hex,
  VERTICE_AUTHORIZATION_CODE_TTL_MS,
  VERTICE_CANONICAL_ORIGIN,
  VERTICE_FEDERATION_PROVIDER,
} from '@/lib/federation/vertice';
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
    // This endpoint is reached via a full-page browser navigation from
    // VÉRTICE (window.location.replace), not fetch/XHR. Returning a bare
    // JSON 401 here left the CTG One user stuck looking at raw JSON with
    // no way to sign in. Send them to the normal login page and bounce
    // back to this same authorize request (preserving code_challenge and
    // state) once they're authenticated.
    const loginUrl = new URL('/iniciar-sesion', url.origin);
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
  const expiresAt = new Date(createdAt.getTime() + VERTICE_AUTHORIZATION_CODE_TTL_MS);

  const admin = createAdminClient();
  const { error } = await admin
    .from('identity_federation_authorization_codes')
    .insert({
      provider: VERTICE_FEDERATION_PROVIDER,
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

  const destination = new URL('/auth/ctgone/callback', VERTICE_CANONICAL_ORIGIN);
  destination.searchParams.set('code', code);
  destination.searchParams.set('state', state);

  const response = NextResponse.redirect(destination, 302);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}
