import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetVets } from '@/lib/nvetcareapp/vets';

// BFF route per ADR-003: reads the session cookie, calls NestJS server-side
// with the bearer token, forwards its status — never re-implements the
// ADMIN role check itself. Forwards `offset` (allow-listed as a
// non-negative integer) so the admin veterinarians list can page past the
// backend's own page size instead of only ever showing the first page.
export async function GET(request: NextRequest) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const offsetParam = request.nextUrl.searchParams.get('offset');
  const offset = offsetParam !== null ? Number(offsetParam) : 0;
  if (!Number.isInteger(offset) || offset < 0) {
    return NextResponse.json({ message: 'Offset inválido' }, { status: 400 });
  }

  const result = await fetchNvetVets(accessToken, offset);
  if (!result.ok) {
    const message = result.status === 403 ? 'No tienes permisos de administrador' : 'No se pudo obtener la lista de veterinarios';
    return NextResponse.json({ message }, { status: result.status });
  }

  return NextResponse.json(result.page);
}
