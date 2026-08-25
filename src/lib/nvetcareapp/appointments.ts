import { getNvetApiUrl } from './session';

export type NvetAppointmentStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';

// Mirrors the shape returned by GET /appointments (appointments.controller.ts
// + appointments.service.ts::getAppointments()). The backend scopes the
// query itself: clientId for a CLIENT caller, the vet's own vetId for a VET
// caller — this never re-filters, both roles can safely share one fetch.
export interface NvetAppointment {
  id: string;
  serviceType: string;
  date: string;
  time: string;
  address: string;
  status: NvetAppointmentStatus;
  paymentMethod: 'CTG' | 'PSE' | 'TRANSFER';
  amount: number;
  vet: { user: { firstName: string; lastName: string } };
  client: { firstName: string; lastName: string };
  pet: { name: string; species: string };
}

export type NvetAppointmentsResult =
  | { ok: true; appointments: NvetAppointment[] }
  | { ok: false; status: number };

export async function fetchNvetAppointments(accessToken: string): Promise<NvetAppointmentsResult> {
  let res: Response;
  try {
    res = await fetch(`${getNvetApiUrl()}/api/appointments`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
  } catch {
    return { ok: false, status: 502 };
  }

  if (!res.ok) {
    return { ok: false, status: res.status };
  }

  try {
    const appointments = (await res.json()) as NvetAppointment[];
    return { ok: true, appointments };
  } catch {
    return { ok: false, status: 502 };
  }
}

export type NvetUpdateStatusResult =
  | { ok: true; appointment: NvetAppointment }
  | { ok: false; status: number };

/**
 * PATCH /appointments/:id/status — the backend's own guard restricts this
 * to the appointment's own vet (RolesGuard(VET) + an ownership check in the
 * controller) and enforces the valid state-machine transitions itself
 * (appointments.service.ts::validateStatusTransition); this never
 * re-implements either check.
 */
export async function updateNvetAppointmentStatus(
  accessToken: string,
  appointmentId: string,
  status: NvetAppointmentStatus,
): Promise<NvetUpdateStatusResult> {
  let res: Response;
  try {
    res = await fetch(`${getNvetApiUrl()}/api/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  } catch {
    return { ok: false, status: 502 };
  }

  if (!res.ok) {
    return { ok: false, status: res.status };
  }

  try {
    const appointment = (await res.json()) as NvetAppointment;
    return { ok: true, appointment };
  } catch {
    return { ok: false, status: 502 };
  }
}
