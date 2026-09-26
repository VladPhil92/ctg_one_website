import { NextResponse, type NextRequest } from 'next/server';
import { getNvetApiUrl } from '@/lib/nvetcareapp/session';

export async function POST(request: NextRequest) {
  const raw = await request.json().catch(() => null) as { email?: unknown } | null;
  const email = typeof raw?.email === 'string' ? raw.email.trim() : '';
  if (!email || email.length > 254) {
    return NextResponse.json({ message: 'Correo inválido' }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${getNvetApiUrl()}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await upstream.json().catch(() => null);
    return NextResponse.json(
      data ?? { message: 'Si el correo corresponde a una cuenta local activa, recibirás instrucciones para recuperar el acceso.' },
      { status: upstream.status },
    );
  } catch {
    return NextResponse.json({ message: 'No se pudo contactar el servicio de recuperación' }, { status: 502 });
  }
}
