import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import {
  addNvetClinicalNotes,
  fetchNvetVetAppointmentDetail,
  requireNvetVet,
} from '@/lib/nvetcareapp/vet-operations';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

  const vet = await requireNvetVet(accessToken);
  if (!vet.ok) return NextResponse.json({ message: vet.message }, { status: vet.status });

  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ message: 'Cita inválida' }, { status: 400 });

  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== 'object') {
    return NextResponse.json({ message: 'Solicitud inválida' }, { status: 400 });
  }

  const body = raw as Record<string, unknown>;
  const diagnosis = typeof body.diagnosis === 'string' ? body.diagnosis.trim() : '';
  const treatment = typeof body.treatment === 'string' ? body.treatment.trim() : '';

  if (diagnosis.length < 3 || diagnosis.length > 2000 || treatment.length > 3000) {
    return NextResponse.json({ message: 'Diagnóstico o tratamiento inválido' }, { status: 400 });
  }

  const appointment = await fetchNvetVetAppointmentDetail(accessToken, id);
  if (!appointment.ok) {
    return NextResponse.json({ message: appointment.message }, { status: appointment.status });
  }
  if (appointment.data.status !== 'IN_PROGRESS') {
    return NextResponse.json(
      { message: 'Las notas clínicas solo se registran durante una atención en curso' },
      { status: 409 },
    );
  }

  const result = await addNvetClinicalNotes(accessToken, id, {
    diagnosis,
    ...(treatment ? { treatment } : {}),
  });
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });

  return NextResponse.json(result.data);
}
