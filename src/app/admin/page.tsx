import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Beer,
  Bell,
  BrainCircuit,
  CircleDollarSign,
  Database,
  Factory,
  ListChecks,
  Lock,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';

import { StatCard } from '@/components/admin/StatCard';
import { formatCents } from '@/lib/format';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';

type AdminCommandSnapshot = {
  generated_at: string;
  total_users: number;
  pending_kyc: number;
  pending_deposits: number;
  operational_wallet_balance_cents: number;
  total_lots: number;
  pending_investment_orders: number;
  funding_open_lots: number;
};

type InvestmentRole =
  | 'SUPER_ADMIN'
  | 'FINANCE_ADMIN'
  | 'PRODUCTION_MANAGER'
  | 'INVENTORY_MANAGER'
  | 'SALES_MANAGER'
  | 'AUDITOR'
  | 'PARTICIPANT'
  | null;

export default async function AdminOverviewPage() {
  if (!isSupabaseConfigured) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/iniciar-sesion');

  const [{ data, error }, { data: investmentProfile }] = await Promise.all([
    supabase.rpc('get_admin_command_snapshot'),
    supabase
      .from('investment_participant_profiles')
      .select('investment_role')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  if (error) throw new Error(`No se pudo cargar el snapshot administrativo: ${error.message}`);

  const snapshot = data as AdminCommandSnapshot;
  const investmentRole = (investmentProfile?.investment_role ?? null) as InvestmentRole;
  const isSuperAdmin = investmentRole === 'SUPER_ADMIN';

  const totalUsers = Number(snapshot?.total_users ?? 0);
  const pendingKyc = Number(snapshot?.pending_kyc ?? 0);
  const pendingDeposits = Number(snapshot?.pending_deposits ?? 0);
  const totalFundsCents = Number(snapshot?.operational_wallet_balance_cents ?? 0);
  const lots = Number(snapshot?.total_lots ?? 0);
  const pendingOrders = Number(snapshot?.pending_investment_orders ?? 0);
  const openLots = Number(snapshot?.funding_open_lots ?? 0);
  const attentionCount = pendingKyc + pendingDeposits + pendingOrders;
  const generatedAt = snapshot?.generated_at
    ? new Date(snapshot.generated_at).toLocaleString('es-CO', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Ahora';

  return (
    <div className="space-y-8 lg:space-y-10">
      <section
        className="relative overflow-hidden rounded-[30px] border border-white/[.085] px-6 py-7 sm:px-8 sm:py-9 lg:px-10"
        style={{
          background: 'linear-gradient(135deg,rgba(20,20,20,.975),rgba(8,8,8,.94))',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.025),0 30px 80px rgba(0,0,0,.24)',
        }}
      >
        <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full border border-accent/[.08]" />
        <div className="absolute -right-12 -top-20 h-56 w-56 rounded-full border border-accent/[.06]" />
        <div className="absolute bottom-0 right-0 h-44 w-[55%] bg-[radial-gradient(circle_at_70%_100%,rgba(201,169,98,.09),transparent_58%)]" />

        <div className="relative grid gap-7 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_12px_rgba(201,169,98,.8)]" />
              <p className="text-[8px] uppercase tracking-[.28em] text-accent">
                CTG One · {isSuperAdmin ? 'Superadmin Command Center' : 'Administrative Command Layer'}
              </p>
              <span className="rounded-full border border-accent/20 bg-accent/[.05] px-2.5 py-1 text-[7px] font-semibold uppercase tracking-[.18em] text-accent">
                {investmentRole ?? 'GLOBAL ADMIN'}
              </span>
            </div>

            <h1 className="max-w-4xl text-4xl font-outfit font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              {isSuperAdmin ? (
                <>
                  Superadmin <span className="text-accent">Command Center</span>
                </>
              ) : (
                <>
                  Admin <span className="text-accent">OS</span>
                </>
              )}
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-text-muted">
              {isSuperAdmin
                ? 'Vista ejecutiva del ecosistema CTG One. Desde aquí puedes priorizar excepciones, entrar a controles críticos y supervisar identidad, finanzas, inversión, producción, seguridad y gobierno de acceso sin mezclar este entorno con el dashboard de usuario.'
                : 'Control central de identidad, operaciones, inversión, producción, trazabilidad y conocimiento. Cada dominio conserva su propia autorización y fuente de verdad.'}
            </p>
          </div>

          <div className="grid min-w-[250px] grid-cols-2 gap-2 sm:min-w-[320px]">
            <HeroMetric label="Atención requerida" value={String(attentionCount)} alert={attentionCount > 0} />
            <HeroMetric label="Usuarios" value={String(totalUsers)} />
            <HeroMetric label="Lotes abiertos" value={String(openLots)} />
            <HeroMetric label="Snapshot" value={generatedAt} compact />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[8px] uppercase tracking-[.22em] text-text-dim">LIVE OVERVIEW</p>
            <h2 className="mt-2 text-xl font-outfit font-semibold text-white">Estado operativo</h2>
          </div>
          <p className="text-[10px] text-text-dim">Snapshot agregado desde Supabase · {generatedAt}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <StatCard label="Usuarios" value={String(totalUsers)} href="/admin/usuarios" />
          <StatCard label="Fondos operativos" value={formatCents(totalFundsCents)} />
          <StatCard label="Lotes registrados" value={String(lots)} href="/admin/operations" />
          <StatCard
            label="Pagos inversión por verificar"
            value={String(pendingOrders)}
            href="/inversion/admin/orders"
            highlight={pendingOrders > 0}
          />
        </div>
      </section>

      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[8px] uppercase tracking-[.22em] text-text-dim">PRIORITY QUEUE</p>
            <h2 className="mt-2 text-2xl font-outfit font-semibold tracking-tight text-white">Pendientes que requieren decisión</h2>
          </div>
          <span className="rounded-full border border-white/[.08] px-3 py-1.5 text-[8px] uppercase tracking-[.14em] text-text-dim">
            {attentionCount === 0 ? 'Sin pendientes críticos' : `${attentionCount} pendientes`}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <QueueCard
            href="/admin/kyc"
            icon={<ShieldCheck size={18} />}
            label="Identity & KYC"
            value={pendingKyc}
            text="Verificaciones de identidad pendientes de revisión administrativa."
          />
          <QueueCard
            href="/admin/depositos"
            icon={<Wallet size={18} />}
            label="Depósitos"
            value={pendingDeposits}
            text="Recargas operativas que todavía requieren validación."
          />
          <QueueCard
            href="/inversion/admin/orders"
            icon={<CircleDollarSign size={18} />}
            label="Órdenes de inversión"
            value={pendingOrders}
            text="Pagos de inversión pendientes de verificación antes de allocation y ledger."
          />
        </div>
      </section>

      {isSuperAdmin ? (
        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[8px] uppercase tracking-[.22em] text-accent">SUPERADMIN CONTROLS</p>
              <h2 className="mt-2 text-2xl font-outfit font-semibold tracking-tight text-white">Control de alto privilegio</h2>
            </div>
            <p className="max-w-xl text-right text-[10px] leading-relaxed text-text-dim">
              Accesos exclusivos de SUPER_ADMIN. Estas rutas permanecen separadas del entorno ordinario de usuario.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <CommandCard
              href="/admin/system-health"
              icon={<Activity size={18} />}
              title="System Health"
              eyebrow="OBSERVABILITY"
              text="Revisa salud de servicios, integraciones y dependencias antes de intervenir otros dominios."
            />
            <CommandCard
              href="/admin/analytics"
              icon={<BarChart3 size={18} />}
              title="Analytics"
              eyebrow="INTELLIGENCE"
              text="Consulta métricas ejecutivas y señales agregadas del ecosistema administrativo."
            />
            <CommandCard
              href="/admin/roles"
              icon={<Users size={18} />}
              title="Roles & Access"
              eyebrow="GOVERNANCE"
              text="Administra privilegios globales y valida que cada operador conserve únicamente el alcance necesario."
            />
            <CommandCard
              href="/admin/finance/reconciliation"
              icon={<CircleDollarSign size={18} />}
              title="Financial Reconciliation"
              eyebrow="FINANCE"
              text="Contrasta proveedores, rails y registros internos antes de resolver discrepancias financieras."
            />
            <CommandCard
              href="/admin/security/mfa"
              icon={<Lock size={18} />}
              title="Security & MFA"
              eyebrow="SECURITY"
              text="Supervisa controles de autenticación reforzada para operaciones administrativas sensibles."
            />
            <CommandCard
              href="/admin/rewards"
              icon={<Settings size={18} />}
              title="Rewards Lab"
              eyebrow="EXPERIMENTATION"
              text="Opera el laboratorio de rewards, fuentes y shadow mode desde un dominio aislado."
            />
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[8px] uppercase tracking-[.22em] text-text-dim">CONTROL DOMAINS</p>
            <h2 className="mt-2 text-2xl font-outfit font-semibold tracking-tight text-white">Módulos administrativos</h2>
          </div>
          <p className="hidden max-w-md text-right text-[10px] leading-relaxed text-text-dim lg:block">
            Cada módulo representa un dominio operacional. Entra únicamente cuando necesites actuar sobre ese flujo.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Module
            href="/admin/operations"
            icon={<Factory size={19} />}
            code="OPS-01"
            title="Production & Traceability"
            text={`${lots} lotes · ${openLots} con financiación abierta. Crea lotes, avanza producción, serializa botellas, mueve inventario y registra ventas.`}
          />
          <Module
            href="/inversion/admin/orders"
            icon={<Beer size={19} />}
            code="INV-02"
            title="Investment Administration"
            text="Revisa órdenes y comprobantes. La aprobación es la única vía que convierte un pago validado en allocation y ledger."
          />
          <Module
            href="/admin/kyc"
            icon={<ShieldCheck size={19} />}
            code="ID-03"
            title="Identity & KYC"
            text={`${pendingKyc} verificaciones pendientes. La identidad de inversión permanece separada de la cuenta operativa.`}
          />
          <Module
            href="/admin/depositos"
            icon={<CircleDollarSign size={19} />}
            code="FIN-04"
            title="Account Operations"
            text={`${pendingDeposits} recargas pendientes. Administra el saldo operacional CTG One, separado del ledger de inversión.`}
          />
          <Module
            href="/admin/knowledge"
            icon={<BrainCircuit size={19} />}
            code="KNW-05"
            title="Knowledge Curation"
            text="Administra el corpus autorizado de CTG Knowledge y conserva evidencia antes de respuestas."
          />
          <Module
            href="/admin/usuarios"
            icon={<Users size={19} />}
            code="IAM-06"
            title="Users & Access"
            text="Consulta usuarios y roles globales. Las facultades específicas de inversión continúan gobernadas por investment_role."
          />
          <Module
            href="/admin/release-readiness"
            icon={<ListChecks size={19} />}
            code="REL-07"
            title="Investment Release Readiness"
            text="Consolida evidencia técnica, runtime, operación, decisiones pendientes y controles fail-closed antes de cualquier promoción de Investment."
          />
          {isSuperAdmin ? (
            <Module
              href="/admin/worldmakers"
              icon={<Bell size={19} />}
              code="ECO-08"
              title="World Makers Administration"
              text="Accede al dominio administrativo de World Makers sin mezclar sus flujos con la experiencia normal de participante."
            />
          ) : null}
        </div>
      </section>

      <section
        className="flex flex-col gap-4 rounded-2xl border border-white/[.07] p-5 sm:flex-row sm:items-center sm:justify-between"
        style={{ background: 'linear-gradient(90deg,rgba(201,169,98,.035),rgba(255,255,255,.012))' }}
      >
        <div className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/15 bg-accent/[.04]">
            <Database size={17} className="text-accent" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Supabase es la fuente de verdad.</p>
            <p className="mt-1.5 max-w-4xl text-xs leading-relaxed text-text-muted">
              Admin OS no reemplaza las restricciones de base de datos. Los cambios de alto riesgo pasan por RPCs autorizadas, RLS, state machines y audit logs; la interfaz solo orquesta esos controles.
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-white/[.07] px-3 py-1.5 text-[8px] uppercase tracking-[.14em] text-text-dim">
          Governed runtime
        </span>
      </section>
    </div>
  );
}

function HeroMetric({
  label,
  value,
  alert = false,
  compact = false,
}: {
  label: string;
  value: string;
  alert?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/[.07] bg-white/[.018] px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[7px] uppercase tracking-[.14em] text-text-dim">{label}</p>
        <span className={`h-1.5 w-1.5 rounded-full ${alert ? 'bg-accent shadow-[0_0_10px_rgba(201,169,98,.8)]' : 'bg-emerald-400/55'}`} />
      </div>
      <p className={`mt-2 font-outfit font-semibold text-white ${compact ? 'text-[11px]' : 'text-2xl'}`}>{value}</p>
    </div>
  );
}

function QueueCard({
  href,
  icon,
  label,
  value,
  text,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: number;
  text: string;
}) {
  const requiresAttention = value > 0;
  return (
    <Link
      href={href}
      className={`group rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-0.5 ${
        requiresAttention
          ? 'border-accent/20 bg-accent/[.035] hover:border-accent/35'
          : 'border-white/[.07] bg-white/[.015] hover:border-white/[.12]'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[.07] bg-black/20 text-accent">
          {icon}
        </div>
        <span className={`font-outfit text-3xl font-semibold ${requiresAttention ? 'text-accent' : 'text-white'}`}>{value}</span>
      </div>
      <h3 className="mt-5 text-sm font-semibold text-white">{label}</h3>
      <p className="mt-2 text-[11px] leading-5 text-text-muted">{text}</p>
      <div className="mt-4 flex items-center justify-between border-t border-white/[.05] pt-3">
        <span className="text-[8px] uppercase tracking-[.14em] text-accent">Revisar</span>
        <ArrowUpRight size={14} className="text-text-dim transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
      </div>
    </Link>
  );
}

function CommandCard({
  href,
  icon,
  title,
  eyebrow,
  text,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  eyebrow: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-accent/[.13] bg-[linear-gradient(145deg,rgba(201,169,98,.055),rgba(255,255,255,.012))] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-[0_18px_50px_rgba(201,169,98,.05)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/15 bg-accent/[.04] text-accent">
          {icon}
        </div>
        <ArrowUpRight size={14} className="text-text-dim transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
      </div>
      <p className="mt-5 text-[7px] font-semibold uppercase tracking-[.18em] text-accent">{eyebrow}</p>
      <h3 className="mt-2 text-base font-outfit font-semibold text-white">{title}</h3>
      <p className="mt-2 text-[11px] leading-5 text-text-muted">{text}</p>
    </Link>
  );
}

function Module({
  href,
  icon,
  code,
  title,
  text,
}: {
  href: string;
  icon: React.ReactNode;
  code: string;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-white/[.075] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/20 sm:p-6"
      style={{
        background: 'linear-gradient(145deg,rgba(255,255,255,.032),rgba(255,255,255,.010))',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.02)',
      }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[.08] to-transparent" />
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/15 bg-accent/[.035] text-accent transition-transform duration-300 group-hover:scale-105">
          {icon}
        </div>
        <span className="font-mono text-[8px] tracking-[.12em] text-text-dim">{code}</span>
      </div>
      <h3 className="text-lg font-outfit font-semibold tracking-tight text-white">{title}</h3>
      <p className="mt-3 min-h-[54px] text-xs leading-relaxed text-text-muted">{text}</p>
      <div className="mt-5 flex items-center justify-between border-t border-white/[.05] pt-4">
        <span className="text-[8px] uppercase tracking-[.14em] text-accent">Abrir módulo</span>
        <ArrowUpRight size={14} className="text-text-dim transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
      </div>
    </Link>
  );
}
