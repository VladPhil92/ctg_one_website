import { NextResponse, type NextRequest } from 'next/server';
import { getNvetApiUrl } from '@/lib/nvetcareapp/session';

export async function POST(request: NextRequest) {
  const raw = await request.json().catch(() => null) as { token?: unknown; newPassword?: unknown } | null;
  const token = typeof raw?.token === 'string' ? raw.token.trim() : '';
  const newPassword = typeof raw?.newPassword === 'string' ? raw.newPassword : '';
  if (token.length < 20 || token.length > 200 || newPassword.length < 12 || newPassword.length > 128) {
    return NextResponse.json({ message: 'Token o contraseña inválidos' }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${getNvetApiUrl()}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });
    const data = await upstream.json().catch(() => null);
    return NextResponse.json(data ?? { message: upstream.ok ? 'Contraseña actualizada' : 'No se pudo actualizar la contraseña' }, { status: upstream.status });
  } catch {
    return NextResponse.json({ message: 'No se pudo contactar el servicio de recuperación' }, { status: 502 });
  }
}
