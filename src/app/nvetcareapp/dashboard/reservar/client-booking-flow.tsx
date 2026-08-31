'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  MapPin,
  PawPrint,
  Search,
  Stethoscope,
} from 'lucide-react';
import type {
  NvetAvailabilitySlot,
  NvetCreatedAppointment,
  NvetPet,
  NvetPetSpecies,
  NvetVetPrice,
  NvetVetSearchItem,
  NvetVetSearchResponse,
} from '@/lib/nvetcareapp/client-booking';

const SPECIES: Array<{ value: NvetPetSpecies; label: string }> = [
  { value: 'DOG', label: 'Perro' },
  { value: 'CAT', label: 'Gato' },
  { value: 'BIRD', label: 'Ave' },
  { value: 'RABBIT', label: 'Conejo' },
  { value: 'REPTILE', label: 'Reptil' },
  { value: 'FISH', label: 'Pez' },
  { value: 'OTHER', label: 'Otra' },
];

type BookingAttempt = { fingerprint: string; requestId: string };

function formatCop(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

function colombiaDate(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function messageFrom(value: unknown, fallback: string): string {
  if (value && typeof value === 'object' && 'message' in value) {
    const message = (value as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

function vetName(vet: NvetVetSearchItem): string {
  return [vet.user.firstName, vet.user.lastName].filter(Boolean).join(' ').trim() || 'Veterinario Nvet Care';
}

export function ClientBookingFlow({ firstName }: { firstName: string }) {
  const [pets, setPets] = useState<NvetPet[]>([]);
  const [vets, setVets] = useState<NvetVetSearchItem[]>([]);
  const [prices, setPrices] = useState<NvetVetPrice[]>([]);
  const [slots, setSlots] = useState<NvetAvailabilitySlot[]>([]);

  const [selectedPetId, setSelectedPetId] = useState('');
  const [selectedVetId, setSelectedVetId] = useState('');
  const [selectedPriceId, setSelectedPriceId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');

  const [petName, setPetName] = useState('');
  const [petSpecies, setPetSpecies] = useState<NvetPetSpecies>('DOG');
  const [petBreed, setPetBreed] = useState('');
  const [petWeight, setPetWeight] = useState('');
  const [petBirthDate, setPetBirthDate] = useState('');

  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [creatingPet, setCreatingPet] = useState(false);
  const [booking, setBooking] = useState(false);
  const [bookingAttempt, setBookingAttempt] = useState<BookingAttempt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<NvetCreatedAppointment | null>(null);

  const selectedVet = useMemo(
    () => vets.find((vet) => vet.id === selectedVetId) ?? null,
    [vets, selectedVetId],
  );
  const selectedPrice = useMemo(
    () => prices.find((price) => price.id === selectedPriceId) ?? null,
    [prices, selectedPriceId],
  );
  const availableSlots = useMemo(() => slots.filter((slot) => slot.available), [slots]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      setLoading(true);
      try {
        const [petsResponse, vetsResponse] = await Promise.all([
          fetch('/api/nvetcareapp/client/pets', { cache: 'no-store' }),
          fetch('/api/nvetcareapp/client/vets?limit=20', { cache: 'no-store' }),
        ]);
        const petsData = await readJson<unknown>(petsResponse);
        const vetsData = await readJson<unknown>(vetsResponse);
        if (!petsResponse.ok) throw new Error(messageFrom(petsData, 'No se pudieron cargar tus mascotas.'));
        if (!vetsResponse.ok) throw new Error(messageFrom(vetsData, 'No se pudieron cargar los veterinarios.'));
        if (!active) return;

        const petList = Array.isArray(petsData) ? (petsData as NvetPet[]) : [];
        const vetSearch = vetsData as NvetVetSearchResponse | null;
        setPets(petList);
        setVets(vetSearch && Array.isArray(vetSearch.results) ? vetSearch.results : []);
        if (petList.length === 1) setSelectedPetId(petList[0].id);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'No se pudo cargar la reserva.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearching(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (search.trim()) params.set('search', search.trim());
      const response = await fetch(`/api/nvetcareapp/client/vets?${params.toString()}`, { cache: 'no-store' });
      const data = await readJson<unknown>(response);
      if (!response.ok) throw new Error(messageFrom(data, 'No se pudieron cargar los veterinarios.'));
      const result = data as NvetVetSearchResponse | null;
      setVets(result && Array.isArray(result.results) ? result.results : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los veterinarios.');
    } finally {
      setSearching(false);
    }
  }

  async function selectVet(vetId: string) {
    setSelectedVetId(vetId);
    setSelectedPriceId('');
    setPrices([]);
    setDate('');
    setTime('');
    setSlots([]);
    setBookingAttempt(null);
    setLoadingPrices(true);
    setError(null);
    try {
      const response = await fetch(`/api/nvetcareapp/client/vets/${encodeURIComponent(vetId)}/prices`, {
        cache: 'no-store',
      });
      const data = await readJson<unknown>(response);
      if (!response.ok) throw new Error(messageFrom(data, 'No se pudieron cargar los servicios.'));
      const list = Array.isArray(data) ? (data as NvetVetPrice[]) : [];
      setPrices(list);
      if (list.length === 1) setSelectedPriceId(list[0].id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los servicios.');
    } finally {
      setLoadingPrices(false);
    }
  }

  async function selectDate(nextDate: string) {
    setDate(nextDate);
    setTime('');
    setSlots([]);
    setBookingAttempt(null);
    if (!selectedVetId || !nextDate) return;

    setLoadingSlots(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/nvetcareapp/client/vets/${encodeURIComponent(selectedVetId)}/schedule?date=${encodeURIComponent(nextDate)}`,
        { cache: 'no-store' },
      );
      const data = await readJson<unknown>(response);
      if (!response.ok) throw new Error(messageFrom(data, 'No se pudo cargar la disponibilidad.'));
      setSlots(Array.isArray(data) ? (data as NvetAvailabilitySlot[]) : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar la disponibilidad.');
    } finally {
      setLoadingSlots(false);
    }
  }

  async function handleCreatePet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingPet(true);
    setError(null);
    try {
      const payload = {
        name: petName.trim(),
        species: petSpecies,
        ...(petBreed.trim() ? { breed: petBreed.trim() } : {}),
        ...(petWeight ? { weight: Number(petWeight) } : {}),
        ...(petBirthDate ? { birthDate: petBirthDate } : {}),
      };
      const response = await fetch('/api/nvetcareapp/client/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await readJson<unknown>(response);
      if (!response.ok) throw new Error(messageFrom(data, 'No se pudo registrar la mascota.'));
      if (!data || typeof data !== 'object' || !('id' in data)) throw new Error('La mascota se creó con una respuesta inválida.');
      const pet = data as NvetPet;
      setPets((current) => [...current, pet]);
      setSelectedPetId(pet.id);
      setBookingAttempt(null);
      setPetName('');
      setPetBreed('');
      setPetWeight('');
      setPetBirthDate('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo registrar la mascota.');
    } finally {
      setCreatingPet(false);
    }
  }

  async function handleBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPetId || !selectedVetId || !selectedPriceId || !date || !time || !address.trim()) {
      setError('Completa mascota, veterinario, servicio, fecha, hora y dirección.');
      return;
    }

    const payload = {
      petId: selectedPetId,
      vetId: selectedVetId,
      priceId: selectedPriceId,
      date,
      time,
      address: address.trim(),
      notes: notes.trim() || undefined,
    };
    const fingerprint = JSON.stringify(payload);
    const requestId =
      bookingAttempt?.fingerprint === fingerprint ? bookingAttempt.requestId : crypto.randomUUID();
    if (!bookingAttempt || bookingAttempt.fingerprint !== fingerprint) {
      setBookingAttempt({ fingerprint, requestId });
    }

    setBooking(true);
    setError(null);
    try {
      const response = await fetch('/api/nvetcareapp/client/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, requestId }),
      });
      const data = await readJson<unknown>(response);
      if (!response.ok) throw new Error(messageFrom(data, 'No se pudo crear la cita.'));
      if (!data || typeof data !== 'object' || !('id' in data)) throw new Error('La reserva devolvió una respuesta inválida.');
      setCreated(data as NvetCreatedAppointment);
      setBookingAttempt(null);
    } catch (cause) {
      // Preserve bookingAttempt after timeout/network/server errors. A retry of
      // the exact same payload reuses requestId and the backend replays the
      // original appointment instead of reserving the slot twice.
      setError(cause instanceof Error ? cause.message : 'No se pudo crear la cita.');
    } finally {
      setBooking(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F2F4F7] px-4 py-16">
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-2 text-sm text-[#5B6670]">
          <Loader2 className="h-4 w-4 animate-spin" /> Preparando tu reserva…
        </div>
      </main>
    );
  }

  if (created) {
    return (
      <main className="min-h-screen bg-[#F2F4F7] px-4 py-16 sm:px-8">
        <div className="mx-auto max-w-xl rounded-3xl border border-[#34B27A]/20 bg-white p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-12 w-12 text-[#34B27A]" />
          <h1 className="mt-4 text-2xl font-semibold text-[#0D1B2A]">Cita reservada</h1>
          <p className="mt-2 text-sm text-[#5B6670]">{created.serviceType} · {date} a las {time}</p>
          <p className="mt-1 text-lg font-semibold text-[#0D1B2A]">{formatCop(created.amount)}</p>
          <p className="mt-4 text-xs leading-5 text-[#5B6670]">
            El importe fue tomado del tarifario vigente del veterinario. Esta pantalla registra la reserva; no ejecuta un débito automático.
          </p>
          <Link href="/nvetcareapp/dashboard" className="mt-6 inline-flex rounded-xl bg-[#0D1B2A] px-5 py-3 text-sm font-semibold text-white hover:bg-[#172B3F]">
            Ver mis citas
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F2F4F7] px-4 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#34B27A]">Nvet Care</p>
            <h1 className="mt-1 text-2xl font-semibold text-[#0D1B2A]">Agenda una cita{firstName ? `, ${firstName}` : ''}</h1>
            <p className="mt-1 max-w-2xl text-sm text-[#5B6670]">Selecciona tu mascota, un veterinario verificado, el servicio y un horario disponible.</p>
          </div>
          <Link href="/nvetcareapp/dashboard" className="text-sm font-semibold text-[#0D1B2A] hover:text-[#34B27A]">← Mis citas</Link>
        </header>

        {error && <div role="alert" className="mb-5 rounded-xl border border-[#B91C1C]/20 bg-[#B91C1C]/5 px-4 py-3 text-sm text-[#B91C1C]">{error}</div>}

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="space-y-6">
            <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2"><PawPrint className="h-5 w-5 text-[#34B27A]" /><h2 className="font-semibold text-[#0D1B2A]">1. Mascota</h2></div>
              {pets.length > 0 && (
                <div className="mb-5 grid gap-2 sm:grid-cols-2">
                  {pets.map((pet) => (
                    <button key={pet.id} type="button" onClick={() => { setSelectedPetId(pet.id); setBookingAttempt(null); }} className={`rounded-xl border px-3 py-3 text-left text-sm transition ${selectedPetId === pet.id ? 'border-[#34B27A] bg-[#34B27A]/5' : 'border-black/10 hover:border-[#34B27A]/40'}`}>
                      <span className="block font-semibold text-[#0D1B2A]">{pet.name}</span>
                      <span className="text-xs text-[#5B6670]">{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</span>
                    </button>
                  ))}
                </div>
              )}
              <form onSubmit={handleCreatePet} className="border-t border-black/5 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#5B6670]">Registrar nueva mascota</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input required maxLength={50} value={petName} onChange={(event) => setPetName(event.target.value)} placeholder="Nombre" aria-label="Nombre de la mascota" className="rounded-lg border border-black/10 px-3 py-2 text-sm" />
                  <select value={petSpecies} onChange={(event) => setPetSpecies(event.target.value as NvetPetSpecies)} aria-label="Especie" className="rounded-lg border border-black/10 px-3 py-2 text-sm">
                    {SPECIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                  <input maxLength={100} value={petBreed} onChange={(event) => setPetBreed(event.target.value)} placeholder="Raza (opcional)" aria-label="Raza" className="rounded-lg border border-black/10 px-3 py-2 text-sm" />
                  <input type="number" min="0.01" max="999" step="0.01" value={petWeight} onChange={(event) => setPetWeight(event.target.value)} placeholder="Peso kg (opcional)" aria-label="Peso en kilogramos" className="rounded-lg border border-black/10 px-3 py-2 text-sm" />
                  <input type="date" max={colombiaDate()} value={petBirthDate} onChange={(event) => setPetBirthDate(event.target.value)} aria-label="Fecha de nacimiento" className="rounded-lg border border-black/10 px-3 py-2 text-sm sm:col-span-2" />
                </div>
                <button disabled={creatingPet} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#0D1B2A]/15 px-3 py-2 text-xs font-semibold text-[#0D1B2A] disabled:opacity-60">
                  {creatingPet && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Guardar mascota
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2"><Stethoscope className="h-5 w-5 text-[#34B27A]" /><h2 className="font-semibold text-[#0D1B2A]">2. Veterinario</h2></div>
              <form onSubmit={handleSearch} className="mb-4 flex gap-2">
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o especialidad" className="min-w-0 flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm" />
                <button disabled={searching} className="inline-flex items-center gap-1 rounded-lg bg-[#0D1B2A] px-3 py-2 text-sm text-white disabled:opacity-60">
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Buscar
                </button>
              </form>
              <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
                {vets.length === 0 && <p className="py-6 text-center text-sm text-[#5B6670]">No encontramos veterinarios verificados con ese criterio.</p>}
                {vets.map((vet) => (
                  <button key={vet.id} type="button" onClick={() => void selectVet(vet.id)} className={`w-full rounded-xl border p-3 text-left transition ${selectedVetId === vet.id ? 'border-[#34B27A] bg-[#34B27A]/5' : 'border-black/10 hover:border-[#34B27A]/40'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="text-sm font-semibold text-[#0D1B2A]">{vetName(vet)}</p><p className="mt-0.5 text-xs text-[#5B6670]">{vet.city || 'Atención Nvet Care'}{vet.yearsExperience ? ` · ${vet.yearsExperience} años de experiencia` : ''}</p></div>
                      {typeof vet.rating === 'number' && <span className="text-xs font-semibold text-[#0D1B2A]">★ {vet.rating.toFixed(1)}</span>}
                    </div>
                    {vet.specialties && vet.specialties.length > 0 && <p className="mt-2 text-xs text-[#5B6670]">{vet.specialties.slice(0, 3).join(' · ')}</p>}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section>
            <form onSubmit={handleBooking} className="sticky top-6 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-[#34B27A]" /><h2 className="font-semibold text-[#0D1B2A]">3. Servicio y horario</h2></div>
              {!selectedVet ? (
                <p className="rounded-xl bg-[#F2F4F7] p-4 text-sm text-[#5B6670]">Selecciona un veterinario para consultar sus servicios y agenda.</p>
              ) : (
                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#5B6670]">Servicio con {vetName(selectedVet)}</p>
                    {loadingPrices ? <p className="flex items-center gap-2 text-sm text-[#5B6670]"><Loader2 className="h-4 w-4 animate-spin" /> Cargando servicios…</p> : prices.length === 0 ? <p className="text-sm text-[#5B6670]">Este veterinario no tiene servicios activos publicados.</p> : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {prices.map((price) => (
                          <button key={price.id} type="button" onClick={() => { setSelectedPriceId(price.id); setBookingAttempt(null); }} className={`rounded-xl border p-3 text-left ${selectedPriceId === price.id ? 'border-[#34B27A] bg-[#34B27A]/5' : 'border-black/10'}`}>
                            <span className="block text-sm font-semibold text-[#0D1B2A]">{price.serviceName}</span><span className="text-xs text-[#5B6670]">{formatCop(price.priceCop)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-[#333A40]">Fecha
                      <input type="date" min={colombiaDate()} value={date} onChange={(event) => void selectDate(event.target.value)} disabled={!selectedPriceId} className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm font-normal disabled:bg-[#F2F4F7]" />
                    </label>
                    <div><p className="text-xs font-semibold text-[#333A40]">Hora disponible</p><div className="mt-1 min-h-10 rounded-lg border border-black/10 p-2">
                      {loadingSlots ? <Loader2 className="h-4 w-4 animate-spin text-[#5B6670]" /> : <div className="flex flex-wrap gap-1.5">
                        {availableSlots.map((slot) => <button key={slot.time} type="button" onClick={() => { setTime(slot.time); setBookingAttempt(null); }} className={`rounded-md px-2 py-1 text-xs ${time === slot.time ? 'bg-[#34B27A] text-white' : 'bg-[#F2F4F7] text-[#0D1B2A]'}`}>{slot.time}</button>)}
                        {date && availableSlots.length === 0 && <span className="text-xs text-[#5B6670]">Sin horarios disponibles.</span>}
                      </div>}
                    </div></div>
                  </div>

                  <label className="block text-xs font-semibold text-[#333A40]"><span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Dirección de atención</span>
                    <input required minLength={5} maxLength={250} value={address} onChange={(event) => { setAddress(event.target.value); setBookingAttempt(null); }} placeholder="Calle, edificio, apartamento o referencia" className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm font-normal" />
                  </label>
                  <label className="block text-xs font-semibold text-[#333A40]">Notas para el veterinario (opcional)
                    <textarea maxLength={500} rows={3} value={notes} onChange={(event) => { setNotes(event.target.value); setBookingAttempt(null); }} placeholder="Síntomas, contexto o indicaciones de acceso" className="mt-1 w-full resize-none rounded-lg border border-black/10 px-3 py-2 text-sm font-normal" />
                  </label>

                  <div className="rounded-xl border border-[#34B27A]/15 bg-[#34B27A]/5 p-3 text-xs leading-5 text-[#40515E]">
                    {selectedPrice ? <>Valor vigente: <strong className="text-[#0D1B2A]">{formatCop(selectedPrice.priceCop)}</strong>. </> : null}
                    El servidor vuelve a consultar el tarifario oficial antes de crear la cita; el navegador no puede fijar el precio. El cobro se habilita en una fase separada y no se ejecuta automáticamente aquí.
                  </div>

                  <button type="submit" disabled={booking || !selectedPetId || !selectedVetId || !selectedPriceId || !date || !time || !address.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0D1B2A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#172B3F] disabled:cursor-not-allowed disabled:opacity-45">
                    {booking && <Loader2 className="h-4 w-4 animate-spin" />}{booking ? 'Reservando…' : 'Confirmar reserva'}
                  </button>
                </div>
              )}
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
