import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetVetSchedule, requireNvetClient } from '@/lib/nvetcareapp/client-booking';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function currentColombiaDate(): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(`${value.year}-${value.month}-${value.day}T00:00:00.000Z`);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

  const client = await requireNvetClient(accessToken);
  if (!client.ok) return NextResponse.json({ message: client.message }, { status: client.status });

  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ message: 'Veterinario inválido' }, { status: 400 });

  const date = new URL(request.url).searchParams.get('date') ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ message: 'Fecha inválida' }, { status: 400 });
  }

  const today = currentColombiaDate();
  const requested = new Date(`${date}T00:00:00.000Z`);
  const horizon = new Date(today);
  horizon.setUTCDate(horizon.getUTCDate() + 90);
  if (Number.isNaN(requested.getTime()) || requested < today || requested > horizon) {
    return NextResponse.json({ message: 'La fecha debe estar dentro de los próximos 90 días' }, { status: 400 });
  }

  const result = await fetchNvetVetSchedule(id, date);
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });

  return NextResponse.json(result.data);
}
