import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { markNvetNotificationRead } from '@/lib/nvetcareapp/notifications';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

  const userResult = await fetchNvetCurrentUser(accessToken);
  if (!userResult.ok) {
    return NextResponse.json(
      { message: userResult.status === 401 ? 'No autenticado' : 'No autorizado' },
      { status: userResult.status === 401 ? 401 : 403 },
    );
  }
  if (userResult.user.isVetTesterMode || !['CLIENT', 'VET'].includes(userResult.user.role)) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ message: 'Notificación inválida' }, { status: 400 });

  const result = await markNvetNotificationRead(accessToken, id);
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });
  return NextResponse.json(result.data);
}
