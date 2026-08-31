import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getNvetAuthorizationHeaders } from '@/lib/nvetcareapp/request';
import { getNvetApiUrl, NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { requireNvetClient } from '@/lib/nvetcareapp/client-booking';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

  const client = await requireNvetClient(accessToken);
  if (!client.ok) return NextResponse.json({ message: client.message }, { status: client.status });

  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ message: 'Veterinario inválido' }, { status: 400 });

  try {
    const response = await fetch(`${getNvetApiUrl()}/api/vets/${encodeURIComponent(id)}`, {
      headers: await getNvetAuthorizationHeaders(accessToken),
      cache: 'no-store',
    });
    const data = await response.json().catch(() => null) as unknown;

    if (!response.ok) {
      const message =
        data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
          ? data.message
          : 'No se pudo obtener el veterinario';
      return NextResponse.json({ message }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: 'No se pudo contactar el servicio veterinario' }, { status: 502 });
  }
}
