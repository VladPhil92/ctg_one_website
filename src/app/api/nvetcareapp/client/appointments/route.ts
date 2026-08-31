import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { createNvetClientAppointment, requireNvetClient } from '@/lib/nvetcareapp/client-booking';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function POST(request: Request) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

  const client = await requireNvetClient(accessToken);
  if (!client.ok) return NextResponse.json({ message: client.message }, { status: client.status });

  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== 'object') {
    return NextResponse.json({ message: 'Solicitud inválida' }, { status: 400 });
  }

  const body = raw as Record<string, unknown>;
  const vetId = typeof body.vetId === 'string' ? body.vetId : '';
  const petId = typeof body.petId === 'string' ? body.petId : '';
  const priceId = typeof body.priceId === 'string' ? body.priceId : '';
  const date = typeof body.date === 'string' ? body.date : '';
  const time = typeof body.time === 'string' ? body.time : '';
  const address = typeof body.address === 'string' ? body.address.trim() : '';
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';

  if (!UUID.test(vetId) || !UUID.test(petId) || !UUID.test(priceId)) {
    return NextResponse.json({ message: 'Veterinario, mascota o servicio inválido' }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !TIME.test(time)) {
    return NextResponse.json({ message: 'Fecha u hora inválida' }, { status: 400 });
  }
  if (address.length < 5 || address.length > 250 || notes.length > 500) {
    return NextResponse.json({ message: 'Dirección o notas inválidas' }, { status: 400 });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const requested = new Date(`${date}T00:00:00.000Z`);
  const horizon = new Date(today);
  horizon.setUTCDate(horizon.getUTCDate() + 90);
  if (Number.isNaN(requested.getTime()) || requested < today || requested > horizon) {
    return NextResponse.json({ message: 'La fecha debe estar dentro de los próximos 90 días' }, { status: 400 });
  }

  // Do not accept amount, serviceType, userId, role or payment method from the
  // browser. The server resolves the current price catalog and forwards the
  // authenticated client identity exclusively from the httpOnly session JWT.
  const result = await createNvetClientAppointment(accessToken, {
    vetId,
    petId,
    priceId,
    date,
    time,
    address,
    ...(notes ? { notes } : {}),
  });
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });

  return NextResponse.json(result.data, { status: 201 });
}
