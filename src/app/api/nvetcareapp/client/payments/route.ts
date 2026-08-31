import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { requireNvetClient } from '@/lib/nvetcareapp/client-booking';
import {
  fetchNvetClientTransactions,
  initiateNvetClientTransfer,
} from '@/lib/nvetcareapp/client-fulfillment';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function authenticateClient() {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) return { ok: false as const, response: NextResponse.json({ message: 'No autenticado' }, { status: 401 }) };

  const client = await requireNvetClient(accessToken);
  if (!client.ok) {
    return { ok: false as const, response: NextResponse.json({ message: client.message }, { status: client.status }) };
  }

  return { ok: true as const, accessToken };
}

export async function GET() {
  const auth = await authenticateClient();
  if (!auth.ok) return auth.response;

  const result = await fetchNvetClientTransactions(auth.accessToken);
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });

  return NextResponse.json({ transactions: result.transactions });
}

export async function POST(request: Request) {
  const auth = await authenticateClient();
  if (!auth.ok) return auth.response;

  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== 'object') {
    return NextResponse.json({ message: 'Solicitud inválida' }, { status: 400 });
  }

  const body = raw as Record<string, unknown>;
  const requestId = typeof body.requestId === 'string' ? body.requestId : '';
  const appointmentId = typeof body.appointmentId === 'string' ? body.appointmentId : '';

  if (!UUID.test(requestId) || !UUID.test(appointmentId)) {
    return NextResponse.json({ message: 'Identificador de pago o cita inválido' }, { status: 400 });
  }

  // Financial authority stays server-side: the browser never submits amount,
  // payment method, client identity or role. The helper re-reads the protected
  // appointment and derives the official amount before calling PaymentsService.
  const result = await initiateNvetClientTransfer(auth.accessToken, { requestId, appointmentId });
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });

  return NextResponse.json(result.transaction, { status: 201 });
}
