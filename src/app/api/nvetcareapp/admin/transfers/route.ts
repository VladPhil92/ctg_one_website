import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetPendingTransfers } from '@/lib/nvetcareapp/transactions';

export async function GET() {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const result = await fetchNvetPendingTransfers(accessToken);
  if (!result.ok) {
    const message = result.status === 403 ? 'No tienes permisos de administrador' : 'No se pudieron obtener las transferencias pendientes';
    return NextResponse.json({ message }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
