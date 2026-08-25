import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { confirmNvetTransfer } from '@/lib/nvetcareapp/transactions';

// BFF route per ADR-003. The backend's own guard (RolesGuard(ADMIN)) and
// its own state-transition validation are authoritative — this only
// forwards the session's bearer token server-side.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const { id } = await params;
  const result = await confirmNvetTransfer(accessToken, id);
  if (!result.ok) {
    return NextResponse.json({ message: result.message ?? 'No se pudo confirmar la transferencia' }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
