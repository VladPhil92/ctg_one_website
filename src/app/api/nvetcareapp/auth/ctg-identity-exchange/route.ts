import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  clearNvetRoleModeCookie,
  getNvetApiUrl,
  setNvetSessionCookies,
} from '@/lib/nvetcareapp/session';

// "Continuar con mi cuenta CTG One" (Fase 4, docs/identity/ADR-001 en este
// repo). Server-to-server only, exactly like THREAT_MODEL.md § New trust
// boundary requires: lee la sesión de Supabase ya establecida (nunca la
// recibe del cliente) y reenvía solo el access token al backend de Nvet,
// que hace la verificación real contra su JWKS. El cliente nunca ve ni
// envía el token de Supabase directamente.
export async function POST(request: NextRequest) {
  let body: { twoFactorCode?: string } = {};
  try {
    body = await request.json();
  } catch {
    // Cuerpo vacío es válido -- twoFactorCode es opcional.
  }

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return NextResponse.json(
      { message: 'No hay una sesión de CTG One activa. Inicia sesión en ctgone.com primero.' },
      { status: 401 }
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${getNvetApiUrl()}/api/auth/ctg-identity-exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supabaseAccessToken: session.access_token,
        twoFactorCode: body.twoFactorCode || undefined,
      }),
    });
  } catch {
    return NextResponse.json({ message: 'No se pudo contactar el servicio de Nvet Care' }, { status: 502 });
  }

  if (upstream.status === 404) {
    return NextResponse.json(
      { message: 'Este método de acceso todavía no está disponible.' },
      { status: 404 }
    );
  }

  const data = await upstream.json().catch(() => null);
  if (!upstream.ok || !data?.accessToken || !data?.refreshToken) {
    return NextResponse.json(
      data ?? { message: 'No se pudo continuar con tu cuenta CTG One' },
      { status: upstream.status || 401 }
    );
  }

  const response = NextResponse.json({
    user: data.user,
    requiresEmailVerification: data.requiresEmailVerification,
  });
  setNvetSessionCookies(response, { accessToken: data.accessToken, refreshToken: data.refreshToken });
  clearNvetRoleModeCookie(response);
  return response;
}
