import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { requireNvetClient } from '@/lib/nvetcareapp/client-booking';
import { markAllNvetNotificationsRead } from '@/lib/nvetcareapp/notifications';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';

export async function PATCH() {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

  const client = await requireNvetClient(accessToken);
  if (!client.ok) return NextResponse.json({ message: client.message }, { status: client.status });

  const result = await markAllNvetNotificationsRead(accessToken);
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });
  return NextResponse.json(result.data);
}
