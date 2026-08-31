import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { requireNvetClient } from '@/lib/nvetcareapp/client-booking';
import { getNvetAuthorizationHeaders } from '@/lib/nvetcareapp/request';
import { getNvetApiUrl, NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function authorize() {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) return { response: NextResponse.json({ message: 'No autenticado' }, { status: 401 }) };
  const client = await requireNvetClient(accessToken);
  if (!client.ok) return { response: NextResponse.json({ message: client.message }, { status: client.status }) };
  return { accessToken };
}

async function relayMessage(response: Response, fallback: string) {
  const data = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
        ? data.message
        : fallback;
    return NextResponse.json({ message }, { status: response.status });
  }
  return NextResponse.json(data, { status: response.status });
}

export async function GET(_request: Request, { params }: { params: Promise<{ appointmentId: string }> }) {
  const auth = await authorize();
  if ('response' in auth) return auth.response;
  const { appointmentId } = await params;
  if (!UUID.test(appointmentId)) return NextResponse.json({ message: 'Cita inválida' }, { status: 400 });

  try {
    const response = await fetch(`${getNvetApiUrl()}/api/chat/${encodeURIComponent(appointmentId)}/messages`, {
      headers: await getNvetAuthorizationHeaders(auth.accessToken),
      cache: 'no-store',
    });
    return relayMessage(response, 'No se pudieron obtener los mensajes');
  } catch {
    return NextResponse.json({ message: 'No se pudo contactar el servicio de chat' }, { status: 502 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ appointmentId: string }> }) {
  const auth = await authorize();
  if ('response' in auth) return auth.response;
  const { appointmentId } = await params;
  if (!UUID.test(appointmentId)) return NextResponse.json({ message: 'Cita inválida' }, { status: 400 });

  const body = await request.json().catch(() => null) as { content?: unknown } | null;
  const content = typeof body?.content === 'string' ? body.content.trim() : '';
  if (!content || content.length > 2000) {
    return NextResponse.json({ message: 'El mensaje debe tener entre 1 y 2000 caracteres' }, { status: 400 });
  }

  try {
    const response = await fetch(`${getNvetApiUrl()}/api/chat/${encodeURIComponent(appointmentId)}/messages`, {
      method: 'POST',
      headers: await getNvetAuthorizationHeaders(auth.accessToken, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ content }),
      cache: 'no-store',
    });
    return relayMessage(response, 'No se pudo enviar el mensaje');
  } catch {
    return NextResponse.json({ message: 'No se pudo contactar el servicio de chat' }, { status: 502 });
  }
}
