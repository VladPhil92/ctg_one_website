import type { CSSProperties } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetAdminMetrics, type NvetAdminMetrics } from '@/lib/nvetcareapp/admin';
import { LogoutButton } from './logout-button';

const poppinsFont: CSSProperties = { fontFamily: 'var(--font-poppins-nvet), Poppins, sans-serif' };

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
}

const TIER_LABELS: Record<string, string> = { FREE: 'Free', PRO: 'Pro', ELITE: 'Elite' };

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

export default async function NvetDashboardPage() {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) {
    redirect('/nvetcareapp/iniciar-sesion');
  }

  const result = await fetchNvetAdminMetrics(accessToken);
  if (!result.ok && result.status === 401) {
    redirect('/nvetcareapp/iniciar-sesion');
  }

  return (
    <main className="min-h-screen bg-[#F2F4F7] px-4 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-[#0D1B2A]" style={poppinsFont}>Panel de Nvet Care</h1>
            <p className="text-sm text-[#5B6670]">Métricas generales de la operación.</p>
          </div>
          <LogoutButton />
        </div>

        {result.ok ? (
          <AdminMetricsPanel metrics={result.metrics} />
        ) : (
          <div className="rounded-2xl border-[1px] border-[#0D1B2A]/10 bg-white p-8 text-center shadow-[0_1px_3px_rgba(13,27,42,0.04)]">
            <p className="text-sm text-[#0D1B2A]">
              {result.status === 403
                ? 'Tu cuenta no tiene permisos de administrador para ver este panel.'
                : 'No se pudieron obtener las métricas en este momento.'}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
