import Link from 'next/link';
import {
  Activity,
  BadgeCheck,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  FileClock,
  HeartPulse,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react';
import { fetchNvetAdminMetrics } from '@/lib/nvetcareapp/admin';
import { fetchNvetGovernanceOverview } from '@/lib/nvetcareapp/governance';
import { requireNvetSuperadmin } from '@/lib/nvetcareapp/require-superadmin';
import { LogoutButton } from '../logout-button';

const money = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

function StatCard({
  label,
  value,
  detail,
  alert = false,
}: {
  label: string;
  value: string;
  detail: string;
  alert?: boolean;
}) {
  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-[0_1px_3px_rgba(13,27,42,0.04)] ${alert ? 'border-[#FF8A3D]/30' : 'border-[#0D1B2A]/10'}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#5B6670]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#0D1B2A]">{value}</p>
      <p className="mt-1 text-xs text-[#5B6670]">{detail}</p>
    </div>
  );
}

const MODULES = [
  {
    href: '/nvetcareapp/dashboard/usuarios',
    title: 'Usuarios y acceso',
    description: 'Ciclo de vida, estado de cuentas, 2FA, vínculo CTG One y sesiones.',
    icon: Users,
  },
  {
    href: '/nvetcareapp/dashboard/veterinarios',
    title: 'Gobierno veterinario',
    description: 'Verificación profesional, suspensión, reactivación, tiers y desempeño.',
    icon: Stethoscope,
  },
  {
    href: '/nvetcareapp/dashboard/citas-admin',
    title: 'Operación de citas',
    description: 'Visión global de servicios, estados, clientes, mascotas y responsables.',
    icon: CalendarDays,
  },
  {
    href: '/nvetcareapp/dashboard/transacciones',
    title: 'Tesorería y transacciones',
    description: 'Libro operacional, métodos de pago, estados y trazabilidad financiera.',
    icon: CircleDollarSign,
  },
  {
    href: '/nvetcareapp/dashboard/contabilidad',
    title: 'Excepciones financieras',
    description: 'Transferencias pendientes, conciliación y resolución de disputas.',
    icon: ClipboardCheck,
  },
  {
    href: '/nvetcareapp/dashboard/auditoria',
    title: 'Auditoría y seguridad',
    description: 'Eventos de gobernanza, acciones críticas y trazabilidad append-only.',
    icon: FileClock,
  },
] as const;

export default async function GovernancePage() {
  const { accessToken, user } = await requireNvetSuperadmin();
  const [governance, metrics] = await Promise.all([
    fetchNvetGovernanceOverview(accessToken),
    fetchNvetAdminMetrics(accessToken),
  ]);

  return (
    <main className="min-h-screen bg-[#F2F4F7] px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 rounded-3xl bg-[#0D1B2A] p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#34B27A]/40 bg-[#34B27A]/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#9BE5BE]">
                  <ShieldCheck className="h-3.5 w-3.5" /> Gobernanza SUPERADMIN
                </span>
                <span className="rounded-full border border-white/15 px-3 py-1 text-[11px] font-semibold text-white/70">
                  Identidad raíz única
                </span>
              </div>
              <h1 className="text-2xl font-bold sm:text-3xl">Centro de gobierno de Nvet Care</h1>
              <p className="mt-2 text-sm leading-6 text-white/70">
                Control institucional de usuarios, veterinarios, operación clínica, tesorería, seguridad y auditoría desde una sola superficie privilegiada.
              </p>
              <p className="mt-3 text-xs text-white/50">Sesión: {user.email}</p>
            </div>
            <LogoutButton />
          </div>
        </header>

        {!governance.ok ? (
          <div className="rounded-2xl border border-[#FF8A3D]/30 bg-white p-8 text-center">
            <ShieldAlert className="mx-auto h-6 w-6 text-[#FF8A3D]" />
            <p className="mt-3 text-sm font-semibold text-[#0D1B2A]">El plano de gobernanza todavía no está disponible.</p>
            <p className="mt-1 text-xs text-[#5B6670]">El backend debe estar ejecutando la fase SUPERADMIN Governance V1.</p>
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Usuarios activos"
                value={String(governance.data.users.active)}
                detail={`${governance.data.users.inactive} cuentas inactivas de ${governance.data.users.total}`}
                alert={governance.data.users.inactive > 0}
              />
              <StatCard
                label="Vets por revisar"
                value={String(governance.data.veterinarians.pendingReview)}
                detail={`${governance.data.veterinarians.approved} profesionales aprobados`}
                alert={governance.data.veterinarians.pendingReview > 0}
              />
              <StatCard
                label="Citas activas"
                value={String(governance.data.appointments.active)}
                detail={`${governance.data.appointments.disputed} citas en disputa`}
                alert={governance.data.appointments.disputed > 0}
              />
              <StatCard
                label="Eventos críticos 24h"
                value={String(governance.data.security.criticalAudit24h)}
                detail={`${governance.data.security.activeSessions} sesiones activas`}
                alert={governance.data.security.criticalAudit24h > 0}
              />
            </section>

            <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5 lg:col-span-2">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#0D1B2A]">Mapa de control institucional</p>
                    <p className="text-xs text-[#5B6670]">Accesos directos a cada dominio gobernable.</p>
                  </div>
                  <Activity className="h-5 w-5 text-[#34B27A]" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {MODULES.map(({ href, title, description, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className="group rounded-2xl border border-[#0D1B2A]/10 p-4 transition hover:border-[#34B27A]/40 hover:bg-[#34B27A]/[0.03]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-[#0D1B2A] p-2.5 text-white group-hover:bg-[#34B27A]">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#0D1B2A]">{title}</p>
                          <p className="mt-1 text-xs leading-5 text-[#5B6670]">{description}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5">
                <div className="mb-4 flex items-center gap-2">
                  <HeartPulse className="h-5 w-5 text-[#34B27A]" />
                  <div>
                    <p className="text-sm font-bold text-[#0D1B2A]">Cola de atención</p>
                    <p className="text-xs text-[#5B6670]">Asuntos que requieren decisión.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Link href="/nvetcareapp/dashboard/veterinarios" className="flex items-center justify-between rounded-xl border border-[#0D1B2A]/8 px-3 py-3 text-sm">
                    <span className="text-[#333A40]">Verificación veterinaria</span>
                    <strong className={governance.data.veterinarians.pendingReview > 0 ? 'text-[#FF8A3D]' : 'text-[#34B27A]'}>{governance.data.veterinarians.pendingReview}</strong>
                  </Link>
                  <Link href="/nvetcareapp/dashboard/contabilidad" className="flex items-center justify-between rounded-xl border border-[#0D1B2A]/8 px-3 py-3 text-sm">
                    <span className="text-[#333A40]">Pagos pendientes</span>
                    <strong className={governance.data.finance.pending > 0 ? 'text-[#FF8A3D]' : 'text-[#34B27A]'}>{governance.data.finance.pending}</strong>
                  </Link>
                  <Link href="/nvetcareapp/dashboard/contabilidad" className="flex items-center justify-between rounded-xl border border-[#0D1B2A]/8 px-3 py-3 text-sm">
                    <span className="text-[#333A40]">Disputas financieras</span>
                    <strong className={governance.data.finance.disputed > 0 ? 'text-[#FF8A3D]' : 'text-[#34B27A]'}>{governance.data.finance.disputed}</strong>
                  </Link>
                  <Link href="/nvetcareapp/dashboard/auditoria" className="flex items-center justify-between rounded-xl border border-[#0D1B2A]/8 px-3 py-3 text-sm">
                    <span className="text-[#333A40]">Alertas críticas 24h</span>
                    <strong className={governance.data.security.criticalAudit24h > 0 ? 'text-[#FF8A3D]' : 'text-[#34B27A]'}>{governance.data.security.criticalAudit24h}</strong>
                  </Link>
                </div>
              </div>
            </section>

            <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-5 w-5 text-[#34B27A]" />
                  <p className="text-sm font-bold text-[#0D1B2A]">Distribución de autoridad</p>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  {['SUPERADMIN', 'ADMIN', 'VET', 'CLIENT'].map((role) => (
                    <div key={role} className="flex justify-between border-b border-[#0D1B2A]/5 pb-2 last:border-0">
                      <span className="text-[#5B6670]">{role}</span>
                      <strong className="text-[#0D1B2A]">{governance.data.users.byRole[role] ?? 0}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-[#FF8A3D]" />
                  <p className="text-sm font-bold text-[#0D1B2A]">Riesgo operacional</p>
                </div>
                <div className="mt-4 space-y-2 text-sm text-[#5B6670]">
                  <div className="flex justify-between"><span>Transacciones fallidas</span><strong className="text-[#0D1B2A]">{governance.data.finance.failed}</strong></div>
                  <div className="flex justify-between"><span>Reportes de mensajes</span><strong className="text-[#0D1B2A]">{governance.data.moderation.openMessageReports}</strong></div>
                  <div className="flex justify-between"><span>Citas disputadas</span><strong className="text-[#0D1B2A]">{governance.data.appointments.disputed}</strong></div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5">
                <div className="flex items-center gap-2">
                  <CircleDollarSign className="h-5 w-5 text-[#34B27A]" />
                  <p className="text-sm font-bold text-[#0D1B2A]">Economía de plataforma</p>
                </div>
                {metrics.ok ? (
                  <div className="mt-4 space-y-2 text-sm text-[#5B6670]">
                    <div className="flex justify-between"><span>Ingresos brutos</span><strong className="text-[#0D1B2A]">{money.format(metrics.metrics.revenue.gross)}</strong></div>
                    <div className="flex justify-between"><span>Comisiones</span><strong className="text-[#0D1B2A]">{money.format(metrics.metrics.revenue.commissions)}</strong></div>
                    <div className="flex justify-between"><span>Transacciones</span><strong className="text-[#0D1B2A]">{metrics.metrics.revenue.transactionCount}</strong></div>
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-[#5B6670]">Métricas económicas temporalmente no disponibles.</p>
                )}
              </div>
            </section>

            <p className="mt-5 text-right text-[11px] text-[#7C8791]">
              Snapshot de gobernanza: {new Date(governance.data.generatedAt).toLocaleString('es-CO')}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
