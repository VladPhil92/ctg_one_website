'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import {
  BadgeCheck,
  CalendarDays,
  CircleDollarSign,
  Loader2,
  MapPin,
  Search,
  Stethoscope,
  Star,
  Zap,
} from 'lucide-react';
import type { NvetVetSearchItem, NvetVetSearchResponse } from '@/lib/nvetcareapp/client-booking';

const PAGE_SIZE = 20;

function formatCop(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

function providerName(vet: NvetVetSearchItem): string {
  return [vet.user.firstName, vet.user.lastName].filter(Boolean).join(' ').trim() || 'Veterinario Nvet Care';
}

function minimumPrice(vet: NvetVetSearchItem): number | null {
  const values = (vet.prices ?? [])
    .filter((price) => price.isActive !== false && Number.isFinite(price.priceCop))
    .map((price) => price.priceCop);
  return values.length > 0 ? Math.min(...values) : null;
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

export function ClientServicesMarketplace({
  initialVets,
  marketplaceAvailable,
}: {
  initialVets: NvetVetSearchItem[];
  marketplaceAvailable: boolean;
}) {
  const [vets, setVets] = useState(initialVets);
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [availableNowOnly, setAvailableNowOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initialVets.length === PAGE_SIZE);

  const visibleServiceCount = useMemo(
    () =>
      new Set(
        vets.flatMap((vet) =>
          (vet.prices ?? [])
            .filter((price) => price.isActive !== false)
            .map((price) => price.serviceName.trim())
            .filter(Boolean),
        ),
      ).size,
    [vets],
  );

  async function fetchPage({
    offset,
    replace,
    searchTerm,
    availableNow,
  }: {
    offset: number;
    replace: boolean;
    searchTerm: string;
    availableNow: boolean;
  }) {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
        sortBy: 'rating',
      });
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (availableNow) params.set('availableNow', 'true');

      const response = await fetch(`/api/nvetcareapp/client/vets?${params.toString()}`, {
        cache: 'no-store',
      });
      const data = await readJson<unknown>(response);
      if (!response.ok) throw new Error(messageFrom(data, 'No se pudieron cargar los profesionales.'));

      const result = data as NvetVetSearchResponse | null;
      const page = result && Array.isArray(result.results) ? result.results : [];
      setVets((current) => (replace ? page : [...current, ...page]));
      // The upstream search currently exposes a conservative `hasMore` value
      // after scoring. A full page is a stronger continuation signal, so the
      // client keeps paging until the backend returns fewer than PAGE_SIZE.
      setHasMore(page.length === PAGE_SIZE);
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'No se pudieron cargar los profesionales.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = query.trim();
    setActiveQuery(nextQuery);
    await fetchPage({ offset: 0, replace: true, searchTerm: nextQuery, availableNow: availableNowOnly });
  }

  async function toggleAvailableNow() {
    const next = !availableNowOnly;
    setAvailableNowOnly(next);
    await fetchPage({ offset: 0, replace: true, searchTerm: activeQuery, availableNow: next });
  }

  if (!marketplaceAvailable) {
    return (
      <main className="min-h-screen bg-[#F2F4F7] px-4 py-10 sm:px-8 sm:py-14">
        <div className="mx-auto max-w-5xl rounded-3xl border border-[#B45309]/20 bg-white p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#B45309]">Servicios Nvet Care</p>
          <h1 className="mt-2 text-2xl font-semibold text-[#0D1B2A]">El marketplace veterinario no está disponible temporalmente</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5B6670]">
            No mostramos profesionales ni servicios simulados. Intenta nuevamente más tarde o revisa tus citas y el expediente de tus mascotas.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/nvetcareapp/dashboard/citas" className="rounded-xl bg-[#0D1B2A] px-4 py-2.5 text-sm font-semibold text-white">Ver mis citas</Link>
            <Link href="/nvetcareapp/dashboard/mascotas" className="rounded-xl border border-[#0D1B2A]/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#0D1B2A]">Mis mascotas</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F2F4F7] px-4 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#34B27A]">Marketplace veterinario</p>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#34B27A]/25 bg-[#34B27A]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#237754]">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Solo verificados
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-[#0D1B2A]">Encuentra servicios veterinarios y agenda atención</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5B6670]">
              Explora profesionales aprobados por Nvet Care, sus servicios publicados, tarifas vigentes y disponibilidad declarada. La reserva final vuelve a validar servicio, precio y horario antes de crear la cita.
            </p>
          </div>
          <Link href="/nvetcareapp/dashboard/reservar" className="inline-flex items-center gap-2 rounded-xl bg-[#0D1B2A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#172B3F]">
            <CalendarDays className="h-4 w-4" aria-hidden="true" /> Agendar cita
          </Link>
        </header>

        <section className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
            <p className="text-xs text-[#5B6670]">Profesionales cargados</p>
            <p className="mt-1 text-2xl font-semibold text-[#0D1B2A]">{vets.length}</p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
            <p className="text-xs text-[#5B6670]">Disponibles ahora en esta vista</p>
            <p className="mt-1 text-2xl font-semibold text-[#0D1B2A]">{vets.filter((vet) => vet.isAvailableNow).length}</p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
            <p className="text-xs text-[#5B6670]">Servicios visibles publicados</p>
            <p className="mt-1 text-2xl font-semibold text-[#0D1B2A]">{visibleServiceCount}</p>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
          <form onSubmit={handleSearch} className="flex flex-col gap-3 md:flex-row md:items-center">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5B6670]" aria-hidden="true" />
              <span className="sr-only">Buscar profesional o servicio</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por profesional, ciudad, especialidad o servicio"
                className="w-full rounded-xl border border-[#0D1B2A]/10 bg-[#F8F9FA] py-2.5 pl-10 pr-3 text-sm text-[#0D1B2A] outline-none transition focus:border-[#34B27A]/60 focus:bg-white"
              />
            </label>
            <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0D1B2A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />} Buscar
            </button>
            <button
              type="button"
              onClick={() => void toggleAvailableNow()}
              disabled={loading}
              aria-pressed={availableNowOnly}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
                availableNowOnly
                  ? 'border-[#34B27A]/40 bg-[#34B27A]/10 text-[#237754]'
                  : 'border-[#0D1B2A]/10 bg-white text-[#44505B] hover:border-[#34B27A]/30'
              }`}
            >
              <Zap className="h-4 w-4" aria-hidden="true" /> Disponibles ahora
            </button>
          </form>
          {loadError && <p role="alert" className="mt-3 text-sm text-[#B91C1C]">{loadError}</p>}
        </section>

        {vets.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-[#0D1B2A]/15 bg-white p-8 text-center">
            <Stethoscope className="mx-auto h-10 w-10 text-[#34B27A]" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold text-[#0D1B2A]">
              {activeQuery || availableNowOnly ? 'No encontramos profesionales con esos criterios' : 'Aún no hay profesionales verificados publicados'}
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#5B6670]">
              Nvet Care solo publica perfiles que han superado la verificación. Puedes ajustar la búsqueda o preparar el expediente de tus mascotas mientras ampliamos la oferta real.
            </p>
          </section>
        ) : (
          <>
            <section className="grid gap-5 xl:grid-cols-2">
              {vets.map((vet) => {
                const prices = (vet.prices ?? []).filter((price) => price.isActive !== false);
                const startingPrice = minimumPrice(vet);
                const name = providerName(vet);

                return (
                  <article key={vet.id} className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-lg font-semibold text-[#0D1B2A]">{name}</h2>
                          <BadgeCheck className="h-4 w-4 shrink-0 text-[#34B27A]" aria-label="Profesional verificado" />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#5B6670]">
                          {vet.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {vet.city}</span>}
                          <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5" aria-hidden="true" />{vet.rating && vet.rating > 0 ? `${vet.rating.toFixed(1)} · ${vet.totalReviews ?? 0} reseñas` : 'Sin calificaciones aún'}</span>
                          {vet.yearsExperience !== null && vet.yearsExperience !== undefined && <span>{vet.yearsExperience} años de experiencia</span>}
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${vet.isAvailableNow ? 'bg-[#34B27A]/10 text-[#237754]' : 'bg-[#0D1B2A]/5 text-[#5B6670]'}`}>
                        {vet.isAvailableNow ? 'Disponible ahora' : 'Agenda programada'}
                      </span>
                    </div>

                    {(vet.specialties ?? []).length > 0 && <div className="mt-4 flex flex-wrap gap-2">{(vet.specialties ?? []).slice(0, 5).map((specialty) => <span key={specialty} className="rounded-full border border-[#0D1B2A]/10 bg-[#F8F9FA] px-2.5 py-1 text-[10px] font-semibold text-[#44505B]">{specialty}</span>)}</div>}

                    <div className="mt-5 rounded-2xl border border-[#0D1B2A]/10 bg-[#F8F9FA] p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#5B6670]">Servicios destacados</p>
                        {startingPrice !== null && <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0D1B2A]"><CircleDollarSign className="h-3.5 w-3.5" aria-hidden="true" /> Desde {formatCop(startingPrice)}</span>}
                      </div>
                      {prices.length === 0 ? <p className="text-xs leading-5 text-[#5B6670]">Este profesional aún no tiene servicios activos publicados.</p> : <div className="space-y-2">{prices.slice(0, 3).map((price) => <div key={price.id} className="flex items-center justify-between gap-3 text-sm"><span className="min-w-0 truncate text-[#44505B]">{price.serviceName}</span><span className="shrink-0 font-semibold text-[#0D1B2A]">{formatCop(price.priceCop)}</span></div>)}</div>}
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-[11px] leading-5 text-[#5B6670]">La disponibilidad y el precio se vuelven a validar al reservar.</p>
                      <Link href={`/nvetcareapp/dashboard/reservar?vetId=${encodeURIComponent(vet.id)}`} className="inline-flex items-center gap-2 rounded-xl bg-[#0D1B2A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#172B3F]">
                        <CalendarDays className="h-4 w-4" aria-hidden="true" /> Agendar
                      </Link>
                    </div>
                  </article>
                );
              })}
            </section>

            {hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void fetchPage({ offset: vets.length, replace: false, searchTerm: activeQuery, availableNow: availableNowOnly })}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#0D1B2A]/10 bg-white px-5 py-2.5 text-sm font-semibold text-[#0D1B2A] shadow-sm disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Cargar más profesionales
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
