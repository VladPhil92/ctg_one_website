import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CalendarClock,
  CheckCircle2,
  PawPrint,
  ShieldCheck,
  Syringe,
} from 'lucide-react';
import {
  fetchNvetPreventiveAgenda,
  type NvetPreventiveAgendaItem,
  type NvetPreventiveAgendaStatus,
} from '@/lib/nvetcareapp/preventive-agenda';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';

const STATUS_CONFIG: Record<
  NvetPreventiveAgendaStatus,
  { label: string; className: string; icon: typeof CalendarClock }
> = {
  OVERDUE: {
    label: 'Vencido',
    className: 'border-red-200 bg-red-50 text-red-700',
    icon: AlertTriangle,
  },
  DUE_SOON: {
    label: 'Próximo',
    className: 'border-[#FF8A3D]/25 bg-[#FF8A3D]/10 text-[#B95A1D]',
    icon: BellRing,
  },
  UPCOMING: {
    label: 'Programado',
    className: 'border-[#34B27A]/25 bg-[#34B27A]/10 text-[#237754]',
    icon: CheckCircle2,
  },
};

function formatDate(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function dueCopy(item: NvetPreventiveAgendaItem): string {
  if (item.daysUntilDue < 0) {
    const days = Math.abs(item.daysUntilDue);
    return `Venció hace ${days} ${days === 1 ? 'día' : 'días'}`;
  }
  if (item.daysUntilDue === 0) return 'Programado para hoy';
  if (item.daysUntilDue === 1) return 'Programado para mañana';
  return `Faltan ${item.daysUntilDue} días`;
}

function AgendaItem({ item }: { item: NvetPreventiveAgendaItem }) {
  const config = STATUS_CONFIG[item.status];
  const Icon = item.source === 'VACCINATION' ? Syringe : item.source === 'DEWORMING' ? ShieldCheck : config.icon;

  return (
    <article className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5 shadow-[0_1px_3px_rgba(13,27,42,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#34B27A]/10 text-[#237754]">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#0D1B2A]">{item.title}</p>
            <p className="mt-1 text-xs text-[#5B6670]">
              {item.petName} · {formatDate(item.dueAt)} · {dueCopy(item)}
            </p>
          </div>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${config.className}`}>
          {config.label}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#0D1B2A]/5 pt-4">
        <p className="text-[11px] leading-5 text-[#5B6670]">
          Recordatorio derivado de la fecha registrada en el expediente preventivo.
        </p>
        <Link
          href={`/nvetcareapp/dashboard/mascotas/${encodeURIComponent(item.petId)}/salud`}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#237754] hover:text-[#1B6144]"
        >
          Abrir expediente <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export default async function NvetPreventiveAgendaPage() {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) redirect('/nvetcareapp/iniciar-sesion');

  const userResult = await fetchNvetCurrentUser(accessToken);
  if (!userResult.ok && userResult.status === 401) redirect('/nvetcareapp/iniciar-sesion');
  if (!userResult.ok || userResult.user.role !== 'CLIENT') redirect('/nvetcareapp/dashboard');

  const agendaResult = await fetchNvetPreventiveAgenda(accessToken, 60);
  if (!agendaResult.ok && agendaResult.status === 401) redirect('/nvetcareapp/iniciar-sesion');

  return (
    <main className="min-h-screen bg-[#F2F4F7] px-4 py-8 pb-28 sm:px-6 sm:py-10 lg:px-8 lg:pb-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#34B27A]">Nvet Care · Prevención</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0D1B2A] sm:text-3xl">Agenda preventiva</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5B6670]">
              Reúne en una sola línea de tiempo las próximas vacunas, desparasitaciones y controles que registraste para tus mascotas.
            </p>
          </div>
          <Link
            href="/nvetcareapp/dashboard/mascotas"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0D1B2A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#16293D]"
          >
            <PawPrint className="h-4 w-4" aria-hidden="true" /> Mis mascotas
          </Link>
        </div>

        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#34B27A]/20 bg-[#34B27A]/[0.06] p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#237754]" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-[#0D1B2A]">Agenda basada en datos reportados, no en diagnóstico automático</p>
            <p className="mt-1 text-xs leading-5 text-[#5B6670]">
              Nvet Care clasifica fechas que ya existen en tu expediente. No genera indicaciones médicas, esquemas de vacunación ni tratamientos por cuenta propia.
            </p>
          </div>
        </div>

        {!agendaResult.ok ? (
          <section className="rounded-3xl border border-[#0D1B2A]/10 bg-white p-8 text-center">
            <BellRing className="mx-auto h-7 w-7 text-[#5B6670]" aria-hidden="true" />
            <h2 className="mt-4 text-base font-bold text-[#0D1B2A]">No pudimos sincronizar tu agenda preventiva</h2>
            <p className="mt-2 text-sm text-[#5B6670]">El servicio está temporalmente no disponible. Tus expedientes de mascota no se modificaron.</p>
          </section>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#5B6670]">Agenda total</p>
                <p className="mt-2 text-2xl font-bold text-[#0D1B2A]">{agendaResult.data.summary.total}</p>
                <p className="mt-1 text-xs text-[#5B6670]">Fechas preventivas activas</p>
              </article>
              <article className="rounded-2xl border border-red-200 bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-red-600">Vencidos</p>
                <p className="mt-2 text-2xl font-bold text-red-700">{agendaResult.data.summary.overdue}</p>
                <p className="mt-1 text-xs text-[#5B6670]">Fechas anteriores a hoy</p>
              </article>
              <article className="rounded-2xl border border-[#FF8A3D]/25 bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#B95A1D]">Próximos 60 días</p>
                <p className="mt-2 text-2xl font-bold text-[#0D1B2A]">{agendaResult.data.summary.dueSoon}</p>
                <p className="mt-1 text-xs text-[#5B6670]">Prioridad de seguimiento</p>
              </article>
              <article className="rounded-2xl border border-[#34B27A]/25 bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#237754]">Más adelante</p>
                <p className="mt-2 text-2xl font-bold text-[#0D1B2A]">{agendaResult.data.summary.upcoming}</p>
                <p className="mt-1 text-xs text-[#5B6670]">Fuera de la ventana prioritaria</p>
              </article>
            </section>

            <section className="mt-7">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#34B27A]">Línea de tiempo</p>
                  <h2 className="mt-1 text-lg font-bold text-[#0D1B2A]">Próximos cuidados registrados</h2>
                </div>
                <p className="text-xs text-[#5B6670]">Ventana prioritaria: {agendaResult.data.windowDays} días</p>
              </div>

              {agendaResult.data.items.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[#34B27A]/30 bg-white p-8 text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-[#34B27A]" aria-hidden="true" />
                  <h3 className="mt-4 text-base font-bold text-[#0D1B2A]">No hay fechas preventivas pendientes</h3>
                  <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#5B6670]">
                    Cuando registres próximas vacunas, desparasitaciones o controles en el expediente de una mascota, aparecerán aquí automáticamente.
                  </p>
                  <Link
                    href="/nvetcareapp/dashboard/mascotas"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#34B27A] px-4 py-2.5 text-sm font-bold text-white"
                  >
                    Completar expedientes <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {agendaResult.data.items.map((item) => <AgendaItem key={`${item.petId}-${item.source}-${item.id}`} item={item} />)}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
