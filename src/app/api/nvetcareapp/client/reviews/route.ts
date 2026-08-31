import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { requireNvetClient } from '@/lib/nvetcareapp/client-booking';
import { createNvetClientReview, fetchNvetClientReviews } from '@/lib/nvetcareapp/client-fulfillment';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function authenticateClient() {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) return { ok: false as const, response: NextResponse.json({ message: 'No autenticado' }, { status: 401 }) };

  const client = await requireNvetClient(accessToken);
  if (!client.ok) {
    return { ok: false as const, response: NextResponse.json({ message: client.message }, { status: client.status }) };
  }

  return { ok: true as const, accessToken };
}

export async function GET() {
  const auth = await authenticateClient();
  if (!auth.ok) return auth.response;

  const result = await fetchNvetClientReviews(auth.accessToken);
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });

  return NextResponse.json({ reviews: result.reviews });
}

export async function POST(request: Request) {
  const auth = await authenticateClient();
  if (!auth.ok) return auth.response;

  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== 'object') {
    return NextResponse.json({ message: 'Solicitud inválida' }, { status: 400 });
  }

  const body = raw as Record<string, unknown>;
  const appointmentId = typeof body.appointmentId === 'string' ? body.appointmentId : '';
  const rating = typeof body.rating === 'number' ? body.rating : Number(body.rating);
  const comment = typeof body.comment === 'string' ? body.comment.trim() : '';

  if (!UUID.test(appointmentId) || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ message: 'Cita o calificación inválida' }, { status: 400 });
  }
  if (comment.length > 1000 || (comment.length > 0 && comment.length < 10)) {
    return NextResponse.json({ message: 'El comentario debe tener entre 10 y 1000 caracteres' }, { status: 400 });
  }

  // The browser supplies only review content and the appointment identifier.
  // The backend independently enforces ownership, COMPLETED status and one
  // review per appointment using the authenticated client identity.
  const result = await createNvetClientReview(auth.accessToken, {
    appointmentId,
    rating,
    ...(comment ? { comment } : {}),
  });
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });

  return NextResponse.json(result.review, { status: 201 });
}
