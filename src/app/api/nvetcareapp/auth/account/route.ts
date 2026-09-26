import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { getNvetAuthorizationHeaders } from '@/lib/nvetcareapp/request';
import {
  clearNvetSessionCookies,
  getNvetApiUrl,
  NVET_ACCESS_COOKIE,
} from '@/lib/nvetcareapp/session';

async function accessTokenOr401() {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  return accessToken || null;
}

export async function GET() {
  const accessToken = await accessTokenOr401();
  if (!accessToken) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

  try {
    const upstream = await fetch(`${getNvetApiUrl()}/api/auth/account/deletion-readiness`, {
      headers: await getNvetAuthorizationHeaders(accessToken),
      cache: 'no-store',
    });
    const data = await upstream.json().catch(() => null);
    return NextResponse.json(data ?? { message: 'No se pudo verificar la cuenta' }, { status: upstream.status });
  } catch {
    return NextResponse.json({ message: 'No se pudo contactar el servicio de cuenta Nvet' }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest) {
  const accessToken = await accessTokenOr401();
  if (!accessToken) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

  const body = await request.text();
  try {
    const upstream = await fetch(`${getNvetApiUrl()}/api/auth/account`, {
      method: 'DELETE',
      headers: await getNvetAuthorizationHeaders(accessToken, { 'Content-Type': 'application/json' }),
      body,
    });
    const data = await upstream.json().catch(() => null);
    const response = NextResponse.json(data ?? { message: upstream.ok ? 'Cuenta eliminada' : 'No se pudo eliminar la cuenta' }, { status: upstream.status });
    if (upstream.ok) clearNvetSessionCookies(response);
    return response;
  } catch {
    return NextResponse.json({ message: 'No se pudo contactar el servicio de cuenta Nvet' }, { status: 502 });
  }
}
