import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { reviewNvetGovernanceVet } from '@/lib/nvetcareapp/governance';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';

const DECISIONS = ['APPROVE', 'REJECT', 'IN_REVIEW'] as const;
type Decision = (typeof DECISIONS)[number];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

  const userResult = await fetchNvetCurrentUser(accessToken);
  if (!userResult.ok || !userResult.user.isSuperadmin) {
    return NextResponse.json({ message: 'Gobernanza reservada al SUPERADMIN' }, { status: userResult.ok ? 403 : userResult.status });
  }

  let body: { decision?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Cuerpo de solicitud inválido' }, { status: 400 });
  }

  if (
    typeof body.decision !== 'string' ||
    !DECISIONS.includes(body.decision as Decision) ||
    typeof body.reason !== 'string' ||
    body.reason.trim().length < 10
  ) {
    return NextResponse.json({ message: 'Decisión o motivo inválido' }, { status: 400 });
  }

  const { id } = await params;
  const result = await reviewNvetGovernanceVet(
    accessToken,
    id,
    body.decision as Decision,
    body.reason.trim(),
  );
  if (!result.ok) {
    return NextResponse.json(
      { message: result.status === 403 ? 'Gobernanza reservada al SUPERADMIN' : 'No se pudo registrar la decisión de verificación' },
      { status: result.status },
    );
  }

  return NextResponse.json(result.data);
}
