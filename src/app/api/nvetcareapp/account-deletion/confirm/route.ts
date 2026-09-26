import { NextResponse, type NextRequest } from 'next/server';
import { getNvetApiUrl } from '@/lib/nvetcareapp/session';

export async function POST(request: NextRequest) {
  const raw = await request.json().catch(() => null) as { email?: unknown; verificationCode?: unknown } | null;
  const email = typeof raw?.email === 'string' ? raw.email.trim() : '';
  const verificationCode = typeof raw?.verificationCode === 'string' ? raw.verificationCode.trim() : '';
  if (!email || email.length > 254 || !/^\d{10}\.[a-f0-9]{32}$/i.test(verificationCode)) {
    return NextResponse.json({ message: 'Correo o código de verificación inválido' }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${getNvetApiUrl()}/api/privacy/account-deletion/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, verificationCode }),
    });
    const html = await upstream.text();
    const success = upstream.ok && /Cuenta eliminada/i.test(html);
    return NextResponse.json(
      {
        message: success
          ? 'La cuenta Nvet Care fue eliminada. Los registros que deban conservarse permanecen limitados o pseudonimizados según la política vigente.'
          : 'No se pudo completar la eliminación. El código puede ser inválido, haber expirado o existir obligaciones pendientes.',
      },
      { status: upstream.status },
    );
  } catch {
    return NextResponse.json({ message: 'No se pudo contactar el servicio de eliminación de cuenta' }, { status: 502 });
  }
}
