import { NextResponse, type NextRequest } from 'next/server';
import {
  createAdminClient,
  createClient,
  isSupabaseConfigured,
} from '@/lib/supabase/server';
import {
  createMobileFederationCode,
  isAllowedMobileRedirect,
  isValidFederationState,
  isValidPkceChallenge,
  NVET_MOBILE_FEDERATION_CODE_TTL_MS,
  NVET_MOBILE_FEDERATION_PROVIDER,
  sha256Hex,
} from '@/lib/nvetcareapp/mobile-federation';

export const dynamic = 'force-dynamic';

function securityHeaders(): Record<string, string> {
  return {
    'Cache-Control': 'no-store, max-age=0',
    Pragma: 'no-cache',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
  };
}

function noStoreJson(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: securityHeaders() });
}

function redirect(location: string) {
  return new NextResponse(null, {
    status: 302,
    headers: { Location: location, ...securityHeaders() },
  });
}

function requestRelativeUrl(request: NextRequest): string {
  return `${request.nextUrl.pathname}${request.nextUrl.search}`;
}

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return noStoreJson({ error: 'FEDERATION_UNAVAILABLE' }, 503);
  }

  const responseType = request.nextUrl.searchParams.get('response_type');
  const challenge = request.nextUrl.searchParams.get('code_challenge');
  const method = request.nextUrl.searchParams.get('code_challenge_method');
  const state = request.nextUrl.searchParams.get('state');
  const redirectUri = request.nextUrl.searchParams.get('redirect_uri');

  if (
    responseType !== 'code' ||
    method !== 'S256' ||
    !isValidPkceChallenge(challenge) ||
    !isValidFederationState(state) ||
    !isAllowedMobileRedirect(redirectUri)
  ) {
    return noStoreJson({ error: 'INVALID_FEDERATION_REQUEST' }, 400);
  }

  const supabase = await createClient();
  const [{ data: userData }, { data: sessionData }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ]);

  if (!userData.user || !sessionData.session?.access_token) {
    const next = encodeURIComponent(requestRelativeUrl(request));
    return redirect(`/iniciar-sesion?next=${next}`);
  }

  const email = userData.user.email?.trim().toLowerCase() ?? '';
  const emailVerified = Boolean(userData.user.email_confirmed_at);
  if (!email || !emailVerified) {
    return noStoreJson({ error: 'VERIFIED_EMAIL_REQUIRED' }, 403);
  }

  const { data: assurance, error: assuranceError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError) {
    return noStoreJson({ error: 'ASSURANCE_LEVEL_UNAVAILABLE' }, 503);
  }
  if (assurance?.currentLevel !== 'aal2' && assurance?.nextLevel === 'aal2') {
    const next = encodeURIComponent(requestRelativeUrl(request));
    return redirect(`/dashboard/seguridad/mfa?next=${next}`);
  }

  let code: string;
  try {
    code = createMobileFederationCode({
      subject: userData.user.id,
      supabaseAccessToken: sessionData.session.access_token,
      codeChallenge: challenge,
      redirectUri,
    });
  } catch {
    return noStoreJson({ error: 'FEDERATION_SECRET_NOT_CONFIGURED' }, 503);
  }

  const createdAt = new Date();
  const expiresAt = new Date(
    createdAt.getTime() + NVET_MOBILE_FEDERATION_CODE_TTL_MS,
  );
  const admin = createAdminClient();
  const { error: storeError } = await admin
    .from('identity_federation_authorization_codes')
    .insert({
      provider: NVET_MOBILE_FEDERATION_PROVIDER,
      subject_user_id: userData.user.id,
      subject_email: email,
      subject_email_verified: true,
      code_hash: sha256Hex(code),
      code_challenge: challenge,
      expires_at: expiresAt.toISOString(),
      created_at: createdAt.toISOString(),
    });

  if (storeError) {
    return noStoreJson({ error: 'FEDERATION_CODE_ISSUE_FAILED' }, 503);
  }

  const callback = new URL(redirectUri);
  callback.searchParams.set('code', code);
  callback.searchParams.set('state', state);
  return redirect(callback.toString());
}
