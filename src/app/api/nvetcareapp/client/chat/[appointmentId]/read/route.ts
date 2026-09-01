import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { requireNvetClient } from '@/lib/nvetcareapp/client-booking';
import { getNvetAuthorizationHeaders } from '@/lib/nvetcareapp/request';
import { getNvetApiUrl, NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ appointmentId: string }> }) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

  const client = await requireNvetClient(accessToken);
  if (!client.ok) return NextResponse.json({ message: client.message }, { status: client.status });

  const { appointmentId } = await params;
  if (!UUID.test(appointmentId)) return NextResponse.json({ message: 'Cita inválida' }, { status: 400 });

  const body = await request.json().catch(() => null) as { messageIds?: unknown } | null;
  const messageIds = Array.isArray(body?.messageIds)
    ? body.messageIds.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];
  if (messageIds.length === 0 || messageIds.length > 100) {
    return NextResponse.json({ message: 'Debes indicar entre 1 y 100 mensajes' }, { status: 400 });
  }

  try {
    const response = await fetch(`${getNvetApiUrl()}/api/chat/${encodeURIComponent(appointmentId)}/mark-read`, {
      method: 'POST',
      headers: await getNvetAuthorizationHeaders(accessToken, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ messageIds }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null) as { message?: unknown } | null;
      const message = typeof data?.message === 'string' ? data.message : 'No se pudieron marcar los mensajes';
      return NextResponse.json({ message }, { status: response.status });
    }

    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json({ message: 'No se pudo contactar el servicio de chat' }, { status: 502 });
  }
}
