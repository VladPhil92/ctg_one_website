import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { updateNvetVetTier, type NvetVetTier } from '@/lib/nvetcareapp/vets';

const VALID_TIERS: NvetVetTier[] = ['FREE', 'PRO', 'ELITE'];

// BFF route per ADR-003. The backend's own guard restricts this to ADMIN
// and audit-logs the change — this only forwards the session's bearer
// token server-side.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const { id } = await params;
  let body: { tier?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Cuerpo de solicitud inválido' }, { status: 400 });
  }

  if (!body.tier || !VALID_TIERS.includes(body.tier as NvetVetTier)) {
    return NextResponse.json({ message: 'Nivel inválido' }, { status: 400 });
  }

  const result = await updateNvetVetTier(accessToken, id, body.tier as NvetVetTier, body.reason);
  if (!result.ok) {
    const message = result.status === 403 ? 'No tienes permisos de administrador' : 'No se pudo actualizar el nivel del veterinario';
    return NextResponse.json({ message }, { status: result.status });
  }

  return NextResponse.json(result.vet);
}
