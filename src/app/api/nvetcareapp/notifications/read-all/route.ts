import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { markAllNvetNotificationsRead } from '@/lib/nvetcareapp/notifications';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';

export async function PATCH() {
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

  const result = await markAllNvetNotificationsRead(accessToken);
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });
  return NextResponse.json(result.data);
}
