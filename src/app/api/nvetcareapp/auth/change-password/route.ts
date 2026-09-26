import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { getNvetAuthorizationHeaders } from '@/lib/nvetcareapp/request';
import {
  clearNvetSessionCookies,
  getNvetApiUrl,
  NVET_ACCESS_COOKIE,
} from '@/lib/nvetcareapp/session';

export async function POST(request: NextRequest) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

  const body = await request.text();
  let upstream: Response;
  try {
    upstream = await fetch(`${getNvetApiUrl()}/api/auth/change-password`, {
      method: 'POST',
      headers: await getNvetAuthorizationHeaders(accessToken, { 'Content-Type': 'application/json' }),
      body,
    });
  } catch {
    return NextResponse.json({ message: 'No se pudo contactar el servicio de seguridad Nvet' }, { status: 502 });
  }

  const data = await upstream.json().catch(() => null);
  const response = NextResponse.json(data ?? { message: upstream.ok ? 'Contraseña actualizada' : 'No se pudo actualizar la contraseña' }, { status: upstream.status });
  if (upstream.ok) clearNvetSessionCookies(response);
  return response;
}
