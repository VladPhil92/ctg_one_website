import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetAdminMetrics } from '@/lib/nvetcareapp/admin';

// BFF route per ADR-003: reads the session cookie, calls NestJS server-side
// with the bearer token, returns the shaped JSON — the browser never holds
// the token directly.
export async function GET() {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const result = await fetchNvetAdminMetrics(accessToken);
  if (!result.ok) {
    const message = result.status === 403 ? 'No tienes permisos de administrador' : 'No se pudieron obtener las métricas';
    return NextResponse.json({ message }, { status: result.status });
  }

  return NextResponse.json(result.metrics);
}
