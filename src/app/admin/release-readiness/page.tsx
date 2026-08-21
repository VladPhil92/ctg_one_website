import { redirect } from 'next/navigation';
import { AlertTriangle, CheckCircle2, CirclePause, LockKeyhole, ShieldCheck, XCircle } from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { getCapabilityProof } from '@/data/technology-proof';
import {
  INVESTMENT_HUMAN_RELEASE_APPROVED,
  INVESTMENT_REQUIRED_BUSINESS_DECISION_IDS,
  INVESTMENT_REVIEWED_OPERATING_EVIDENCE,
} from '@/data/investment-release-governance.mjs';
import { investmentFlags } from '@/lib/investment/flags';
import { buildInvestmentReleaseGateMatrix } from '@/lib/investment/release-gates.mjs';
import { getDeploymentMetadata } from '@/lib/observability/deployment';
import { probeRuntimeSchemaCompatibility } from '@/lib/observability/runtime-schema';

export const dynamic = 'force-dynamic';

const statusMeta = {
  PASS: { label: 'PASS', icon: CheckCircle2, className: 'border-emerald-500/25 bg-emerald-500/[.06] text-emerald-300' },
  SAFE_CLOSED: { label: 'SAFE CLOSED', icon: LockKeyhole, className: 'border-sky-500/25 bg-sky-500/[.06] text-sky-300' },
  PENDING_EVIDENCE: { label: 'PENDING EVIDENCE', icon: CirclePause, className: 'border-amber-500/25 bg-amber-500/[.06] text-amber-300' },
  BLOCKED_DECISION: { label: 'BLOCKED DECISION', icon: AlertTriangle, className: 'border-orange-500/25 bg-orange-500/[.06] text-orange-300' },
  FAIL: { label: 'FAIL', icon: XCircle, className: 'border-red-500/25 bg-red-500/[.06] text-red-300' },
} as const;

type Gate = {
  id: string;
  category: string;
  label: string;
  status: keyof typeof statusMeta;
  detail: string;
  source: string;
};

export default async function InvestmentReleaseReadinessPage() {
  if (!isSupabaseConfigured) redirect('/');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/iniciar-sesion');

  const [{ data: profile }, { data: investmentProfile }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    supabase.from('investment_participant_profiles').select('investment_role').eq('user_id', user.id).maybeSingle(),
  ]);

  if (profile?.role !== 'admin') redirect('/dashboard');
  if (investmentProfile?.investment_role !== 'SUPER_ADMIN') redirect('/admin');

  const [schema] = await Promise.all([probeRuntimeSchemaCompatibility()]);
  const matrix = buildInvestmentReleaseGateMatrix({
    capability: getCapabilityProof('investment-platform'),
    deployment: getDeploymentMetadata(),
    schemaCompatible: schema.compatible,
    flags: investmentFlags,
    pendingBusinessDecisionIds: INVESTMENT_REQUIRED_BUSINESS_DECISION_IDS,
    operatingEvidenceReport: INVESTMENT_REVIEWED_OPERATING_EVIDENCE,
    humanReleaseApproved: INVESTMENT_HUMAN_RELEASE_APPROVED,
  });

  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden rounded-[30px] border border-white/[.085] px-6 py-7 sm:px-8 sm:py-9" style={{ background: 'linear-gradient(135deg,rgba(20,20,20,.97),rgba(8,8,8,.94))' }}>
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full border border-accent/[.08]" />
        <div className="relative">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck size={14} className="text-accent" />
            <p className="text-[8px] uppercase tracking-[.28em] text-accent">CTG Craft Beer Investment · Release Governance</p>
          </div>
          <h1 className="text-3xl font-outfit font-semibold tracking-tight text-white sm:text-5xl">Release Gate Matrix</h1>
          <p className="mt-4 max-w-4xl text-sm leading-relaxed text-text-muted">
            Lectura determinista de los requisitos para una eventual promoción a LIVE. Esta pantalla no modifica flags, dinero, inventario, evidencia ni madurez pública.
          </p>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Technical status" value={matrix.currentMaturity.technicalStatus} />
        <Metric label="Public stage" value={matrix.currentMaturity.publicStatus} />
        <Metric label="Promotion review" value={matrix.promotionReviewEligible ? 'ELIGIBLE' : 'BLOCKED'} />
        <Metric label="LIVE promotion" value={matrix.livePromotionEligible ? 'ELIGIBLE' : 'BLOCKED'} />
      </section>

      <section className="rounded-2xl border border-white/[.07] bg-white/[.018] p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[8px] uppercase tracking-[.2em] text-text-dim">Safety state</p>
            <h2 className="mt-2 text-xl font-outfit font-semibold text-white">Fail-closed exposure</h2>
          </div>
          <div className="flex flex-wrap gap-2 text-[9px] uppercase tracking-[.12em]">
            <span className={`rounded-full border px-3 py-1.5 ${matrix.publicExposureSafe ? 'border-emerald-500/20 text-emerald-300' : 'border-red-500/25 text-red-300'}`}>Public exposure · {matrix.publicExposureSafe ? 'safe' : 'unsafe'}</span>
            <span className={`rounded-full border px-3 py-1.5 ${matrix.automaticMoneyMovementSafe ? 'border-emerald-500/20 text-emerald-300' : 'border-red-500/25 text-red-300'}`}>Automation · {matrix.automaticMoneyMovementSafe ? 'safe' : 'unsafe'}</span>
            <span className="rounded-full border border-white/[.08] px-3 py-1.5 text-text-dim">Auto promotion · disabled</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {(matrix.gates as Gate[]).map((item) => {
          const meta = statusMeta[item.status];
          const Icon = meta.icon;
          return (
            <article key={item.id} className="rounded-2xl border border-white/[.075] bg-white/[.018] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[8px] uppercase tracking-[.18em] text-text-dim">{item.category}</p>
                  <h2 className="mt-2 text-lg font-outfit font-semibold text-white">{item.label}</h2>
                </div>
                <span className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[8px] uppercase tracking-[.12em] ${meta.className}`}>
                  <Icon size={11} /> {meta.label}
                </span>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-text-muted">{item.detail}</p>
              <p className="mt-4 border-t border-white/[.05] pt-3 font-mono text-[9px] text-text-dim">Source · {item.source}</p>
            </article>
          );
        })}
      </section>

      <section className="rounded-2xl border border-amber-500/15 bg-amber-500/[.035] p-5 text-xs leading-relaxed text-text-muted">
        <p className="font-medium text-amber-200">Regla de gobernanza</p>
        <p className="mt-2">Un resultado verde en CI, Render o una captura de evidencia nunca cambia por sí solo la capacidad a LIVE. Las decisiones BR pendientes se resuelven exclusivamente en el modelo de negocio y la promoción final requiere una decisión humana explícita.</p>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[.075] bg-white/[.018] p-5">
      <p className="text-[8px] uppercase tracking-[.16em] text-text-dim">{label}</p>
      <p className="mt-2 text-xl font-outfit font-semibold text-white">{value}</p>
    </div>
  );
}
