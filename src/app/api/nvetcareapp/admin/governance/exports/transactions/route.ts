import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getNvetApiUrl, NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';

export async function GET() {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

  const userResult = await fetchNvetCurrentUser(accessToken);
  if (!userResult.ok || !userResult.user.isSuperadmin) {
    return NextResponse.json({ message: 'Gobernanza reservada al SUPERADMIN' }, { status: userResult.ok ? 403 : userResult.status });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${getNvetApiUrl()}/api/admin/exports/transactions?format=CSV`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ message: 'No se pudo contactar Nvet Care' }, { status: 502 });
  }

  if (!upstream.ok) {
    return NextResponse.json({ message: 'No se pudo generar el export' }, { status: upstream.status });
  }

  const body = await upstream.text();
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'text/csv; charset=utf-8',
      'Content-Disposition': upstream.headers.get('content-disposition') ?? 'attachment; filename="nvet-transacciones.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
