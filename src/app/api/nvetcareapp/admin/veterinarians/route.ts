import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetVets } from '@/lib/nvetcareapp/vets';

// BFF route per ADR-003: reads the session cookie, calls NestJS server-side
// with the bearer token, forwards its status — never re-implements the
// ADMIN role check itself.
export async function GET() {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const result = await fetchNvetVets(accessToken);
  if (!result.ok) {
    const message = result.status === 403 ? 'No tienes permisos de administrador' : 'No se pudo obtener la lista de veterinarios';
    return NextResponse.json({ message }, { status: result.status });
  }

  return NextResponse.json(result.page);
}
