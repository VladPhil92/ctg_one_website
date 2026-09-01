'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  BadgeCheck,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  MessageCircle,
  Stethoscope,
  WalletCards,
} from 'lucide-react';
import type { NvetAppointment } from '@/lib/nvetcareapp/appointments';
import type {
  NvetScheduleException,
  NvetVetEarnings,
  NvetVetPrice,
  NvetVetProfile,
} from '@/lib/nvetcareapp/vet-dashboard';
import { AdvanceStatusButton } from './advance-status-button';
import { ChatPanel } from './chat-panel';
import { nvetFetchWithRefresh } from './nvet-fetch';

const STATUS_LABELS: Record<NvetAppointment['status'], string> = {
  PENDING: 'Pendiente de pago',
  CONFIRMED: 'Confirmada',
  IN_PROGRESS: 'Atención en curso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  DISPUTED: 'En disputa',
};

function formatCop(value = 0): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

async function responseMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = (await response.json()) as { message?: string };
    return data.message || fallback;
  } catch {
    return fallback;
  }
}

function Kpi({ label, value, sub, icon: Icon }: { label: string; value: string; sub: string; icon: typeof Stethoscope }) {
  return (
    <article className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5 shadow-[0_1px_3px_rgba(13,27,42,0.04)]">
      <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-[#34B27A]/10 text-[#237754]">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#5B6670]">{label}</p>
      <p className="mt-1 text-xl font-bold text-[#0D1B2A]">{value}</p>
      <p className="mt-1 text-xs leading-5 text-[#5B6670]">{sub}</p>
    </article>
  );
}

export function VetWorkspace({
  currentUserId,
  firstName,
  appointments,
  profile,
  earnings,
  prices,
  scheduleExceptions,
  profileAvailable,
  earningsAvailable,
}: {
  currentUserId: string;
  firstName: string;
  appointments: NvetAppointment[];
  profile: NvetVetProfile | null;
  earnings: NvetVetEarnings | null;
  prices: NvetVetPrice[];
  scheduleExceptions: NvetScheduleException[];
  profileAvailable: boolean;
  earningsAvailable: boolean;
}) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [exceptionDate, setExceptionDate] = useState('');
  const [exceptionReason, setExceptionReason] = useState('');

  const today = new Date().toISOString().slice(0, 10);
  const todayAppointments = appointments.filter((appointment) => appointment.date.slice(0, 10) === today);
  const activeAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.status === 'CONFIRMED' || appointment.status === 'IN_PROGRESS'),
    [appointments],
  );

  async function perform(key: string, action: () => Promise<Response>, fallback: string) {
    setBusyKey(key);
    setNotice(null);
    try {
      const response = await action();
      if (!response.ok) {
        setNotice(await responseMessage(response, fallback));
        return;
      }
      setNotice('Cambio guardado correctamente.');
      router.refresh();
    } catch {
      setNotice('No se pudo contactar el servicio veterinario.');
    } finally {
      setBusyKey(null);
    }
  }

  function toggleAvailability() {
    void perform(
      'availability',
      () => nvetFetchWithRefresh('/api/nvetcareapp/vet/availability', { method: 'POST' }),
      'No se pudo actualizar la disponibilidad.',
    );
  }

  function createPrice() {
    const priceCop = Number(servicePrice);
    if (serviceName.trim().length < 2 || !Number.isFinite(priceCop) || priceCop < 5000) {
      setNotice('Ingresa un servicio y un precio válido desde $5.000 COP.');
      return;
    }
    void perform(
      'price-create',
      () => nvetFetchWithRefresh('/api/nvetcareapp/vet/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceName: serviceName.trim(), priceCop }),
      }),
      'No se pudo crear el servicio.',
    ).then(() => {
      setServiceName('');
      setServicePrice('');
    });
  }

  function togglePrice(price: NvetVetPrice) {
    void perform(
      `price:${price.id}`,
      () => nvetFetchWithRefresh(`/api/nvetcareapp/vet/prices/${price.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !price.isActive }),
      }),
      'No se pudo actualizar el servicio.',
    );
  }

  function createScheduleException() {
    if (!exceptionDate) {
      setNotice('Selecciona una fecha para bloquear.');
      return;
    }
    void perform(
      'exception-create',
      () => nvetFetchWithRefresh(`/api/nvetcareapp/vet/schedule/exceptions/${exceptionDate}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: false, reason: exceptionReason.trim() || 'No disponible' }),
      }),
      'No se pudo bloquear la fecha.',
    ).then(() => {
      setExceptionDate('');
      setExceptionReason('');
    });
  }

  function deleteScheduleException(exception: NvetScheduleException) {
    const date = exception.date.slice(0, 10);
    void perform(
      `exception:${exception.id}`,
      () => nvetFetchWithRefresh(`/api/nvetcareapp/vet/schedule/exceptions/${date}`, { method: 'DELETE' }),
      'No se pudo eliminar la excepción.',
    );
  }

  return (
    <main className="min-h-screen bg-[#F2F4F7] px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-3xl bg-[#0D1B2A] p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8BE0B5]">Nvet Care · Workspace veterinario</p>
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Hola, {firstName}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
                Gestiona agenda, atención clínica, comunicación, tarifas, disponibilidad y rendimiento desde un único centro operativo.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/nvetcareapp/dashboard/servicios" className="rounded-xl bg-[#34B27A] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#2C9D6A]">Operar servicios</Link>
              <button type="button" onClick={() => router.refresh()} className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/15">Actualizar</button>
            </div>
          </div>
        </section>

        {notice && <div role="status" className="mt-4 rounded-xl border border-[#34B27A]/20 bg-[#34B27A]/[0.06] px-4 py-3 text-sm text-[#0D1B2A]">{notice}</div>}
        {!profileAvailable && <div className="mt-4 rounded-xl border border-[#FF8A3D]/25 bg-[#FF8A3D]/[0.06] p-3 text-sm text-[#0D1B2A]">No se pudo cargar el perfil profesional. Las acciones que dependen de verificación o disponibilidad permanecerán limitadas.</div>}
        {!earningsAvailable && <div className="mt-4 rounded-xl border border-[#FF8A3D]/25 bg-[#FF8A3D]/[0.06] p-3 text-sm text-[#0D1B2A]">El resumen financiero no está disponible en este momento.</div>}

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Citas hoy" value={String(todayAppointments.length)} sub={`${appointments.length} citas visibles`} icon={CalendarDays} />
          <Kpi label="Ingreso neto" value={formatCop(earnings?.netEarnings)} sub={`${earnings?.transactionCount ?? 0} servicios completados`} icon={CircleDollarSign} />
          <Kpi label="Saldo disponible" value={formatCop(earnings?.availableBalance)} sub={`${earnings?.ctgBalance ?? profile?.ctgBalance ?? 0} CTG`} icon={WalletCards} />
          <Kpi label="Verificación" value={profile?.isVerified ? 'Aprobada' : profile?.verificationStatus || 'Pendiente'} sub={`${profile?.rating ?? 0} ★ · ${profile?.reviewCount ?? 0} reseñas`} icon={BadgeCheck} />
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
          <div className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#34B27A]">Agenda</p>
                <h2 className="mt-1 text-lg font-bold text-[#0D1B2A]">Próximas atenciones</h2>
              </div>
              <Link href="/nvetcareapp/dashboard/servicios" className="text-xs font-bold text-[#237754] hover:text-[#0D1B2A]">Abrir operación clínica →</Link>
            </div>
            <div className="mt-4 space-y-3">
              {(activeAppointments.length ? activeAppointments : appointments.slice(0, 5)).map((appointment) => (
                <article key={appointment.id} className="rounded-xl border border-[#0D1B2A]/10 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[#0D1B2A]">{appointment.time} · {appointment.pet.name}</p>
                      <p className="mt-1 text-xs text-[#5B6670]">{appointment.client.firstName} {appointment.client.lastName} · {appointment.serviceType} · {formatDate(appointment.date)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#0D1B2A]/10 bg-[#F8F9FA] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#0D1B2A]">{STATUS_LABELS[appointment.status]}</span>
                      <AdvanceStatusButton appointmentId={appointment.id} status={appointment.status} />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#0D1B2A]/5 pt-3">
                    <span className="text-xs text-[#5B6670]">{appointment.pet.species} · {formatCop(appointment.amount)} · {appointment.paymentMethod}</span>
                    <ChatPanel appointmentId={appointment.id} currentUserId={currentUserId} />
                  </div>
                </article>
              ))}
              {appointments.length === 0 && <p className="rounded-xl bg-[#F8F9FA] p-5 text-sm text-[#5B6670]">Todavía no tienes citas asignadas.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5">
            <div className="flex items-center gap-2 text-[#237754]"><Stethoscope className="h-4 w-4" aria-hidden="true" /><p className="text-[11px] font-bold uppercase tracking-[0.12em]">Perfil profesional</p></div>
            <h2 className="mt-1 text-lg font-bold text-[#0D1B2A]">Estado y disponibilidad</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-[#5B6670]">Licencia</dt><dd className="font-semibold text-[#0D1B2A]">{profile?.licenseNumber || '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#5B6670]">Plan</dt><dd className="font-semibold text-[#0D1B2A]">{profile?.tier || '—'} {earnings ? `· ${earnings.byTier.commissionPct}%` : ''}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#5B6670]">Ciudad</dt><dd className="font-semibold text-[#0D1B2A]">{profile?.city || 'Sin definir'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#5B6670]">Radio</dt><dd className="font-semibold text-[#0D1B2A]">{profile ? `${profile.serviceRadius} km` : '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#5B6670]">Documentos</dt><dd className="font-semibold text-[#0D1B2A]">{profile?.verificationDocuments?.length ?? 0}</dd></div>
            </dl>
            <button
              type="button"
              onClick={toggleAvailability}
              disabled={!profile?.isVerified || busyKey === 'availability'}
              className={`mt-5 w-full rounded-xl px-4 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 ${profile?.isAvailableNow ? 'border border-[#34B27A]/30 bg-[#34B27A]/10 text-[#237754]' : 'bg-[#0D1B2A] text-white'}`}
            >
              {busyKey === 'availability' ? 'Actualizando…' : profile?.isAvailableNow ? 'Disponible ahora · cambiar' : 'Marcar disponible ahora'}
            </button>
            {!profile?.isVerified && <p className="mt-2 text-xs leading-5 text-[#5B6670]">La disponibilidad inmediata se habilita únicamente para veterinarios verificados.</p>}
          </div>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#34B27A]">Servicios y precios</p>
            <h2 className="mt-1 text-lg font-bold text-[#0D1B2A]">Tarifario publicado</h2>
            <div className="mt-4 space-y-2">
              {prices.map((price) => (
                <div key={price.id} className="flex flex-wrap items-center gap-3 border-b border-[#0D1B2A]/5 pb-2 last:border-0">
                  <div className="min-w-48 flex-1">
                    <p className="text-sm font-semibold text-[#0D1B2A]">{price.serviceName}</p>
                    <p className="text-[11px] text-[#5B6670]">{price.isActive ? 'Visible para reservas' : 'Oculto del marketplace'}</p>
                  </div>
                  <span className="font-mono text-sm text-[#0D1B2A]">{formatCop(price.priceCop)}</span>
                  {price.priceCtg != null && <span className="font-mono text-xs text-[#8A641E]">{price.priceCtg} CTG</span>}
                  <button type="button" onClick={() => togglePrice(price)} disabled={busyKey === `price:${price.id}`} className="rounded-lg border border-[#0D1B2A]/10 px-3 py-1.5 text-xs font-bold text-[#5B6670] disabled:opacity-50">{price.isActive ? 'Ocultar' : 'Activar'}</button>
                </div>
              ))}
              {prices.length === 0 && <p className="text-sm text-[#5B6670]">Aún no has configurado servicios y precios.</p>}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_180px_auto]">
              <input value={serviceName} onChange={(event) => setServiceName(event.target.value)} placeholder="Nuevo servicio" className="rounded-xl border border-[#0D1B2A]/15 px-3 py-2 text-sm" />
              <input value={servicePrice} onChange={(event) => setServicePrice(event.target.value)} type="number" min="5000" placeholder="Precio COP" className="rounded-xl border border-[#0D1B2A]/15 px-3 py-2 text-sm" />
              <button type="button" onClick={createPrice} disabled={busyKey === 'price-create'} className="rounded-xl bg-[#0D1B2A] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Agregar</button>
            </div>
          </div>

          <div className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5">
            <div className="flex items-center gap-2 text-[#237754]"><Clock3 className="h-4 w-4" aria-hidden="true" /><p className="text-[11px] font-bold uppercase tracking-[0.12em]">Disponibilidad</p></div>
            <h2 className="mt-1 text-lg font-bold text-[#0D1B2A]">Horario y excepciones</h2>
            <div className="mt-4 grid gap-1.5">
              {(profile?.schedules ?? []).map((schedule) => (
                <div key={schedule.id} className="flex justify-between gap-4 text-xs text-[#5B6670]"><span>{schedule.dayOfWeek}</span><span>{schedule.isActive ? `${schedule.startTime}–${schedule.endTime}` : 'Inactivo'}</span></div>
              ))}
              {!profile?.schedules?.length && <p className="text-sm text-[#5B6670]">No hay horario base configurado.</p>}
            </div>
            <div className="mt-4 border-t border-[#0D1B2A]/5 pt-4">
              {scheduleExceptions.map((exception) => (
                <div key={exception.id} className="mb-2 flex items-center justify-between gap-3 rounded-lg bg-[#F8F9FA] px-3 py-2">
                  <p className="text-xs text-[#5B6670]">{exception.date.slice(0, 10)} · {exception.reason || (exception.isAvailable ? 'Disponible' : 'No disponible')}</p>
                  <button type="button" onClick={() => deleteScheduleException(exception)} disabled={busyKey === `exception:${exception.id}`} className="text-[11px] font-bold text-[#B54708] disabled:opacity-50">Quitar</button>
                </div>
              ))}
              <input type="date" value={exceptionDate} onChange={(event) => setExceptionDate(event.target.value)} className="mt-2 w-full rounded-xl border border-[#0D1B2A]/15 px-3 py-2 text-sm" />
              <input value={exceptionReason} onChange={(event) => setExceptionReason(event.target.value)} placeholder="Motivo del bloqueo" className="mt-2 w-full rounded-xl border border-[#0D1B2A]/15 px-3 py-2 text-sm" />
              <button type="button" onClick={createScheduleException} disabled={busyKey === 'exception-create'} className="mt-2 w-full rounded-xl border border-[#0D1B2A]/15 px-4 py-2 text-sm font-bold text-[#0D1B2A] disabled:opacity-50">Bloquear fecha</button>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5 lg:col-span-2">
            <div className="flex items-center gap-2 text-[#237754]"><CircleDollarSign className="h-4 w-4" aria-hidden="true" /><p className="text-[11px] font-bold uppercase tracking-[0.12em]">Finanzas profesionales</p></div>
            <h2 className="mt-1 text-lg font-bold text-[#0D1B2A]">Ingresos, comisión y liquidación</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl bg-[#F8F9FA] p-4"><p className="text-[10px] font-bold uppercase text-[#5B6670]">Bruto</p><p className="mt-1 font-bold text-[#0D1B2A]">{formatCop(earnings?.totalEarnings)}</p></div>
              <div className="rounded-xl bg-[#F8F9FA] p-4"><p className="text-[10px] font-bold uppercase text-[#5B6670]">Comisiones</p><p className="mt-1 font-bold text-[#0D1B2A]">{formatCop(earnings?.totalCommissions)}</p></div>
              <div className="rounded-xl bg-[#F8F9FA] p-4"><p className="text-[10px] font-bold uppercase text-[#5B6670]">Pendiente</p><p className="mt-1 font-bold text-[#0D1B2A]">{formatCop(earnings?.pendingBalance)}</p></div>
              <div className="rounded-xl bg-[#F8F9FA] p-4"><p className="text-[10px] font-bold uppercase text-[#5B6670]">Disponible</p><p className="mt-1 font-bold text-[#237754]">{formatCop(earnings?.availableBalance)}</p></div>
            </div>
          </div>
          <div className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5">
            <div className="flex items-center gap-2 text-[#237754]"><MessageCircle className="h-4 w-4" aria-hidden="true" /><p className="text-[11px] font-bold uppercase tracking-[0.12em]">Atención conectada</p></div>
            <h2 className="mt-1 text-lg font-bold text-[#0D1B2A]">Chat + historia clínica</h2>
            <p className="mt-3 text-sm leading-6 text-[#5B6670]">El chat está disponible en cada cita. Diagnóstico, tratamiento, validación del pago e inicio/cierre del servicio se ejecutan en el módulo clínico protegido.</p>
            <Link href="/nvetcareapp/dashboard/servicios" className="mt-4 inline-flex rounded-xl bg-[#34B27A] px-4 py-2.5 text-sm font-bold text-white">Ir a operación clínica</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
