import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { requireNvetVet } from '@/lib/nvetcareapp/vet-operations';
import { deleteNvetScheduleException, upsertNvetScheduleException } from '@/lib/nvetcareapp/vet-dashboard';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^(\d{2}):(\d{2})$/;

function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function isValidTime(value: string): boolean {
  const match = TIME.exec(value);
  if (!match) return false;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

async function authorize(date: string) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) return { response: NextResponse.json({ message: 'No autenticado' }, { status: 401 }) };
  if (!isValidIsoDate(date)) {
    return { response: NextResponse.json({ message: 'Fecha inválida' }, { status: 400 }) };
  }
  const vet = await requireNvetVet(accessToken);
  if (!vet.ok) return { response: NextResponse.json({ message: vet.message }, { status: vet.status }) };
  return { accessToken };
}

export async function PUT(request: Request, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const auth = await authorize(date);
  if ('response' in auth) return auth.response;

  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== 'object') return NextResponse.json({ message: 'Solicitud inválida' }, { status: 400 });
  const body = raw as Record<string, unknown>;
  const input: { isAvailable?: boolean; reason?: string; startTime?: string; endTime?: string } = {};

  if (body.isAvailable !== undefined) {
    if (typeof body.isAvailable !== 'boolean') return NextResponse.json({ message: 'Disponibilidad inválida' }, { status: 400 });
    input.isAvailable = body.isAvailable;
  }
  if (body.reason !== undefined) {
    if (typeof body.reason !== 'string' || body.reason.trim().length > 250) return NextResponse.json({ message: 'Motivo inválido' }, { status: 400 });
    input.reason = body.reason.trim();
  }
  if (body.startTime !== undefined) {
    if (typeof body.startTime !== 'string' || !isValidTime(body.startTime)) return NextResponse.json({ message: 'Hora inicial inválida' }, { status: 400 });
    input.startTime = body.startTime;
  }
  if (body.endTime !== undefined) {
    if (typeof body.endTime !== 'string' || !isValidTime(body.endTime)) return NextResponse.json({ message: 'Hora final inválida' }, { status: 400 });
    input.endTime = body.endTime;
  }
  if (input.startTime && input.endTime && input.startTime >= input.endTime) {
    return NextResponse.json({ message: 'La hora final debe ser posterior a la hora inicial' }, { status: 400 });
  }

  const result = await upsertNvetScheduleException(auth.accessToken, date, input);
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });
  return NextResponse.json(result.data);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const auth = await authorize(date);
  if ('response' in auth) return auth.response;

  const result = await deleteNvetScheduleException(auth.accessToken, date);
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });
  return new NextResponse(null, { status: 204 });
}
