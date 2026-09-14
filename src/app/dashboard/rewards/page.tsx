'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Award, Clock3, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';

import { AccountSurface } from '@/components/dashboard/AccountSurface';
import { useAuth } from '@/contexts/AuthContext';
import { useRewardsSummary, type RewardsLedgerEntry } from '@/hooks/useRewardsSummary';
import { trackFunnelEvent } from '@/lib/analytics/client';

function formatPoints(value: number) {
  return new Intl.NumberFormat('es-CO').format(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function entryLabel(entry: RewardsLedgerEntry) {
  if (entry.entry_type === 'earn') return 'Reconocimiento';
  if (entry.entry_type === 'reversal') return 'Reversión';
  return 'Ajuste auditado';
}

export default function RewardsDashboardPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { summary, refresh } = useRewardsSummary();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/iniciar-sesion?next=/dashboard/rewards');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void trackFunnelEvent('first_service_used', {
      sourcePath: '/dashboard/rewards',
      serviceKey: 'rewards',
    });
  }, [isAuthenticated]);

  if (isLoading || !isAuthenticated) return null;

  return (
    <AccountSurface
      code="RWD-11"
      eyebrow="CTG Rewards · Foundation v1"
      title="Rewards"
      description="Tu capa de reconocimiento dentro de CTG One. La infraestructura de cuenta y trazabilidad ya existe; las reglas comerciales para acumular y redimir todavía no están activas."
      icon={<Award size={21} aria-hidden="true" />}
    >
      <section className="accountPanel">
        <div className="accountPanelHeader">
          <div>
            <p className="accountMicro"><Sparkles size={11} aria-hidden="true" /> Estado de Foundation v1</p>
            <h2>Tu cuenta Rewards</h2>
            <p>Lectura autenticada y auditable, separada de Wallet y CTGO.</p>
          </div>
          <button
            type="button"
            className="accountNode"
            onClick={() => void refresh()}
            aria-label="Actualizar Rewards"
            title="Actualizar Rewards"
          >
            <RefreshCw size={16} className={summary.state === 'loading' ? 'animate-spin' : ''} aria-hidden="true" />
          </button>
        </div>

        {summary.state === 'error' ? (
          <div className="accountNotice error" role="alert">
            <ShieldCheck size={18} aria-hidden="true" />
            <div>
              <strong>No pudimos verificar tu cuenta Rewards.</strong>
              <p>No mostraremos un saldo supuesto. Actualiza la lectura antes de interpretar el estado de tu cuenta.</p>
            </div>
          </div>
        ) : null}

        {summary.state !== 'error' ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <article className="rounded-2xl border border-white/[.08] bg-white/[.025] p-5">
              <p className="accountMicro">Saldo registrado</p>
              <strong className="mt-3 block font-outfit text-3xl font-semibold text-white">
                {summary.state === 'loading' ? '—' : `${formatPoints(summary.account?.pointsBalance ?? 0)} pts`}
              </strong>
              <p className="mt-2 text-[11px] leading-5 text-white/40">Puntos de fidelización no monetarios.</p>
            </article>
            <article className="rounded-2xl border border-white/[.08] bg-white/[.025] p-5">
              <p className="accountMicro">Histórico positivo</p>
              <strong className="mt-3 block font-outfit text-3xl font-semibold text-white">
                {summary.state === 'loading' ? '—' : `${formatPoints(summary.account?.lifetimeEarned ?? 0)} pts`}
              </strong>
              <p className="mt-2 text-[11px] leading-5 text-white/40">Solo refleja entradas registradas en el ledger.</p>
            </article>
            <article className="rounded-2xl border border-white/[.08] bg-white/[.025] p-5">
              <p className="accountMicro">Programa comercial</p>
              <strong className="mt-3 block font-outfit text-xl font-semibold text-[#e3b653]">No activo</strong>
              <p className="mt-2 text-[11px] leading-5 text-white/40">Acumulación y redención permanecen deshabilitadas.</p>
            </article>
          </div>
        ) : null}
      </section>

      <section className="accountPanel">
        <div className="accountPanelHeader">
          <div>
            <p className="accountMicro"><ShieldCheck size={11} aria-hidden="true" /> Product truth</p>
            <h2>Qué significa —y qué no significa— tu saldo</h2>
          </div>
        </div>
        <div className="accountNotice warning">
          <ShieldCheck size={18} aria-hidden="true" />
          <div>
            <strong>CTG Rewards no es dinero, cashback ni un criptoactivo.</strong>
            <p>Los puntos no tienen valor en COP, no son transferibles, no pueden convertirse a CTGO y todavía no existe una redención activa entre negocios. Foundation v1 construye la infraestructura antes de publicar reglas comerciales.</p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ['Cuenta Rewards', 'Disponible como infraestructura autenticada'],
            ['Historial auditable', 'Disponible cuando existan movimientos registrados'],
            ['Reglas para acumular', 'Pendiente de publicación y activación'],
            ['Redención entre negocios', 'Pendiente de publicación y activación'],
            ['Referidos', 'Pendiente de reglas comerciales'],
            ['Conversión a CTGO', 'No habilitada'],
          ].map(([label, value]) => (
            <div key={label} className="accountMetaRow">
              <span>{label}</span>
              <span>{value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="accountPanel">
        <div className="accountPanelHeader">
          <div>
            <p className="accountMicro"><Clock3 size={11} aria-hidden="true" /> Ledger</p>
            <h2>Historial de Rewards</h2>
            <p>Solo aparecen movimientos realmente registrados. No reconstruimos beneficios retroactivos.</p>
          </div>
        </div>

        {summary.state === 'ready' && summary.ledger.length === 0 ? (
          <div className="accountNotice">
            <Clock3 size={18} aria-hidden="true" />
            <div>
              <strong>Aún no existen movimientos.</strong>
              <p>Esto es coherente con Foundation v1: no se otorgaron puntos por actividad histórica y no hay una campaña de acumulación activa.</p>
            </div>
          </div>
        ) : null}

        {summary.state === 'ready' && summary.ledger.length > 0 ? (
          <div className="divide-y divide-white/[.06]">
            {summary.ledger.map((entry) => (
              <article key={entry.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <strong className="text-xs font-medium text-white">{entry.description || entryLabel(entry)}</strong>
                  <p className="mt-1 text-[10px] text-white/38">{entry.source_domain} · {formatDate(entry.created_at)}</p>
                </div>
                <div className="sm:text-right">
                  <strong className={entry.points_delta > 0 ? 'text-sm text-emerald-300' : 'text-sm text-rose-300'}>
                    {entry.points_delta > 0 ? '+' : ''}{formatPoints(entry.points_delta)} pts
                  </strong>
                  <p className="mt-1 text-[10px] text-white/35">Saldo: {formatPoints(entry.balance_after)} pts</p>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        <div className="mt-5 border-t border-white/[.06] pt-4 text-[11px] text-white/40">
          <Link href="/rewards" className="text-[#e3b653] hover:underline">Ver estado público y alcance de CTG Rewards</Link>
        </div>
      </section>
    </AccountSurface>
  );
}
