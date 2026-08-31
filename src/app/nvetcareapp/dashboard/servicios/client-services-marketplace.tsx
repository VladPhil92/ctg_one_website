'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  BadgeCheck,
  CalendarDays,
  CircleDollarSign,
  MapPin,
  Search,
  Stethoscope,
  Star,
  Zap,
} from 'lucide-react';
import type { NvetVetSearchItem } from '@/lib/nvetcareapp/client-booking';

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

export function ClientServicesMarketplace({
  initialVets,
  totalVerifiedProviders,
  marketplaceAvailable,
}: {
  initialVets: NvetVetSearchItem[];
  totalVerifiedProviders: number;
  marketplaceAvailable: boolean;
}) {
  const [query, setQuery] = useState('');
  const [availableNowOnly, setAvailableNowOnly] = useState(false);

  const serviceNames = useMemo(
    () =>
      Array.from(
        new Set(
          initialVets.flatMap((vet) =>
            (vet.prices ?? [])
              .filter((price) => price.isActive !== false)
              .map((price) => price.serviceName.trim())
              .filter(Boolean),
          ),
        ),
      ).sort((a, b) => a.localeCompare(b, 'es')),
    [initialVets],
  );

  const filteredVets = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('es');

    return initialVets
      .filter((vet) => !availableNowOnly || vet.isAvailableNow)
      .filter((vet) => {
        if (!normalizedQuery) return true;
        const haystack = [
          providerName(vet),
          vet.city ?? '',
          ...(vet.specialties ?? []),
          ...(vet.prices ?? []).map((price) => price.serviceName),
        ]
          .join(' ')
          .toLocaleLowerCase('es');
        return haystack.includes(normalizedQuery);
      })
      .sort((left, right) => {
        if (Boolean(left.isAvailableNow) !== Boolean(right.isAvailableNow)) {
          return left.isAvailableNow ? -1 : 1;
        }
        return (right.rating ?? 0) - (left.rating ?? 0);
      });
  }, [availableNowOnly, initialVets, query]);

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
            <Link href="/nvetcareapp/dashboard/citas" className="rounded-xl bg-[#0D1B2A] px-4 py-2.5 text-sm font-semibold text-white">
              Ver mis citas
            </Link>
            <Link href="/nvetcareapp/dashboard/mascotas" className="rounded-xl border border-[#0D1B2A]/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#0D1B2A]">
              Mis mascotas
            </Link>
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
            <p className="text-xs text-[#5B6670]">Profesionales verificados</p>
            <p className="mt-1 text-2xl font-semibold text-[#0D1B2A]">{totalVerifiedProviders}</p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
            <p className="text-xs text-[#5B6670]">Disponibles ahora</p>
            <p className="mt-1 text-2xl font-semibold text-[#0D1B2A]">{initialVets.filter((vet) => vet.isAvailableNow).length}</p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
            <p className="text-xs text-[#5B6670]">Servicios destacados publicados</p>
            <p className="mt-1 text-2xl font-semibold text-[#0D1B2A]">{serviceNames.length}</p>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
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
            <button
              type="button"
              onClick={() => setAvailableNowOnly((current) => !current)}
              aria-pressed={availableNowOnly}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                availableNowOnly
                  ? 'border-[#34B27A]/40 bg-[#34B27A]/10 text-[#237754]'
                  : 'border-[#0D1B2A]/10 bg-white text-[#44505B] hover:border-[#34B27A]/30'
              }`}
            >
              <Zap className="h-4 w-4" aria-hidden="true" /> Disponibles ahora
            </button>
          </div>
        </section>

        {initialVets.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-[#0D1B2A]/15 bg-white p-8 text-center">
            <Stethoscope className="mx-auto h-10 w-10 text-[#34B27A]" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold text-[#0D1B2A]">Aún no hay profesionales verificados publicados</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#5B6670]">
              Nvet Care solo publica perfiles que han superado la verificación. Mientras ampliamos la oferta puedes completar el expediente de tus mascotas y volver cuando haya disponibilidad real.
            </p>
            <Link href="/nvetcareapp/dashboard/mascotas" className="mt-5 inline-flex rounded-xl bg-[#0D1B2A] px-4 py-2.5 text-sm font-semibold text-white">
              Preparar mis mascotas
            </Link>
          </section>
        ) : filteredVets.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-[#0D1B2A]/15 bg-white p-8 text-center">
            <Search className="mx-auto h-9 w-9 text-[#5B6670]" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold text-[#0D1B2A]">No encontramos coincidencias</h2>
            <p className="mt-2 text-sm text-[#5B6670]">Prueba otro término o desactiva el filtro de disponibilidad inmediata.</p>
          </section>
        ) : (
          <section className="grid gap-5 xl:grid-cols-2">
            {filteredVets.map((vet) => {
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
                        {vet.city && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {vet.city}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3.5 w-3.5" aria-hidden="true" />
                          {vet.rating && vet.rating > 0 ? `${vet.rating.toFixed(1)} · ${vet.totalReviews ?? 0} reseñas` : 'Sin calificaciones aún'}
                        </span>
                        {vet.yearsExperience !== null && vet.yearsExperience !== undefined && (
                          <span>{vet.yearsExperience} años de experiencia</span>
                        )}
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${
                      vet.isAvailableNow ? 'bg-[#34B27A]/10 text-[#237754]' : 'bg-[#0D1B2A]/5 text-[#5B6670]'
                    }`}>
                      {vet.isAvailableNow ? 'Disponible ahora' : 'Agenda programada'}
                    </span>
                  </div>

                  {(vet.specialties ?? []).length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(vet.specialties ?? []).slice(0, 5).map((specialty) => (
                        <span key={specialty} className="rounded-full border border-[#0D1B2A]/10 bg-[#F8F9FA] px-2.5 py-1 text-[10px] font-semibold text-[#44505B]">
                          {specialty}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 rounded-2xl border border-[#0D1B2A]/8 bg-[#F8F9FA] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#5B6670]">Servicios destacados</p>
                      {startingPrice !== null && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0D1B2A]">
                          <CircleDollarSign className="h-3.5 w-3.5" aria-hidden="true" /> Desde {formatCop(startingPrice)}
                        </span>
                      )}
                    </div>
                    {prices.length === 0 ? (
                      <p className="text-xs leading-5 text-[#5B6670]">Este profesional aún no tiene servicios activos publicados.</p>
                    ) : (
                      <div className="space-y-2">
                        {prices.slice(0, 3).map((price) => (
                          <div key={price.id} className="flex items-center justify-between gap-3 text-sm">
                            <span className="min-w-0 truncate text-[#44505B]">{price.serviceName}</span>
                            <span className="shrink-0 font-semibold text-[#0D1B2A]">{formatCop(price.priceCop)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[11px] leading-5 text-[#5B6670]">
                      La disponibilidad y el precio se vuelven a validar al reservar.
                    </p>
                    <Link href="/nvetcareapp/dashboard/reservar" className="inline-flex items-center gap-2 rounded-xl bg-[#0D1B2A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#172B3F]">
                      <CalendarDays className="h-4 w-4" aria-hidden="true" /> Agendar
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
