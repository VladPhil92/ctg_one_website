import { NextResponse, type NextRequest } from 'next/server';
import { getNvetApiUrl } from '@/lib/nvetcareapp/session';

export async function POST(request: NextRequest) {
  const raw = await request.json().catch(() => null) as { email?: unknown } | null;
  const email = typeof raw?.email === 'string' ? raw.email.trim() : '';
  if (!email || email.length > 254) {
    return NextResponse.json({ message: 'Correo inválido' }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${getNvetApiUrl()}/api/privacy/account-deletion/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const text = await upstream.text();
    // Upstream returns HTML by design. Do not reflect it into the CTG One UI;
    // return only the generic privacy-preserving outcome.
    return NextResponse.json(
      {
        message: upstream.ok
          ? 'Si el correo corresponde a una cuenta activa elegible, enviaremos un código de verificación para continuar.'
          : 'No se pudo procesar la solicitud en este momento.',
      },
      { status: upstream.status },
    );
  } catch {
    return NextResponse.json({ message: 'No se pudo contactar el servicio de eliminación de cuenta' }, { status: 502 });
  }
}
