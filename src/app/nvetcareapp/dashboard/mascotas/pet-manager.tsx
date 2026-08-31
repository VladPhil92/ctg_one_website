'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, PawPrint, Plus, Weight } from 'lucide-react';
import type { NvetPet, NvetPetSpecies } from '@/lib/nvetcareapp/client-booking';
import { nvetFetchWithRefresh } from '../nvet-fetch';

const SPECIES_OPTIONS: Array<{ value: NvetPetSpecies; label: string }> = [
  { value: 'DOG', label: 'Perro' },
  { value: 'CAT', label: 'Gato' },
  { value: 'BIRD', label: 'Ave' },
  { value: 'RABBIT', label: 'Conejo' },
  { value: 'REPTILE', label: 'Reptil' },
  { value: 'FISH', label: 'Pez' },
  { value: 'OTHER', label: 'Otro' },
];

const SPECIES_LABELS = Object.fromEntries(SPECIES_OPTIONS.map((item) => [item.value, item.label]));

function formatBirthDate(value?: string | null): string {
  if (!value) return 'Fecha no registrada';
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return 'Fecha no registrada';
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export function PetManager({ initialPets }: { initialPets: NvetPet[] }) {
  const [pets, setPets] = useState(initialPets);
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<NvetPetSpecies>('DOG');
  const [breed, setBreed] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const sortedPets = useMemo(
    () => [...pets].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [pets],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const response = await nvetFetchWithRefresh('/api/nvetcareapp/client/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          species,
          breed: breed.trim(),
          birthDate,
          weight,
          notes: notes.trim(),
        }),
      });
      const payload = (await response.json().catch(() => null)) as NvetPet | { message?: string } | null;

      if (!response.ok) {
        setError(payload && 'message' in payload && payload.message ? payload.message : 'No se pudo registrar la mascota.');
        return;
      }

      const created = payload as NvetPet;
      setPets((current) => [...current, created]);
      setName('');
      setSpecies('DOG');
      setBreed('');
      setBirthDate('');
      setWeight('');
      setNotes('');
      setSuccess(`${created.name} quedó registrado en tu cuenta.`);
    } catch {
      setError('No se pudo completar el registro en este momento.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#34B27A]">Expediente base</p>
            <h2 className="mt-1 text-lg font-bold text-[#0D1B2A]">Mascotas registradas</h2>
          </div>
          <span className="rounded-full border border-[#0D1B2A]/10 bg-white px-3 py-1 text-xs font-semibold text-[#5B6670]">
            {pets.length} {pets.length === 1 ? 'mascota' : 'mascotas'}
          </span>
        </div>

        {sortedPets.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#34B27A]/30 bg-white p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#34B27A]/10 text-[#237754]">
              <PawPrint className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-base font-bold text-[#0D1B2A]">Aún no tienes mascotas registradas</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#5B6670]">
              Registra tu primera mascota para preparar futuras citas, pagos y seguimiento clínico sin depender de que ya exista oferta veterinaria activa.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {sortedPets.map((pet) => (
              <article key={pet.id} className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5 shadow-[0_1px_3px_rgba(13,27,42,0.04)]">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#34B27A]/10 text-[#237754]">
                    <PawPrint className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="truncate text-base font-bold text-[#0D1B2A]">{pet.name}</h3>
                      <span className="rounded-full bg-[#0D1B2A]/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#5B6670]">
                        {SPECIES_LABELS[pet.species] ?? pet.species}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[#5B6670]">{pet.breed || 'Raza no registrada'}</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-2 border-t border-[#0D1B2A]/5 pt-4 text-xs text-[#5B6670] sm:grid-cols-2">
                  <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" aria-hidden="true" />{formatBirthDate(pet.birthDate)}</span>
                  <span className="flex items-center gap-2"><Weight className="h-4 w-4" aria-hidden="true" />{pet.weight ? `${pet.weight} kg` : 'Peso no registrado'}</span>
                </div>
                {pet.notes && <p className="mt-3 rounded-xl bg-[#F7F8FA] p-3 text-xs leading-5 text-[#5B6670]">{pet.notes}</p>}
              </article>
            ))}
          </div>
        )}
      </section>

      <aside className="h-fit rounded-3xl border border-[#0D1B2A]/10 bg-white p-5 shadow-[0_1px_3px_rgba(13,27,42,0.04)] xl:sticky xl:top-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0D1B2A] text-white">
            <Plus className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#0D1B2A]">Registrar mascota</h2>
            <p className="text-xs text-[#5B6670]">Datos básicos de tu compañero.</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-xs font-semibold text-[#0D1B2A]">
            Nombre
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={50}
              className="mt-1.5 w-full rounded-xl border border-[#0D1B2A]/15 bg-white px-3 py-2.5 text-sm font-normal outline-none transition focus:border-[#34B27A] focus:ring-2 focus:ring-[#34B27A]/15"
              placeholder="Ej. Luna"
            />
          </label>

          <label className="block text-xs font-semibold text-[#0D1B2A]">
            Especie
            <select
              value={species}
              onChange={(event) => setSpecies(event.target.value as NvetPetSpecies)}
              className="mt-1.5 w-full rounded-xl border border-[#0D1B2A]/15 bg-white px-3 py-2.5 text-sm font-normal outline-none transition focus:border-[#34B27A] focus:ring-2 focus:ring-[#34B27A]/15"
            >
              {SPECIES_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>

          <label className="block text-xs font-semibold text-[#0D1B2A]">
            Raza <span className="font-normal text-[#5B6670]">(opcional)</span>
            <input
              value={breed}
              onChange={(event) => setBreed(event.target.value)}
              maxLength={100}
              className="mt-1.5 w-full rounded-xl border border-[#0D1B2A]/15 bg-white px-3 py-2.5 text-sm font-normal outline-none transition focus:border-[#34B27A] focus:ring-2 focus:ring-[#34B27A]/15"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <label className="block text-xs font-semibold text-[#0D1B2A]">
              Nacimiento
              <input
                type="date"
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#0D1B2A]/15 bg-white px-3 py-2.5 text-sm font-normal outline-none transition focus:border-[#34B27A] focus:ring-2 focus:ring-[#34B27A]/15"
              />
            </label>
            <label className="block text-xs font-semibold text-[#0D1B2A]">
              Peso (kg)
              <input
                type="number"
                min="0.01"
                max="999"
                step="0.01"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#0D1B2A]/15 bg-white px-3 py-2.5 text-sm font-normal outline-none transition focus:border-[#34B27A] focus:ring-2 focus:ring-[#34B27A]/15"
              />
            </label>
          </div>

          <label className="block text-xs font-semibold text-[#0D1B2A]">
            Notas <span className="font-normal text-[#5B6670]">(opcional)</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={500}
              rows={3}
              className="mt-1.5 w-full resize-none rounded-xl border border-[#0D1B2A]/15 bg-white px-3 py-2.5 text-sm font-normal outline-none transition focus:border-[#34B27A] focus:ring-2 focus:ring-[#34B27A]/15"
              placeholder="Alergias, cuidados o información útil."
            />
          </label>

          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          {success && <p role="status" className="rounded-xl border border-[#34B27A]/20 bg-[#34B27A]/10 px-3 py-2 text-xs text-[#237754]">{success}</p>}

          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#34B27A] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#289463] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {submitting ? 'Registrando...' : 'Registrar mascota'}
          </button>
        </form>
      </aside>
    </div>
  );
}
