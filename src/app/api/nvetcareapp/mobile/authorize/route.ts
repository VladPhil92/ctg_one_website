import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createMobileFederationCode,
  isAllowedMobileRedirect,
  isValidFederationState,
  isValidPkceChallenge,
} from '@/lib/nvetcareapp/mobile-federation';

function redirect(location: string) {
  return new NextResponse(null, {
    status: 302,
    headers: {
      Location: location,
      'Cache-Control': 'no-store, max-age=0',
      Pragma: 'no-cache',
    },
  });
}

function requestRelativeUrl(request: NextRequest): string {
  return `${request.nextUrl.pathname}${request.nextUrl.search}`;
}

export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get('code_challenge');
  const method = request.nextUrl.searchParams.get('code_challenge_method');
  const state = request.nextUrl.searchParams.get('state');
  const redirectUri = request.nextUrl.searchParams.get('redirect_uri');

  if (
    method !== 'S256' ||
    !isValidPkceChallenge(challenge) ||
    !isValidFederationState(state) ||
    !isAllowedMobileRedirect(redirectUri)
  ) {
    return NextResponse.json(
      { message: 'Solicitud de federación móvil inválida.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
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

  const { data: assurance, error: assuranceError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError) {
    return NextResponse.json(
      { message: 'No se pudo verificar el nivel de seguridad de la cuenta CTG One.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
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
    return NextResponse.json(
      { message: 'La federación móvil CTG One no está configurada.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const callback = new URL(redirectUri);
  callback.searchParams.set('code', code);
  callback.searchParams.set('state', state);
  return redirect(callback.toString());
}
