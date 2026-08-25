import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetChatMessages, sendNvetChatMessage } from '@/lib/nvetcareapp/chat';

// BFF route per ADR-003. The backend's own ChatMembershipGuard
// (participant-only, ADMIN always allowed) and, on POST, EmailVerifiedGuard
// are authoritative — this only forwards the session's bearer token
// server-side and, on POST, validates the content length as defense in
// depth (mirrors chat's SendMessageDto: 1-2000 chars) before forwarding.
export async function GET(request: NextRequest, { params }: { params: Promise<{ appointmentId: string }> }) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const { appointmentId } = await params;
  const result = await fetchNvetChatMessages(accessToken, appointmentId);
  if (!result.ok) {
    const message = result.status === 403 ? 'No eres participante de este chat' : 'No se pudieron obtener los mensajes';
    return NextResponse.json({ message }, { status: result.status });
  }

  return NextResponse.json(result.data);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ appointmentId: string }> }) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const { appointmentId } = await params;
  let body: { content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Cuerpo de solicitud inválido' }, { status: 400 });
  }

  const content = body.content?.trim() ?? '';
  if (content.length < 1 || content.length > 2000) {
    return NextResponse.json({ message: 'El mensaje debe tener entre 1 y 2000 caracteres' }, { status: 400 });
  }

  const result = await sendNvetChatMessage(accessToken, appointmentId, content);
  if (!result.ok) {
    return NextResponse.json({ message: result.message ?? 'No se pudo enviar el mensaje' }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
