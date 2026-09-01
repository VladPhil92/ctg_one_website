import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { requireNvetVet } from '@/lib/nvetcareapp/vet-operations';
import { deleteNvetVetPrice, updateNvetVetPrice } from '@/lib/nvetcareapp/vet-dashboard';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function authorize(id: string) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) return { response: NextResponse.json({ message: 'No autenticado' }, { status: 401 }) };
  if (!UUID.test(id)) return { response: NextResponse.json({ message: 'Servicio inválido' }, { status: 400 }) };
  const vet = await requireNvetVet(accessToken);
  if (!vet.ok) return { response: NextResponse.json({ message: vet.message }, { status: vet.status }) };
  return { accessToken };
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorize(id);
  if ('response' in auth) return auth.response;

  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== 'object') return NextResponse.json({ message: 'Solicitud inválida' }, { status: 400 });
  const body = raw as Record<string, unknown>;
  const input: { serviceName?: string; priceCop?: number; priceCtg?: number; isActive?: boolean } = {};

  if (body.serviceName !== undefined) {
    const serviceName = typeof body.serviceName === 'string' ? body.serviceName.trim() : '';
    if (serviceName.length < 2 || serviceName.length > 100) return NextResponse.json({ message: 'Nombre de servicio inválido' }, { status: 400 });
    input.serviceName = serviceName;
  }
  if (body.priceCop !== undefined) {
    const priceCop = typeof body.priceCop === 'number' ? body.priceCop : Number(body.priceCop);
    if (!Number.isFinite(priceCop) || priceCop < 5000 || priceCop > 10_000_000) return NextResponse.json({ message: 'Precio COP inválido' }, { status: 400 });
    input.priceCop = priceCop;
  }
  if (body.priceCtg !== undefined) {
    const priceCtg = typeof body.priceCtg === 'number' ? body.priceCtg : Number(body.priceCtg);
    if (!Number.isFinite(priceCtg) || priceCtg < 0) return NextResponse.json({ message: 'Precio CTG inválido' }, { status: 400 });
    input.priceCtg = priceCtg;
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== 'boolean') return NextResponse.json({ message: 'Estado de servicio inválido' }, { status: 400 });
    input.isActive = body.isActive;
  }
  if (Object.keys(input).length === 0) return NextResponse.json({ message: 'No hay cambios válidos' }, { status: 400 });

  const result = await updateNvetVetPrice(auth.accessToken, id, input);
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });
  return NextResponse.json(result.data);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorize(id);
  if ('response' in auth) return auth.response;

  const result = await deleteNvetVetPrice(auth.accessToken, id);
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });
  return new NextResponse(null, { status: 204 });
}
