import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { getNvetAuthorizationHeaders } from '@/lib/nvetcareapp/request';
import { getNvetApiUrl, NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';

async function proxyLegal(request: NextRequest, method: 'GET' | 'POST') {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

  let body: string | undefined;
  if (method === 'POST') {
    body = await request.text();
  }

  try {
    const upstream = await fetch(`${getNvetApiUrl()}/api/beta/legal${method === 'POST' ? '/accept' : ''}`, {
      method,
      headers: await getNvetAuthorizationHeaders(accessToken, method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      ...(body ? { body } : {}),
      cache: 'no-store',
    });
    const data = await upstream.json().catch(() => null);
    return NextResponse.json(data ?? { message: 'Respuesta inválida del servicio Nvet' }, { status: upstream.status });
  } catch {
    return NextResponse.json({ message: 'No se pudo contactar el servicio legal de Nvet' }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  return proxyLegal(request, 'GET');
}

export async function POST(request: NextRequest) {
  return proxyLegal(request, 'POST');
}
