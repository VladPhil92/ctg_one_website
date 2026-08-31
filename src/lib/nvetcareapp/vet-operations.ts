import { getNvetApiUrl } from './session';
import { fetchNvetCurrentUser, type NvetCurrentUser } from './user';
import type { NvetAppointment, NvetAppointmentStatus } from './appointments';

export type NvetVetTransactionStatus = 'PENDING' | 'VERIFYING' | 'CONFIRMED' | 'LIQUIDATED' | 'DISPUTED' | 'FAILED';

export interface NvetVetTransaction {
  id: string;
  appointmentId: string;
  amountCop: number;
  commissionAmount?: number;
  paymentMethod: 'CTG' | 'PSE' | 'TRANSFER';
  status: NvetVetTransactionStatus;
  transferCode?: string | null;
  verifiedAt?: string | null;
  liquidatedAt?: string | null;
  createdAt?: string;
}

export interface NvetVetAppointmentDetail extends NvetAppointment {
  diagnosis?: string | null;
  treatment?: string | null;
  notes?: string | null;
  transaction?: NvetVetTransaction | null;
}

type NvetResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

function backendMessage(value: unknown, fallback: string): string {
  if (!value || typeof value !== 'object') return fallback;
  const message = (value as { message?: unknown }).message;
  if (typeof message === 'string' && message.trim()) return message;
  if (Array.isArray(message)) {
    const joined = message.filter((item): item is string => typeof item === 'string').join('. ');
    if (joined) return joined;
  }
  return fallback;
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function requireNvetVet(accessToken: string): Promise<NvetResult<NvetCurrentUser>> {
  const currentUser = await fetchNvetCurrentUser(accessToken);
  if (!currentUser.ok) {
    return {
      ok: false,
      status: currentUser.status,
      message: currentUser.status === 401 ? 'No autenticado' : 'No se pudo validar la sesión de Nvet Care',
    };
  }
  if (currentUser.user.role !== 'VET') {
    return { ok: false, status: 403, message: 'Esta operación está disponible únicamente para veterinarios' };
  }
  return { ok: true, data: currentUser.user };
}

export async function fetchNvetVetTransactions(
  accessToken: string,
): Promise<NvetResult<NvetVetTransaction[]>> {
  try {
    const response = await fetch(`${getNvetApiUrl()}/api/payments/transactions?limit=100&offset=0`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      return { ok: false, status: response.status, message: backendMessage(data, 'No se pudieron consultar los pagos asignados') };
    }
    if (!data || typeof data !== 'object' || !Array.isArray((data as { results?: unknown[] }).results)) {
      return { ok: false, status: 502, message: 'El servicio de pagos devolvió una respuesta inválida' };
    }
    return { ok: true, data: (data as { results: NvetVetTransaction[] }).results };
  } catch {
    return { ok: false, status: 502, message: 'No se pudo contactar el servicio de pagos' };
  }
}

export async function fetchNvetVetAppointmentDetail(
  accessToken: string,
  appointmentId: string,
): Promise<NvetResult<NvetVetAppointmentDetail>> {
  try {
    const response = await fetch(`${getNvetApiUrl()}/api/appointments/${encodeURIComponent(appointmentId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      return { ok: false, status: response.status, message: backendMessage(data, 'No se pudo consultar la cita') };
    }
    if (!data || typeof data !== 'object') {
      return { ok: false, status: 502, message: 'El servicio de citas devolvió una respuesta inválida' };
    }
    return { ok: true, data: data as NvetVetAppointmentDetail };
  } catch {
    return { ok: false, status: 502, message: 'No se pudo contactar el servicio de citas' };
  }
}

export async function submitNvetTransferEvidence(
  accessToken: string,
  transactionId: string,
  input: { transferCode: string; file: File },
): Promise<NvetResult<NvetVetTransaction>> {
  const form = new FormData();
  form.set('transferCode', input.transferCode);
  form.set('file', input.file, input.file.name);

  try {
    const response = await fetch(
      `${getNvetApiUrl()}/api/payments/transactions/${encodeURIComponent(transactionId)}/verify-transfer`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      },
    );
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      return { ok: false, status: response.status, message: backendMessage(data, 'No se pudo registrar el comprobante') };
    }
    return { ok: true, data: data as NvetVetTransaction };
  } catch {
    return { ok: false, status: 502, message: 'No se pudo contactar el servicio de verificación' };
  }
}

export async function addNvetClinicalNotes(
  accessToken: string,
  appointmentId: string,
  input: { diagnosis: string; treatment?: string },
): Promise<NvetResult<NvetVetAppointmentDetail>> {
  try {
    const response = await fetch(
      `${getNvetApiUrl()}/api/appointments/${encodeURIComponent(appointmentId)}/clinical-notes`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      },
    );
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      return { ok: false, status: response.status, message: backendMessage(data, 'No se pudieron guardar las notas clínicas') };
    }
    return { ok: true, data: data as NvetVetAppointmentDetail };
  } catch {
    return { ok: false, status: 502, message: 'No se pudo contactar el servicio clínico' };
  }
}

export function isPaymentReadyForService(status?: NvetVetTransactionStatus): boolean {
  return status === 'CONFIRMED' || status === 'LIQUIDATED';
}

export function isAllowedVetServiceTransition(
  current: NvetAppointmentStatus,
  next: NvetAppointmentStatus,
): boolean {
  return (current === 'CONFIRMED' && next === 'IN_PROGRESS') ||
    (current === 'IN_PROGRESS' && next === 'COMPLETED');
}
