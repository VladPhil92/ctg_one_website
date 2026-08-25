import { NextResponse, type NextRequest } from 'next/server';
import { getNvetApiUrl, setNvetSessionCookies } from '@/lib/nvetcareapp/session';

// Proxies to NestJS POST /auth/login server-side and turns the returned
// access/refresh tokens into httpOnly cookies — the browser never holds
// the bearer token directly. See ADR-002.
export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string; twoFactorCode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Cuerpo de solicitud inválido' }, { status: 400 });
  }

  const { email, password, twoFactorCode } = body;
  if (!email || !password) {
    return NextResponse.json({ message: 'Correo y contraseña requeridos' }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${getNvetApiUrl()}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, twoFactorCode }),
    });
  } catch {
    return NextResponse.json({ message: 'No se pudo contactar el servicio de Nvet Care' }, { status: 502 });
  }

  const data = await upstream.json().catch(() => null);
  if (!upstream.ok || !data?.accessToken || !data?.refreshToken) {
    return NextResponse.json(data ?? { message: 'Error de autenticación' }, { status: upstream.status || 401 });
  }

  const response = NextResponse.json({
    user: data.user,
    requiresEmailVerification: data.requiresEmailVerification,
  });
  setNvetSessionCookies(response, { accessToken: data.accessToken, refreshToken: data.refreshToken });
  return response;
}
