import { getNvetApiUrl } from './session';

// Mirrors the shape returned by GET /appointments (appointments.controller.ts
// + appointments.service.ts::getAppointments()) for a CLIENT-role caller —
// the backend scopes the query to `clientId` itself, this never re-filters.
export interface NvetAppointment {
  id: string;
  serviceType: string;
  date: string;
  time: string;
  address: string;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
  paymentMethod: 'CTG' | 'PSE' | 'TRANSFER';
  amount: number;
  vet: { user: { firstName: string; lastName: string } };
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
