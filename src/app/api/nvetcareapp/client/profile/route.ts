import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireNvetClient } from '@/lib/nvetcareapp/client-booking';
import { updateNvetClientProfile } from '@/lib/nvetcareapp/profile';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';

const NAME = /^[\p{L}\s'-]+$/u;
const PHONE_OR_EMPTY = /^(?:|\+?[1-9]\d{7,14})$/;

const profileUpdateSchema = z
  .object({
    firstName: z.string().trim().min(2).max(50).regex(NAME).optional(),
    lastName: z.string().trim().min(2).max(50).regex(NAME).optional(),
    phone: z.string().trim().max(16).regex(PHONE_OR_EMPTY).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'No hay cambios de perfil para guardar',
  });

export async function PATCH(request: Request) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

  const client = await requireNvetClient(accessToken);
  if (!client.ok) return NextResponse.json({ message: client.message }, { status: client.status });

  const raw = await request.json().catch(() => null);
  const parsed = profileUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Los datos del perfil son inválidos' }, { status: 400 });
  }

  // Identity and authority stop at the BFF boundary. The browser can update
  // only the Nvet-local profile fields above; userId/email/role/ctgUserId are
  // neither accepted nor forwarded.
  const result = await updateNvetClientProfile(accessToken, parsed.data);
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });

  return NextResponse.json(result.data);
}
