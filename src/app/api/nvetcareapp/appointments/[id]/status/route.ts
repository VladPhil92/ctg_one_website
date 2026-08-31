import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { updateNvetAppointmentStatus, type NvetAppointmentStatus } from '@/lib/nvetcareapp/appointments';
import {
  fetchNvetVetAppointmentDetail,
  isAllowedVetServiceTransition,
  isPaymentReadyForService,
  requireNvetVet,
} from '@/lib/nvetcareapp/vet-operations';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SERVICE_STATUSES: NvetAppointmentStatus[] = ['IN_PROGRESS', 'COMPLETED'];

// Web service-operation state machine. Payment confirmation remains an admin /
// provider responsibility: a VET cannot move PENDING -> CONFIRMED through this
// BFF. Starting care requires a confirmed/liquidated transaction and closing
// care requires a diagnosis already persisted on the protected appointment.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const vet = await requireNvetVet(accessToken);
  if (!vet.ok) return NextResponse.json({ message: vet.message }, { status: vet.status });

  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ message: 'Cita inválida' }, { status: 400 });

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Cuerpo de solicitud inválido' }, { status: 400 });
  }

  if (!body.status || !SERVICE_STATUSES.includes(body.status as NvetAppointmentStatus)) {
    return NextResponse.json({ message: 'Estado de operación inválido' }, { status: 400 });
  }

  const detail = await fetchNvetVetAppointmentDetail(accessToken, id);
  if (!detail.ok) return NextResponse.json({ message: detail.message }, { status: detail.status });

  const next = body.status as NvetAppointmentStatus;
  if (!isAllowedVetServiceTransition(detail.data.status, next)) {
    return NextResponse.json({ message: 'Transición de servicio inválida' }, { status: 409 });
  }

  if (next === 'IN_PROGRESS' && !isPaymentReadyForService(detail.data.transaction?.status)) {
    return NextResponse.json(
      { message: 'La atención solo puede iniciar después de la confirmación del pago' },
      { status: 409 },
    );
  }

  if (next === 'COMPLETED' && (!detail.data.diagnosis || detail.data.diagnosis.trim().length < 3)) {
    return NextResponse.json(
      { message: 'Registra el diagnóstico clínico antes de completar la atención' },
      { status: 409 },
    );
  }

  const result = await updateNvetAppointmentStatus(accessToken, id, next);
  if (!result.ok) {
    return NextResponse.json({ message: 'No se pudo actualizar la cita' }, { status: result.status });
  }

  return NextResponse.json(result.appointment);
}
