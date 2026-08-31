import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import {
  createNvetPet,
  fetchNvetPets,
  requireNvetClient,
  type CreateNvetPetInput,
  type NvetPetSpecies,
} from '@/lib/nvetcareapp/client-booking';

const SPECIES = new Set<NvetPetSpecies>(['DOG', 'CAT', 'BIRD', 'RABBIT', 'REPTILE', 'FISH', 'OTHER']);

async function clientToken() {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) return { ok: false as const, response: NextResponse.json({ message: 'No autenticado' }, { status: 401 }) };

  const client = await requireNvetClient(accessToken);
  if (!client.ok) {
    return { ok: false as const, response: NextResponse.json({ message: client.message }, { status: client.status }) };
  }
  return { ok: true as const, accessToken };
}

export async function GET() {
  const session = await clientToken();
  if (!session.ok) return session.response;

  const result = await fetchNvetPets(session.accessToken);
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });
  return NextResponse.json(result.data);
}

export async function POST(request: Request) {
  const session = await clientToken();
  if (!session.ok) return session.response;

  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== 'object') {
    return NextResponse.json({ message: 'Solicitud inválida' }, { status: 400 });
  }

  const body = raw as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const species = typeof body.species === 'string' ? body.species : '';
  const breed = typeof body.breed === 'string' ? body.breed.trim() : '';
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  const birthDate = typeof body.birthDate === 'string' ? body.birthDate : '';
  const weight = body.weight === '' || body.weight === null || body.weight === undefined ? undefined : Number(body.weight);

  if (!name || name.length > 50 || !SPECIES.has(species as NvetPetSpecies)) {
    return NextResponse.json({ message: 'Nombre o especie inválidos' }, { status: 400 });
  }
  if (breed.length > 100 || notes.length > 500) {
    return NextResponse.json({ message: 'Los datos de la mascota superan el límite permitido' }, { status: 400 });
  }
  if (weight !== undefined && (!Number.isFinite(weight) || weight < 0.01 || weight > 999)) {
    return NextResponse.json({ message: 'El peso debe estar entre 0.01 y 999 kg' }, { status: 400 });
  }
  if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return NextResponse.json({ message: 'La fecha de nacimiento es inválida' }, { status: 400 });
  }

  const input: CreateNvetPetInput = {
    name,
    species: species as NvetPetSpecies,
    ...(breed ? { breed } : {}),
    ...(notes ? { notes } : {}),
    ...(birthDate ? { birthDate } : {}),
    ...(weight !== undefined ? { weight } : {}),
  };

  const result = await createNvetPet(session.accessToken, input);
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });
  return NextResponse.json(result.data, { status: 201 });
}
