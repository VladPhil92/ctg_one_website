import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { updateNvetGovernanceUserStatus } from '@/lib/nvetcareapp/governance';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

  const userResult = await fetchNvetCurrentUser(accessToken);
  if (!userResult.ok || !userResult.user.isSuperadmin) {
    return NextResponse.json({ message: 'Gobernanza reservada al SUPERADMIN' }, { status: userResult.ok ? 403 : userResult.status });
  }

  let body: { isActive?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Cuerpo de solicitud inválido' }, { status: 400 });
  }

  if (typeof body.isActive !== 'boolean' || typeof body.reason !== 'string' || body.reason.trim().length < 10) {
    return NextResponse.json({ message: 'Estado o motivo inválido' }, { status: 400 });
  }

  const { id } = await params;
  const result = await updateNvetGovernanceUserStatus(accessToken, id, body.isActive, body.reason.trim());
  if (!result.ok) {
    const message = result.status === 400
      ? 'La identidad raíz no puede desactivarse o la solicitud es inválida'
      : result.status === 403
        ? 'Gobernanza reservada al SUPERADMIN'
        : 'No se pudo actualizar el estado de la cuenta';
    return NextResponse.json({ message }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
