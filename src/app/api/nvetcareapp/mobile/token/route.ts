import { NextResponse, type NextRequest } from 'next/server';
import { getNvetApiUrl } from '@/lib/nvetcareapp/session';
import {
  isAllowedMobileRedirect,
  isValidPkceVerifier,
  readMobileFederationCode,
  verifyPkce,
} from '@/lib/nvetcareapp/mobile-federation';

type TokenRequest = {
  code?: string;
  codeVerifier?: string;
  redirectUri?: string;
  twoFactorCode?: string;
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      Pragma: 'no-cache',
    },
  });
}

export async function POST(request: NextRequest) {
  let body: TokenRequest;
  try {
    body = await request.json();
  } catch {
    return json({ message: 'Solicitud inválida.' }, 400);
  }

  if (
    typeof body.code !== 'string' ||
    !isValidPkceVerifier(body.codeVerifier) ||
    !isAllowedMobileRedirect(body.redirectUri ?? null) ||
    (body.twoFactorCode !== undefined && typeof body.twoFactorCode !== 'string')
  ) {
    return json({ message: 'Solicitud de intercambio móvil inválida.' }, 400);
  }

  let sealed;
  try {
    sealed = readMobileFederationCode(body.code);
  } catch {
    return json({ message: 'El código de autorización expiró o no es válido.' }, 401);
  }

  if (sealed.redirectUri !== body.redirectUri || !verifyPkce(sealed, body.codeVerifier)) {
    return json({ message: 'La prueba PKCE no coincide con la autorización emitida.' }, 401);
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${getNvetApiUrl()}/api/auth/ctg-identity-exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({
        supabaseAccessToken: sealed.supabaseAccessToken,
        twoFactorCode: body.twoFactorCode?.trim() || undefined,
      }),
      cache: 'no-store',
    });
  } catch {
    return json({ message: 'No se pudo contactar el servicio de Nvet Care.' }, 502);
  }

  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    return json(data ?? { message: 'No se pudo completar el acceso con CTG One.' }, upstream.status || 401);
  }

  if (!data?.accessToken || !data?.refreshToken || !data?.user?.id) {
    return json({ message: 'Nvet Care devolvió una sesión incompleta.' }, 502);
  }

  return json({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user,
    requiresEmailVerification: data.requiresEmailVerification,
    remainingRecoveryCodes: data.remainingRecoveryCodes,
    warning: data.warning ?? null,
  });
}
