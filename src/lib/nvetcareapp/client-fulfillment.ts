import { getNvetApiUrl } from './session';

export type NvetTransactionStatus = 'PENDING' | 'VERIFYING' | 'CONFIRMED' | 'LIQUIDATED' | 'DISPUTED' | 'FAILED';

export interface NvetClientTransaction {
  id: string;
  appointmentId: string;
  amountCop: number;
  paymentMethod: 'CTG' | 'PSE' | 'TRANSFER';
  status: NvetTransactionStatus;
  createdAt?: string;
  verifiedAt?: string | null;
  liquidatedAt?: string | null;
}

export interface NvetClientReview {
  id: string;
  appointmentId: string;
  rating: number;
  comment?: string | null;
  createdAt?: string;
}

type ApiFailure = { ok: false; status: number; message: string };

async function readMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(' ');
    if (typeof body.message === 'string') return body.message;
  } catch {
    // Keep the public fallback; never surface an upstream transport payload.
  }
  return fallback;
}

export async function fetchNvetClientTransactions(
  accessToken: string,
): Promise<{ ok: true; transactions: NvetClientTransaction[] } | ApiFailure> {
  let response: Response;
  try {
    response = await fetch(`${getNvetApiUrl()}/api/payments/transactions?limit=100&offset=0`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
  } catch {
    return { ok: false, status: 502, message: 'No se pudo consultar el estado de los pagos.' };
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: await readMessage(response, 'No se pudo consultar el estado de los pagos.'),
    };
  }

  try {
    const body = (await response.json()) as { results?: NvetClientTransaction[] };
    return { ok: true, transactions: Array.isArray(body.results) ? body.results : [] };
  } catch {
    return { ok: false, status: 502, message: 'La respuesta de pagos no fue válida.' };
  }
}

export async function fetchNvetClientReviews(
  accessToken: string,
): Promise<{ ok: true; reviews: NvetClientReview[] } | ApiFailure> {
  let response: Response;
  try {
    response = await fetch(`${getNvetApiUrl()}/api/reviews/me?limit=100&offset=0`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
  } catch {
    return { ok: false, status: 502, message: 'No se pudieron consultar tus calificaciones.' };
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: await readMessage(response, 'No se pudieron consultar tus calificaciones.'),
    };
  }

  try {
    const body = (await response.json()) as { results?: Array<NvetClientReview & { appointment?: { id?: string } }> };
    const reviews = Array.isArray(body.results)
      ? body.results.map((review) => ({
          ...review,
          appointmentId: review.appointmentId ?? review.appointment?.id ?? '',
        })).filter((review) => Boolean(review.appointmentId))
      : [];
    return { ok: true, reviews };
  } catch {
    return { ok: false, status: 502, message: 'La respuesta de calificaciones no fue válida.' };
  }
}

export async function initiateNvetClientTransfer(
  accessToken: string,
  input: { requestId: string; appointmentId: string },
): Promise<{ ok: true; transaction: NvetClientTransaction } | ApiFailure> {
  let appointmentResponse: Response;
  try {
    appointmentResponse = await fetch(`${getNvetApiUrl()}/api/appointments/${input.appointmentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
  } catch {
    return { ok: false, status: 502, message: 'No se pudo validar la cita antes del pago.' };
  }

  if (!appointmentResponse.ok) {
    return {
      ok: false,
      status: appointmentResponse.status,
      message: await readMessage(appointmentResponse, 'No se pudo validar la cita antes del pago.'),
    };
  }

  const appointment = (await appointmentResponse.json().catch(() => null)) as
    | { id?: string; amount?: number; paymentMethod?: string; status?: string }
    | null;

  if (!appointment || appointment.id !== input.appointmentId || typeof appointment.amount !== 'number') {
    return { ok: false, status: 502, message: 'La cita no contiene un monto verificable.' };
  }
  if (appointment.paymentMethod !== 'TRANSFER') {
    return { ok: false, status: 409, message: 'Este flujo solo admite transferencias verificables.' };
  }
  if (appointment.status !== 'PENDING') {
    return { ok: false, status: 409, message: 'La cita ya no está pendiente de inicio de pago.' };
  }

  let paymentResponse: Response;
  try {
    paymentResponse = await fetch(`${getNvetApiUrl()}/api/payments/process`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': input.requestId,
      },
      body: JSON.stringify({
        appointmentId: input.appointmentId,
        paymentMethod: 'TRANSFER',
        amountCop: appointment.amount,
        idempotencyKey: input.requestId,
      }),
    });
  } catch {
    return { ok: false, status: 502, message: 'No se pudo iniciar la verificación del pago.' };
  }

  if (!paymentResponse.ok) {
    return {
      ok: false,
      status: paymentResponse.status,
      message: await readMessage(paymentResponse, 'No se pudo iniciar la verificación del pago.'),
    };
  }

  try {
    return { ok: true, transaction: (await paymentResponse.json()) as NvetClientTransaction };
  } catch {
    return { ok: false, status: 502, message: 'La respuesta de pago no fue válida.' };
  }
}

export async function createNvetClientReview(
  accessToken: string,
  input: { appointmentId: string; rating: number; comment?: string },
): Promise<{ ok: true; review: NvetClientReview } | ApiFailure> {
  let response: Response;
  try {
    response = await fetch(`${getNvetApiUrl()}/api/reviews`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    return { ok: false, status: 502, message: 'No se pudo enviar tu calificación.' };
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: await readMessage(response, 'No se pudo enviar tu calificación.'),
    };
  }

  try {
    return { ok: true, review: (await response.json()) as NvetClientReview };
  } catch {
    return { ok: false, status: 502, message: 'La respuesta de calificación no fue válida.' };
  }
}
