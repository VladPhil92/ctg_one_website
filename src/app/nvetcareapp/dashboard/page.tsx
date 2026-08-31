import type { CSSProperties } from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  PawPrint,
  ShieldCheck,
  Stethoscope,
  WalletCards,
} from 'lucide-react';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';
import { fetchNvetAdminMetrics, type NvetAdminMetrics } from '@/lib/nvetcareapp/admin';
import { fetchNvetAppointments, type NvetAppointment } from '@/lib/nvetcareapp/appointments';
import { fetchNvetPets, type NvetPet } from '@/lib/nvetcareapp/client-booking';
import { LogoutButton } from './logout-button';
import { AdvanceStatusButton } from './advance-status-button';
import { ChatPanel } from './chat-panel';

const poppinsFont: CSSProperties = { fontFamily: 'var(--font-poppins-nvet), Poppins, sans-serif' };

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

const TIER_LABELS: Record<string, string> = { FREE: 'Free', PRO: 'Pro', ELITE: 'Elite' };

const APPOINTMENT_STATUS_LABELS: Record<NvetAppointment['status'], string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  IN_PROGRESS: 'En camino',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  DISPUTED: 'En disputa',
};

const PAYMENT_METHOD_LABELS: Record<NvetAppointment['paymentMethod'], string> = {
  CTG: 'CTG One Token',
  PSE: 'PSE',
  TRANSFER: 'Transferencia',
};

function DashboardShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#F2F4F7] px-4 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-[#0D1B2A]" style={poppinsFont}>{title}</h1>
            <p className="text-sm text-[#5B6670]">{subtitle}</p>
          </div>
          <LogoutButton />
        </div>
        {children}
      </div>
    </main>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border-[1px] border-[#0D1B2A]/10 bg-white p-8 text-center shadow-[0_1px_3px_rgba(13,27,42,0.04)]">
      <p className="text-sm text-[#0D1B2A]">{message}</p>
    </div>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border-[1px] border-[#0D1B2A]/10 bg-white p-5 shadow-[0_1px_3px_rgba(13,27,42,0.04)]">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5B6670]">{label}</p>
      <p className="text-2xl font-bold text-[#0D1B2A]" style={poppinsFont}>{value}</p>
      {sub && <p className="mt-1 text-xs text-[#5B6670]">{sub}</p>}
    </div>
  );
}

function AdminMetricsPanel({ metrics }: { metrics: NvetAdminMetrics }) {
  const tierEntries = Object.entries(metrics.tierDistribution);
  const hasAlerts = metrics.alerts.pendingTransfers > 0 || metrics.alerts.disputedTransactions > 0;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Usuarios registrados" value={String(metrics.users.total)} />
        <KpiCard
          label="Veterinarios"
          value={String(metrics.users.vets.total)}
          sub={`${metrics.users.vets.verified} verificados`}
        />
        <KpiCard
          label="Citas"
          value={String(metrics.appointments.total)}
          sub={`${metrics.appointments.completed} completadas · ${metrics.appointments.completionRate}%`}
        />
        <KpiCard
          label="Ingresos"
          value={formatCOP(metrics.revenue.gross)}
          sub={`${formatCOP(metrics.revenue.commissions)} en comisiones`}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border-[1px] border-[#0D1B2A]/10 bg-white p-5 shadow-[0_1px_3px_rgba(13,27,42,0.04)]">
          <h2 className="mb-4 text-sm font-semibold text-[#0D1B2A]" style={poppinsFont}>Veterinarios por nivel</h2>
          <div className="space-y-2">
            {tierEntries.length === 0 && <p className="text-sm text-[#5B6670]">Sin datos todavía.</p>}
            {tierEntries.map(([tier, count]) => (
              <div key={tier} className="flex items-center justify-between border-b border-[#0D1B2A]/5 pb-2 last:border-0 last:pb-0">
                <span className="text-sm text-[#333A40]">{TIER_LABELS[tier] ?? tier}</span>
                <span className="font-mono text-sm text-[#0D1B2A]">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border-[1px] border-[#0D1B2A]/10 bg-white p-5 shadow-[0_1px_3px_rgba(13,27,42,0.04)]">
          <h2 className="mb-4 text-sm font-semibold text-[#0D1B2A]" style={poppinsFont}>Pendientes de revisión</h2>
          {hasAlerts ? (
            <div className="space-y-2">
              {metrics.alerts.pendingTransfers > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-[#FF8A3D]/25 bg-[#FF8A3D]/[0.06] px-3 py-2">
                  <span className="text-sm text-[#0D1B2A]">Transferencias por confirmar</span>
                  <span className="font-mono text-sm font-semibold text-[#FF8A3D]">{metrics.alerts.pendingTransfers}</span>
                </div>
              )}
              {metrics.alerts.disputedTransactions > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-[#FF8A3D]/25 bg-[#FF8A3D]/[0.06] px-3 py-2">
                  <span className="text-sm text-[#0D1B2A]">Transacciones en disputa</span>
                  <span className="font-mono text-sm font-semibold text-[#FF8A3D]">{metrics.alerts.disputedTransactions}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-[#5B6670]">Nada pendiente de revisión.</p>
          )}
        </div>
      </div>
    </>
  );
}

const APPOINTMENT_STATUS_TONE: Record<NvetAppointment['status'], string> = {
  PENDING: 'border-[#0D1B2A]/10 bg-[#0D1B2A]/[0.03] text-[#5B6670]',
  CONFIRMED: 'border-[#34B27A]/25 bg-[#34B27A]/[0.06] text-[#34B27A]',
  IN_PROGRESS: 'border-[#34B27A]/25 bg-[#34B27A]/[0.06] text-[#34B27A]',
  COMPLETED: 'border-[#0D1B2A]/10 bg-[#0D1B2A]/[0.03] text-[#0D1B2A]',
  CANCELLED: 'border-[#0D1B2A]/10 bg-[#0D1B2A]/[0.03] text-[#5B6670]',
  DISPUTED: 'border-[#FF8A3D]/25 bg-[#FF8A3D]/[0.06] text-[#FF8A3D]',
};

function AppointmentTrackingPanel({ appointments, currentUserId }: { appointments: NvetAppointment[]; currentUserId: string }) {
  if (appointments.length === 0) {
    return <ErrorPanel message="Todavía no tienes citas agendadas." />;
  }

  return (
    <div className="space-y-3">
      {appointments.map((appointment) => (
        <div key={appointment.id} className="rounded-2xl border-[1px] border-[#0D1B2A]/10 bg-white p-5 shadow-[0_1px_3px_rgba(13,27,42,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#0D1B2A]">
                {appointment.vet.user.firstName} {appointment.vet.user.lastName}
              </p>
              <p className="text-xs text-[#5B6670]">
                {appointment.serviceType} · {appointment.pet.name} ({appointment.pet.species})
              </p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${APPOINTMENT_STATUS_TONE[appointment.status]}`}>
              {APPOINTMENT_STATUS_LABELS[appointment.status]}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#0D1B2A]/5 pt-3 text-xs text-[#5B6670]">
            <span>{formatDate(appointment.date)} · {appointment.time}</span>
            <span>{PAYMENT_METHOD_LABELS[appointment.paymentMethod]} · {formatCOP(appointment.amount)}</span>
          </div>
          <ChatPanel appointmentId={appointment.id} currentUserId={currentUserId} />
        </div>
      ))}
    </div>
  );
}

function VetAgendaPanel({ appointments, currentUserId }: { appointments: NvetAppointment[]; currentUserId: string }) {
  if (appointments.length === 0) {
    return <ErrorPanel message="Todavía no tienes citas asignadas." />;
  }

  return (
    <div className="space-y-3">
      {appointments.map((appointment) => (
        <div key={appointment.id} className="rounded-2xl border-[1px] border-[#0D1B2A]/10 bg-white p-5 shadow-[0_1px_3px_rgba(13,27,42,0.04)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#0D1B2A]">
                {appointment.client.firstName} {appointment.client.lastName}
              </p>
              <p className="text-xs text-[#5B6670]">
                {appointment.serviceType} · {appointment.pet.name} ({appointment.pet.species})
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${APPOINTMENT_STATUS_TONE[appointment.status]}`}>
                {APPOINTMENT_STATUS_LABELS[appointment.status]}
              </span>
              <AdvanceStatusButton appointmentId={appointment.id} status={appointment.status} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#0D1B2A]/5 pt-3 text-xs text-[#5B6670]">
            <span>{formatDate(appointment.date)} · {appointment.time}</span>
            <span>{PAYMENT_METHOD_LABELS[appointment.paymentMethod]} · {formatCOP(appointment.amount)}</span>
          </div>
          <ChatPanel appointmentId={appointment.id} currentUserId={currentUserId} />
        </div>
      ))}
    </div>
  );
}

type ClientFeatureStatus = 'AVAILABLE' | 'BETA' | 'COMING_SOON' | 'REQUIRES_VET';

const CLIENT_FEATURE_STATUS: Record<ClientFeatureStatus, { label: string; className: string }> = {
  AVAILABLE: { label: 'Disponible', className: 'border-[#34B27A]/25 bg-[#34B27A]/10 text-[#237754]' },
  BETA: { label: 'Beta', className: 'border-[#0D1B2A]/10 bg-[#0D1B2A]/5 text-[#0D1B2A]' },
  COMING_SOON: { label: 'Próximamente', className: 'border-[#0D1B2A]/10 bg-white text-[#5B6670]' },
  REQUIRES_VET: { label: 'Requiere veterinario', className: 'border-[#FF8A3D]/25 bg-[#FF8A3D]/10 text-[#B95A1D]' },
};

function FeatureStatusBadge({ status }: { status: ClientFeatureStatus }) {
  const config = CLIENT_FEATURE_STATUS[status];
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] ${config.className}`}>
      {config.label}
    </span>
  );
}

function ClientStatCard({
  icon: Icon,
  label,
  value,
  sub,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  href?: string;
}) {
  const card = (
    <div className="h-full rounded-2xl border border-[#0D1B2A]/10 bg-white p-4 shadow-[0_1px_3px_rgba(13,27,42,0.04)] transition group-hover:border-[#34B27A]/25">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#34B27A]/10 text-[#237754]">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        {href && <ArrowRight className="h-4 w-4 text-[#5B6670]/50 transition group-hover:translate-x-0.5 group-hover:text-[#237754]" aria-hidden="true" />}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#5B6670]">{label}</p>
      <p className="mt-1 text-xl font-bold text-[#0D1B2A]" style={poppinsFont}>{value}</p>
      <p className="mt-1 text-xs leading-5 text-[#5B6670]">{sub}</p>
    </div>
  );

  return href ? <Link href={href} className="group block h-full">{card}</Link> : card;
}

function ClientDashboardHome({
  firstName,
  pets,
  petsAvailable,
  appointments,
  appointmentsAvailable,
}: {
  firstName: string;
  pets: NvetPet[];
  petsAvailable: boolean;
  appointments: NvetAppointment[];
  appointmentsAvailable: boolean;
}) {
  const activeAppointments = appointments.filter((appointment) =>
    ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'DISPUTED'].includes(appointment.status),
  );
  const upcoming = [...activeAppointments]
    .filter((appointment) => appointment.status !== 'DISPUTED')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  const latestAppointments = appointments.slice(0, 3);
  const onboarding = [
    { label: 'Cuenta Nvet Care activa', done: true },
    { label: 'Registrar primera mascota', done: petsAvailable && pets.length > 0 },
    { label: 'Crear primera solicitud o cita', done: appointmentsAvailable && appointments.length > 0 },
  ];
  const completedSteps = onboarding.filter((step) => step.done).length;

  return (
    <main className="min-h-screen bg-[#F2F4F7] px-4 py-8 pb-28 sm:px-6 sm:py-10 lg:px-8 lg:pb-10">
      <div className="mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-3xl bg-[#0D1B2A] p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8BE0B5]">Nvet Care · Centro de cuidado</p>
              <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl" style={poppinsFont}>
                Hola, {firstName}. Todo el cuidado de tus mascotas, en un solo lugar.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/65">
                Registra tus mascotas, prepara solicitudes, sigue citas y pagos y conecta tu experiencia con CTG Wallet desde este panel.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/nvetcareapp/dashboard/mascotas" className="inline-flex items-center gap-2 rounded-xl bg-[#34B27A] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#289463]">
                  <PawPrint className="h-4 w-4" aria-hidden="true" /> Registrar mascota
                </Link>
                <Link href="/nvetcareapp/dashboard/reservar" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15">
                  Solicitar atención <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
            <div className="w-full max-w-xs rounded-2xl border border-[#34B27A]/25 bg-[#34B27A]/10 p-4">
              <div className="flex items-center gap-2 text-[#8BE0B5]">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <p className="text-xs font-bold uppercase tracking-[0.1em]">Oferta verificada</p>
              </div>
              <p className="mt-2 text-sm font-semibold">Estamos incorporando veterinarios reales a la plataforma.</p>
              <p className="mt-2 text-xs leading-5 text-white/60">
                Mientras habilitamos cobertura, puedes completar tu expediente y preparar la atención. No mostraremos profesionales ficticios como oferta disponible.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ClientStatCard
            icon={PawPrint}
            label="Mascotas"
            value={petsAvailable ? String(pets.length) : '—'}
            sub={petsAvailable ? (pets.length ? 'Expedientes base registrados' : 'Registra tu primera mascota') : 'Sincronización no disponible'}
            href="/nvetcareapp/dashboard/mascotas"
          />
          <ClientStatCard
            icon={CalendarDays}
            label="Próxima cita"
            value={appointmentsAvailable && upcoming ? formatDate(upcoming.date) : appointmentsAvailable ? 'Sin cita' : '—'}
            sub={upcoming ? `${upcoming.time} · ${upcoming.pet.name}` : appointmentsAvailable ? 'Sin atención programada' : 'Sincronización no disponible'}
            href="/nvetcareapp/dashboard/citas"
          />
          <ClientStatCard
            icon={Clock}
            label="Actividad"
            value={appointmentsAvailable ? String(activeAppointments.length) : '—'}
            sub="Solicitudes y citas que requieren seguimiento"
            href="/nvetcareapp/dashboard/citas"
          />
          <ClientStatCard
            icon={WalletCards}
            label="Pagos / Wallet"
            value="CTG One"
            sub="Accede a tu infraestructura de pagos y wallet"
            href="/dashboard/wallet"
          />
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#34B27A]">Acciones rápidas</p>
              <h2 className="mt-1 text-lg font-bold text-[#0D1B2A]">¿Qué necesitas hacer?</h2>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { href: '/nvetcareapp/dashboard/mascotas', title: 'Registrar mascota', description: 'Crea su expediente base.', icon: PawPrint },
              { href: '/nvetcareapp/dashboard/reservar', title: 'Solicitar atención', description: 'Prepara una nueva solicitud.', icon: Stethoscope },
              { href: '/nvetcareapp/dashboard/citas', title: 'Pagos y citas', description: 'Sigue el ciclo de servicio.', icon: CalendarDays },
              { href: '/dashboard/wallet', title: 'Abrir CTG Wallet', description: 'Gestiona tu infraestructura de pagos.', icon: WalletCards },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.href} href={action.href} className="group flex items-center gap-3 rounded-2xl border border-[#0D1B2A]/10 bg-white p-4 transition hover:border-[#34B27A]/30 hover:shadow-sm">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F2F4F7] text-[#0D1B2A] transition group-hover:bg-[#34B27A]/10 group-hover:text-[#237754]">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-[#0D1B2A]">{action.title}</span>
                    <span className="mt-0.5 block text-xs text-[#5B6670]">{action.description}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
          <section className="rounded-3xl border border-[#0D1B2A]/10 bg-white p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#34B27A]">Mis mascotas</p>
                <h2 className="mt-1 text-lg font-bold text-[#0D1B2A]">Expedientes preparados</h2>
              </div>
              <Link href="/nvetcareapp/dashboard/mascotas" className="inline-flex items-center gap-1 text-xs font-bold text-[#237754] hover:text-[#1B6144]">
                Ver todas <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>

            {!petsAvailable ? (
              <p className="rounded-2xl bg-[#F7F8FA] p-5 text-sm text-[#5B6670]">No pudimos sincronizar tus mascotas en este momento.</p>
            ) : pets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#34B27A]/30 bg-[#34B27A]/[0.04] p-6 text-center">
                <PawPrint className="mx-auto h-6 w-6 text-[#34B27A]" aria-hidden="true" />
                <p className="mt-3 text-sm font-bold text-[#0D1B2A]">Tu expediente empieza con tu mascota</p>
                <p className="mt-1 text-xs leading-5 text-[#5B6670]">Puedes registrarla ahora, incluso antes de que existan veterinarios disponibles en tu zona.</p>
                <Link href="/nvetcareapp/dashboard/mascotas" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0D1B2A] px-4 py-2 text-xs font-bold text-white">
                  Registrar mascota <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pets.slice(0, 3).map((pet) => (
                  <article key={pet.id} className="rounded-2xl border border-[#0D1B2A]/10 bg-[#F8F9FA] p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#34B27A]/10 text-[#237754]">
                      <PawPrint className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <h3 className="mt-3 truncate text-sm font-bold text-[#0D1B2A]">{pet.name}</h3>
                    <p className="mt-1 truncate text-xs text-[#5B6670]">{pet.breed || pet.species}</p>
                    <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#34B27A]">Expediente activo</p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-[#0D1B2A]/10 bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#34B27A]">Configuración inicial</p>
                <h2 className="mt-1 text-lg font-bold text-[#0D1B2A]">Tu progreso</h2>
              </div>
              <span className="text-sm font-bold text-[#0D1B2A]">{completedSteps}/{onboarding.length}</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#0D1B2A]/5">
              <div className="h-full rounded-full bg-[#34B27A]" style={{ width: `${(completedSteps / onboarding.length) * 100}%` }} />
            </div>
            <div className="mt-5 space-y-3">
              {onboarding.map((step) => (
                <div key={step.label} className="flex items-center gap-3">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${step.done ? 'bg-[#34B27A]/10 text-[#237754]' : 'bg-[#0D1B2A]/5 text-[#5B6670]'}`}>
                    {step.done ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <span className="h-2 w-2 rounded-full bg-current" />}
                  </span>
                  <span className={`text-xs ${step.done ? 'font-semibold text-[#0D1B2A]' : 'text-[#5B6670]'}`}>{step.label}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-8">
          <div className="mb-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#34B27A]">Servicios Nvet Care</p>
            <h2 className="mt-1 text-lg font-bold text-[#0D1B2A]">Funcionalidades del ecosistema</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[#5B6670]">El estado de cada servicio refleja lo que realmente puede utilizarse hoy. Las capacidades dependientes de veterinarios no se presentan como disponibles.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { title: 'Consulta veterinaria', text: 'Atención profesional con seguimiento desde la plataforma.', status: 'REQUIRES_VET' as const },
              { title: 'Atención domiciliaria', text: 'Solicitud de cuidado veterinario en tu ubicación.', status: 'REQUIRES_VET' as const },
              { title: 'Orientación virtual', text: 'Canal remoto para orientación y seguimiento.', status: 'COMING_SOON' as const },
              { title: 'Prevención y vacunas', text: 'Recordatorios y trazabilidad preventiva por mascota.', status: 'COMING_SOON' as const },
            ].map((service) => (
              <article key={service.title} className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#34B27A]/10 text-[#237754]">
                    <Stethoscope className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <FeatureStatusBadge status={service.status} />
                </div>
                <h3 className="text-sm font-bold text-[#0D1B2A]">{service.title}</h3>
                <p className="mt-2 text-xs leading-5 text-[#5B6670]">{service.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-[#0D1B2A]/10 bg-white p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#34B27A]">Actividad</p>
              <h2 className="mt-1 text-lg font-bold text-[#0D1B2A]">Citas y seguimiento</h2>
            </div>
            <Link href="/nvetcareapp/dashboard/citas" className="inline-flex items-center gap-1 text-xs font-bold text-[#237754] hover:text-[#1B6144]">
              Ver pagos y citas <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          {!appointmentsAvailable ? (
            <p className="rounded-2xl bg-[#F7F8FA] p-5 text-sm text-[#5B6670]">No pudimos sincronizar tus citas en este momento.</p>
          ) : latestAppointments.length === 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-[#0D1B2A]/15 bg-[#F8F9FA] p-5">
              <div>
                <p className="text-sm font-bold text-[#0D1B2A]">Todavía no tienes citas</p>
                <p className="mt-1 text-xs text-[#5B6670]">Puedes preparar una solicitud; la asignación dependerá de disponibilidad real de profesionales.</p>
              </div>
              <Link href="/nvetcareapp/dashboard/reservar" className="inline-flex items-center gap-2 rounded-xl bg-[#34B27A] px-4 py-2.5 text-xs font-bold text-white">
                Solicitar atención <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {latestAppointments.map((appointment) => (
                <Link key={appointment.id} href="/nvetcareapp/dashboard/citas" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#0D1B2A]/10 p-4 transition hover:border-[#34B27A]/25">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#0D1B2A]">{appointment.serviceType}</p>
                    <p className="mt-1 text-xs text-[#5B6670]">{appointment.pet.name} · {formatDate(appointment.date)} · {appointment.time}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${APPOINTMENT_STATUS_TONE[appointment.status]}`}>
                    {APPOINTMENT_STATUS_LABELS[appointment.status]}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default async function NvetDashboardPage() {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) {
    redirect('/nvetcareapp/iniciar-sesion');
  }

  const userResult = await fetchNvetCurrentUser(accessToken);
  if (!userResult.ok && userResult.status === 401) {
    redirect('/nvetcareapp/iniciar-sesion');
  }

  if (!userResult.ok) {
    return (
      <DashboardShell title="Panel de Nvet Care" subtitle="No se pudo cargar tu cuenta.">
        <ErrorPanel message="No se pudo cargar tu cuenta en este momento." />
      </DashboardShell>
    );
  }

  if (userResult.user.isSuperadmin && !userResult.user.isClientMode) {
    redirect('/nvetcareapp/dashboard/gobernanza');
  }

  const { role } = userResult.user;

  if (role === 'ADMIN') {
    const result = await fetchNvetAdminMetrics(accessToken);
    if (!result.ok && result.status === 401) {
      redirect('/nvetcareapp/iniciar-sesion');
    }
    return (
      <DashboardShell title="Panel de Nvet Care" subtitle="Métricas generales de la operación.">
        {result.ok ? (
          <>
            <div className="mb-4 flex flex-wrap gap-4">
              <Link
                href="/nvetcareapp/dashboard/veterinarios"
                className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#34B27A] hover:text-[#289463]"
              >
                Gestionar veterinarios →
              </Link>
              <Link
                href="/nvetcareapp/dashboard/contabilidad"
                className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#34B27A] hover:text-[#289463]"
              >
                Contabilidad →
              </Link>
            </div>
            <AdminMetricsPanel metrics={result.metrics} />
          </>
        ) : (
          <ErrorPanel
            message={
              result.status === 403
                ? 'Tu cuenta no tiene permisos de administrador para ver este panel.'
                : 'No se pudieron obtener las métricas en este momento.'
            }
          />
        )}
      </DashboardShell>
    );
  }

  if (role === 'CLIENT') {
    const [appointmentsResult, petsResult] = await Promise.all([
      fetchNvetAppointments(accessToken),
      fetchNvetPets(accessToken),
    ]);
    if (!appointmentsResult.ok && appointmentsResult.status === 401) {
      redirect('/nvetcareapp/iniciar-sesion');
    }
    return (
      <ClientDashboardHome
        firstName={userResult.user.firstName}
        pets={petsResult.ok ? petsResult.data : []}
        petsAvailable={petsResult.ok}
        appointments={appointmentsResult.ok ? appointmentsResult.appointments : []}
        appointmentsAvailable={appointmentsResult.ok}
      />
    );
  }

  // role === 'VET': the only remaining role after ADMIN, CLIENT and root.
  const result = await fetchNvetAppointments(accessToken);
  if (!result.ok && result.status === 401) {
    redirect('/nvetcareapp/iniciar-sesion');
  }
  return (
    <DashboardShell title="Mi agenda" subtitle="Citas asignadas a tu perfil.">
      {result.ok ? (
        <VetAgendaPanel appointments={result.appointments} currentUserId={userResult.user.id} />
      ) : (
        <ErrorPanel message="No se pudo cargar tu agenda en este momento." />
      )}
    </DashboardShell>
  );
}
