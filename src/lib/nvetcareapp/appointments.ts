import { getNvetApiUrl } from './session';
import { getNvetAuthorizationHeaders } from './request';

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
  diagnosis?: string | null;
  treatment?: string | null;
  notes?: string | null;
  completedAt?: string | null;
  vet: { user: { firstName: string; lastName: string } };
  client: { firstName: string; lastName: string };
  pet: { id: string; name: string; species: string };
}

export type NvetAppointmentsResult =
  | { ok: true; appointments: NvetAppointment[] }
  | { ok: false; status: number };

export async function fetchNvetAppointments(accessToken: string): Promise<NvetAppointmentsResult> {
  let res: Response;
  try {
    res = await fetch(`${getNvetApiUrl()}/api/appointments`, {
      headers: await getNvetAuthorizationHeaders(accessToken),
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
 * PATCH /appointments/:id/status — backend ownership remains authoritative.
 * The CTG One BFF additionally narrows the public web flow to paid
 * CONFIRMED → IN_PROGRESS → COMPLETED service operations.
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
      headers: await getNvetAuthorizationHeaders(accessToken, { 'Content-Type': 'application/json' }),
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
