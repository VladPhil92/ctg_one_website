'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Calculator, Check, Copy, Gift, RefreshCw, ShieldCheck, UsersRound } from 'lucide-react';
import { AccountSurface } from '@/components/dashboard/AccountSurface';
import { useAuth } from '@/contexts/AuthContext';
import { ACCELERATE_TERMS, simulateAcceleration, type AccelerateTerm } from '@/lib/accelerate/simulation';

type AccelerateSummary = {
  ok: true;
  referralCode: string;
  counts: { registered: number; qualified: number };
  status: {
    attributionTracking: string;
    rewards: string;
    cashBalanceCredits: boolean;
    principalRecoveryCredits: boolean;
    contractMaturityChanges: boolean;
  };
};

type ReadState = 'loading' | 'ready' | 'error';

function asMinor(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= 1_000_000_000
    ? Math.round(value * 100)
    : -1;
}

function usdt(minor: number) {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / 100) + ' USDT';
}

export default function AccelerateDashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [state, setState] = useState<ReadState>('loading');
  const [summary, setSummary] = useState<AccelerateSummary | null>(null);
  const [copied, setCopied] = useState(false);
  const [capital, setCapital] = useState(1000);
  const [term, setTerm] = useState<AccelerateTerm>(12);
  const [bonus, setBonus] = useState(0);
  const [simulatedReferrals, setSimulatedReferrals] = useState(10);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/iniciar-sesion?next=/dashboard/accelerate');
    }
  }, [isLoading, isAuthenticated, router]);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!isAuthenticated) return;
    setState('loading');
    try {
      const response = await fetch('/api/accelerate/summary', {
        credentials: 'same-origin',
        cache: 'no-store',
        signal,
      });
      if (!response.ok) throw new Error('Unavailable');
      const data: AccelerateSummary = await response.json();
      if (!data.ok || !/^CTG-[A-F0-9]{16}$/.test(data.referralCode)) throw new Error('Invalid response');
      if (!signal?.aborted) {
        setSummary(data);
        setState('ready');
      }
    } catch {
      if (!signal?.aborted) {
        setSummary(null);
        setState('error');
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [isAuthenticated, load]);

  const inviteLink = summary && typeof window !== 'undefined'
    ? `${window.location.origin}/registro?ref=${encodeURIComponent(summary.referralCode)}`
    : null;

  const simulation = useMemo(() => {
    try {
      return simulateAcceleration({
        capitalMinor: asMinor(capital),
        qualifiedReferrals: simulatedReferrals,
        hypotheticalRewardMinorEach: asMinor(bonus),
        termMonths: term,
      });
    } catch {
      return null;
    }
  }, [capital, term, bonus, simulatedReferrals]);

  async function copyLink() {
    if (!inviteLink || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (isLoading || !isAuthenticated) return null;

  return (
    <AccountSurface
      code="ACC-12"
      eyebrow="CTG One · CTG Accelerate"
      title="Referidos y aceleración"
      description="Invita personas a CTG One, consulta el seguimiento verificable de tus referidos y simula posibles escenarios de recuperación de capital. El programa económico aún no está habilitado."
      icon={<Gift size={21} aria-hidden="true" />}
    >
      <section className="accountPanel">
        <div className="accountPanelHeader">
          <div>
            <p className="accountMicro"><UsersRound size={12} aria-hidden="true" /> Mis referidos</p>
            <h2>Comparte tu invitación</h2>
            <p>La vinculación se registra al crear una cuenta nueva mediante tu enlace.</p>
          </div>
          <button type="button" className="accountNode" onClick={() => void load()} aria-label="Actualizar referidos">
            <RefreshCw size={16} className={state === 'loading' ? 'animate-spin' : ''} />
          </button>
        </div>
        {state === 'loading' ? (
          <p className="text-sm text-white/55" role="status">Consultando tu cuenta de referidos…</p>
        ) : state === 'error' ? (
          <div className="accountNotice error" role="alert">
            <ShieldCheck size={18} />
            <div>
              <strong>No pudimos verificar tus referidos.</strong>
              <p>La información no se sustituye por cantidades inventadas. Comprueba que la migración de CTG Accelerate esté instalada.</p>
            </div>
          </div>
        ) : summary ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <article className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
                <p className="accountMicro">Cuentas registradas</p>
                <strong className="mt-3 block font-outfit text-3xl text-white">{summary.counts.registered}</strong>
                <p className="mt-2 text-xs text-white/45">Cuentas nuevas atribuidas a tu invitación.</p>
              </article>
              <article className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
                <p className="accountMicro">Candidatos verificados</p>
                <strong className="mt-3 block font-outfit text-3xl text-[#e3b653]">{summary.counts.qualified}</strong>
                <p className="mt-2 text-xs text-white/45">Con KYC de inversión aprobado y asignación financiada. No significa bonificación aprobada.</p>
              </article>
            </div>
            <div className="mt-5 rounded-2xl border border-[#e3b653]/20 bg-[#e3b653]/[.045] p-4">
              <label htmlFor="ctg-referral-link" className="mb-2 block text-xs font-semibold text-[#e3b653]">Tu enlace de invitación</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input id="ctg-referral-link" value={inviteLink ?? ''} readOnly className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-xs text-white" />
                <button type="button" onClick={() => void copyLink()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#e3b653] px-4 text-xs font-bold text-[#171207]">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copiado' : 'Copiar enlace'}
                </button>
              </div>
              <p className="mt-2 text-xs text-white/50">Código: <strong>{summary.referralCode}</strong>. No se otorgan pagos únicamente por registrar usuarios.</p>
            </div>
          </>
        ) : null}
      </section>

      <section className="accountPanel">
        <div className="accountPanelHeader">
          <div>
            <p className="accountMicro"><Calculator size={12} aria-hidden="true" /> Simulación educativa</p>
            <h2>Explora la recuperación potencial de capital</h2>
            <p>Los importes introducidos son supuestos del usuario, no condiciones comerciales vigentes.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs text-white/65">Capital hipotético (USDT)
            <input aria-label="Capital hipotético en USDT" type="number" min="0" max="1000000000" step="0.01" value={capital} onChange={(event) => setCapital(Number(event.target.value))} className="mt-2 block w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white" />
          </label>
          <label className="text-xs text-white/65">Plazo contractual original
            <select value={term} onChange={(event) => setTerm(Number(event.target.value) as AccelerateTerm)} className="mt-2 block w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white">
              {ACCELERATE_TERMS.map((months) => <option key={months} value={months} className="bg-[#111]">{months} meses</option>)}
            </select>
          </label>
          <label className="text-xs text-white/65">Referidos efectivos hipotéticos
            <input aria-label="Referidos hipotéticos" type="number" min="0" max="10000" step="1" value={simulatedReferrals} onChange={(event) => setSimulatedReferrals(Number(event.target.value))} className="mt-2 block w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white" />
          </label>
          <label className="text-xs text-white/65">Bonificación hipotética por referido (USDT)
            <input aria-label="Bonificación hipotética por referido" type="number" min="0" max="1000000000" step="0.01" value={bonus} onChange={(event) => setBonus(Number(event.target.value))} className="mt-2 block w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white" />
          </label>
        </div>
        {simulation ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-3" aria-live="polite">
            <div className="rounded-xl border border-white/10 p-4">
              <p className="text-xs text-white/50">Bonificaciones hipotéticas</p>
              <strong className="mt-2 block text-lg text-white">{usdt(Number(BigInt(simulation.hypotheticalRewardMinor) > BigInt(1_000_000_000_000) ? BigInt(1_000_000_000_000) : BigInt(simulation.hypotheticalRewardMinor)))}</strong>
            </div>
            <div className="rounded-xl border border-white/10 p-4">
              <p className="text-xs text-white/50">Potencial recuperación de principal</p>
              <strong className="mt-2 block text-lg text-[#e3b653]">{usdt(simulation.potentialPrincipalRecoveryMinor)}</strong>
            </div>
            <div className="rounded-xl border border-white/10 p-4">
              <p className="text-xs text-white/50">Principal pendiente hipotético</p>
              <strong className="mt-2 block text-lg text-white">{usdt(simulation.remainingPrincipalMinor)}</strong>
            </div>
          </div>
        ) : <p className="mt-4 text-xs text-amber-200" role="alert">Revisa los valores del simulador.</p>}
        <p className="mt-4 text-xs leading-5 text-white/55">
          La fecha contractual original no cambia en este simulador. Una bonificación solo podría aplicarse como amortización si existiera financiación efectiva, política aprobada y consentimiento contractual. No se realizan abonos ni transferencias.
        </p>
      </section>

      <section className="accountPanel">
        <div className="accountNotice warning">
          <ShieldCheck size={19} />
          <div>
            <strong>Programa económico pendiente de aprobación</strong>
            <p>CTG Accelerate registra invitaciones y verifica candidatos. No calcula recompensas exigibles, no acredita Wallet y no modifica plazos de staking. Requiere aprobación contractual, financiera y regulatoria.</p>
          </div>
        </div>
        <Link href="/inversion/app" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#e3b653]">
          Consultar mis inversiones <ArrowRight size={15} />
        </Link>
      </section>
    </AccountSurface>
  );
}
