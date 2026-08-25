import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { updateNvetAppointmentStatus, type NvetAppointmentStatus } from '@/lib/nvetcareapp/appointments';

const VALID_STATUSES: NvetAppointmentStatus[] = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED'];

// BFF route per ADR-003. The backend's own guard restricts this to the
// appointment's own vet and enforces the valid state-machine transitions
// itself — this only forwards the session's bearer token server-side.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const { id } = await params;
  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Cuerpo de solicitud inválido' }, { status: 400 });
  }

  if (!body.status || !VALID_STATUSES.includes(body.status as NvetAppointmentStatus)) {
    return NextResponse.json({ message: 'Estado inválido' }, { status: 400 });
  }

  const result = await updateNvetAppointmentStatus(accessToken, id, body.status as NvetAppointmentStatus);
  if (!result.ok) {
    return NextResponse.json({ message: 'No se pudo actualizar la cita' }, { status: result.status });
  }

  return NextResponse.json(result.appointment);
}
