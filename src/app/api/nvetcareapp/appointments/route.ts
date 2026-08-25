import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetAppointments } from '@/lib/nvetcareapp/appointments';

// BFF route per ADR-003. The backend scopes the result to the caller's own
// appointments (client) or their own agenda (vet) — this never re-filters,
// it only forwards the session's bearer token server-side.
export async function GET() {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const result = await fetchNvetAppointments(accessToken);
  if (!result.ok) {
    return NextResponse.json({ message: 'No se pudieron obtener las citas' }, { status: result.status });
  }

  return NextResponse.json(result.appointments);
}
