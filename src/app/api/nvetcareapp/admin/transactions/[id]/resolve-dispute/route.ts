import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { resolveNvetDispute, type NvetDisputeResolution } from '@/lib/nvetcareapp/transactions';

const VALID_RESOLUTIONS: NvetDisputeResolution[] = ['CONFIRM', 'REFUND', 'CANCEL'];

// BFF route per ADR-003. Validates the resolution against an allow-list and
// the notes length (backend's own ResolveDisputeDto requires 10-1000
// chars) as defense in depth — the backend's own guard, its "only a
// DISPUTED transaction can be resolved" check, and its CRITICAL-severity
// audit log are authoritative.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const { id } = await params;
  let body: { resolution?: string; notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Cuerpo de solicitud inválido' }, { status: 400 });
  }

  if (!body.resolution || !VALID_RESOLUTIONS.includes(body.resolution as NvetDisputeResolution)) {
    return NextResponse.json({ message: 'Resolución inválida' }, { status: 400 });
  }

  const notes = body.notes?.trim() ?? '';
  if (notes.length < 10 || notes.length > 1000) {
    return NextResponse.json({ message: 'Las notas deben tener entre 10 y 1000 caracteres' }, { status: 400 });
  }

  const result = await resolveNvetDispute(accessToken, id, body.resolution as NvetDisputeResolution, notes);
  if (!result.ok) {
    return NextResponse.json({ message: result.message ?? 'No se pudo resolver la disputa' }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
