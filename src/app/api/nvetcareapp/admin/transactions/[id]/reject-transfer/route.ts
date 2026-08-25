import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { rejectNvetTransfer } from '@/lib/nvetcareapp/transactions';

// BFF route per ADR-003. The reason-length check mirrors the backend's own
// (payments.service.ts::adminRejectTransfer requires >= 10 chars) as
// defense in depth, not a replacement — the backend's own guard and
// validation are authoritative.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const { id } = await params;
  let body: { reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Cuerpo de solicitud inválido' }, { status: 400 });
  }

  const reason = body.reason?.trim() ?? '';
  if (reason.length < 10) {
    return NextResponse.json({ message: 'El motivo debe tener al menos 10 caracteres' }, { status: 400 });
  }

  const result = await rejectNvetTransfer(accessToken, id, reason);
  if (!result.ok) {
    return NextResponse.json({ message: result.message ?? 'No se pudo rechazar la transferencia' }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
