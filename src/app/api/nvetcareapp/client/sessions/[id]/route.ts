import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { requireNvetClient } from '@/lib/nvetcareapp/client-booking';
import { revokeNvetUserSession } from '@/lib/nvetcareapp/profile';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

  const client = await requireNvetClient(accessToken);
  if (!client.ok) return NextResponse.json({ message: client.message }, { status: client.status });

  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ message: 'Sesión inválida' }, { status: 400 });

  // Ownership is enforced again by Nvet using the authenticated JWT subject;
  // the route never accepts a user/owner identifier from the browser.
  const result = await revokeNvetUserSession(accessToken, id);
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });

  return NextResponse.json(result.data);
}
