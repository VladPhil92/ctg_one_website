import type { CSSProperties } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';
import { fetchNvetAdminMetrics, type NvetAdminMetrics } from '@/lib/nvetcareapp/admin';
import { fetchNvetAppointments, type NvetAppointment } from '@/lib/nvetcareapp/appointments';
import { LogoutButton } from './logout-button';
import { AdvanceStatusButton } from './advance-status-button';

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

function AppointmentTrackingPanel({ appointments }: { appointments: NvetAppointment[] }) {
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
        </div>
      ))}
    </div>
  );
}

function VetAgendaPanel({ appointments }: { appointments: NvetAppointment[] }) {
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
        </div>
      ))}
    </div>
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
            <div className="mb-4">
              <a
                href="/nvetcareapp/dashboard/veterinarios"
                className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#34B27A] hover:text-[#289463]"
              >
                Gestionar veterinarios →
              </a>
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
    const result = await fetchNvetAppointments(accessToken);
    if (!result.ok && result.status === 401) {
      redirect('/nvetcareapp/iniciar-sesion');
    }
    return (
      <DashboardShell title="Mis citas" subtitle="Seguimiento de tus citas con veterinarios.">
        {result.ok ? (
          <AppointmentTrackingPanel appointments={result.appointments} />
        ) : (
          <ErrorPanel message="No se pudieron obtener tus citas en este momento." />
        )}
      </DashboardShell>
    );
  }

  // role === 'VET': agenda (read) + one-tap status advance (write, scoped
  // to the vet's own appointments). Prices and clinical notes are a
  // separate, not-yet-built slice (ROADMAP.md Phase 4 item 2).
  const result = await fetchNvetAppointments(accessToken);
  if (!result.ok && result.status === 401) {
    redirect('/nvetcareapp/iniciar-sesion');
  }
  return (
    <DashboardShell title="Mi agenda" subtitle="Citas asignadas a tu perfil.">
      {result.ok ? (
        <VetAgendaPanel appointments={result.appointments} />
      ) : (
        <ErrorPanel message="No se pudo cargar tu agenda en este momento." />
      )}
    </DashboardShell>
  );
}
