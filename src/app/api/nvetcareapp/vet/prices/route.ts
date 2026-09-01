import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { requireNvetVet } from '@/lib/nvetcareapp/vet-operations';
import { createNvetVetPrice } from '@/lib/nvetcareapp/vet-dashboard';

export async function POST(request: Request) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

  const vet = await requireNvetVet(accessToken);
  if (!vet.ok) return NextResponse.json({ message: vet.message }, { status: vet.status });

  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== 'object') return NextResponse.json({ message: 'Solicitud inválida' }, { status: 400 });

  const input = raw as Record<string, unknown>;
  const serviceName = typeof input.serviceName === 'string' ? input.serviceName.trim() : '';
  const priceCop = typeof input.priceCop === 'number' ? input.priceCop : Number(input.priceCop);
  const priceCtg = input.priceCtg === undefined || input.priceCtg === null ? undefined : Number(input.priceCtg);

  if (serviceName.length < 2 || serviceName.length > 100 || !Number.isFinite(priceCop) || priceCop < 5000 || priceCop > 10_000_000) {
    return NextResponse.json({ message: 'Nombre o precio COP inválido' }, { status: 400 });
  }
  if (priceCtg !== undefined && (!Number.isFinite(priceCtg) || priceCtg < 0)) {
    return NextResponse.json({ message: 'Precio CTG inválido' }, { status: 400 });
  }

  const result = await createNvetVetPrice(accessToken, {
    serviceName,
    priceCop,
    ...(priceCtg !== undefined ? { priceCtg } : {}),
  });
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });
  return NextResponse.json(result.data, { status: 201 });
}
