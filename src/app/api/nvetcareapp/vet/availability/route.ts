import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { requireNvetVet } from '@/lib/nvetcareapp/vet-operations';
import { toggleNvetVetAvailability } from '@/lib/nvetcareapp/vet-dashboard';

export async function POST() {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

  const vet = await requireNvetVet(accessToken);
  if (!vet.ok) return NextResponse.json({ message: vet.message }, { status: vet.status });

  const result = await toggleNvetVetAvailability(accessToken);
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });
  return NextResponse.json(result.data);
}
