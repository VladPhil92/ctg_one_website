import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import {
  requireNvetClient,
  updateNvetPetHealthProfile,
  type NvetPetHealthProfileInput,
} from '@/lib/nvetcareapp/client-booking';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const optionalDate = z.string().regex(DATE).optional();
const optionalText = (max: number) => z.string().trim().max(max).optional();
const recordId = z.string().regex(UUID);

const healthProfileSchema = z
  .object({
    allergies: z
      .array(
        z
          .object({
            id: recordId,
            substance: z.string().trim().min(1).max(100),
            reaction: optionalText(250),
            severity: z.enum(['MILD', 'MODERATE', 'SEVERE']),
            notedAt: optionalDate,
          })
          .strict(),
      )
      .max(50),
    medications: z
      .array(
        z
          .object({
            id: recordId,
            name: z.string().trim().min(1).max(120),
            dosage: optionalText(120),
            frequency: optionalText(120),
            startedAt: optionalDate,
            endedAt: optionalDate,
            active: z.boolean(),
            notes: optionalText(300),
          })
          .strict(),
      )
      .max(50),
    conditions: z
      .array(
        z
          .object({
            id: recordId,
            name: z.string().trim().min(1).max(120),
            diagnosedAt: optionalDate,
            status: z.enum(['ACTIVE', 'RESOLVED', 'UNKNOWN']),
            notes: optionalText(300),
          })
          .strict(),
      )
      .max(50),
    vaccinations: z
      .array(
        z
          .object({
            id: recordId,
            vaccine: z.string().trim().min(1).max(120),
            administeredAt: z.string().regex(DATE),
            nextDueAt: optionalDate,
            batch: optionalText(80),
            provider: optionalText(120),
          })
          .strict(),
      )
      .max(100),
    deworming: z
      .array(
        z
          .object({
            id: recordId,
            product: z.string().trim().min(1).max(120),
            administeredAt: z.string().regex(DATE),
            nextDueAt: optionalDate,
            notes: optionalText(300),
          })
          .strict(),
      )
      .max(100),
    preventiveCare: z
      .array(
        z
          .object({
            id: recordId,
            type: z.enum(['CHECKUP', 'VACCINATION', 'DEWORMING', 'DENTAL', 'LAB', 'OTHER']),
            title: z.string().trim().min(1).max(120),
            dueAt: z.string().regex(DATE),
            status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']),
            notes: optionalText(300),
          })
          .strict(),
      )
      .max(100),
  })
  .strict();

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

  const client = await requireNvetClient(accessToken);
  if (!client.ok) return NextResponse.json({ message: client.message }, { status: client.status });

  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ message: 'Mascota inválida' }, { status: 400 });

  const raw = await request.json().catch(() => null);
  const parsed = healthProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ message: 'El expediente preventivo contiene datos inválidos' }, { status: 400 });
  }

  // Browser authority stops here. Ownership, source and schema version are not
  // accepted from the request: Nvet derives the owner from the JWT and owns
  // the persisted OWNER_REPORTED/versioned envelope.
  const input = parsed.data as NvetPetHealthProfileInput;
  const result = await updateNvetPetHealthProfile(accessToken, id, input);
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });

  return NextResponse.json(result.data);
}
