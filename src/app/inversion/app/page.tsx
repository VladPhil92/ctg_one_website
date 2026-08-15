'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Card } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useInvestmentProfile } from '@/hooks/useInvestmentProfile';
import { useInvestmentSummary } from '@/hooks/useInvestmentSummary';
import { formatCents } from '@/lib/format';

const KYC_LABELS: Record<string, string> = {
  NOT_STARTED: 'No iniciado',
  PENDING: 'En revisión',
  VERIFIED: 'Verificado',
  REJECTED: 'Rechazado',
  REQUIRES_REVIEW: 'Requiere revisión',
};

// Participant dashboard — real data (ADR-000/domain milestone): balance
// and allocations come from investment_ledger_entries/
// investment_funding_allocations via useInvestmentSummary(), scoped to the
// signed-in user by RLS. Demo data is gone.
export default function InvestmentAppPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { profile } = useInvestmentProfile();
  const { summary, isLoading: isSummaryLoading, refresh } = useInvestmentSummary();

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/iniciar-sesion?next=/inversion/app');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent)' }} />
          <p className="text-text-muted text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const handleWithdraw = async () => {
    setWithdrawError(null);
    const pesos = Number(withdrawAmount);
    if (!pesos || pesos <= 0) {
      setWithdrawError('Ingresa un monto válido');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/investment/participant/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents: Math.round(pesos * 100) }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'No se pudo solicitar el retiro');
      setWithdrawAmount('');
      await refresh();
    } catch (err) {
      setWithdrawError(err instanceof Error ? err.message : 'No se pudo solicitar el retiro');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-12 sm:py-16">
      <Container>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-4">
          <h1 className="text-2xl sm:text-3xl font-outfit font-semibold text-white">Mi panel</h1>
          <Button href="/inversion/lotes" variant="secondary" size="sm">Ver lotes</Button>
        </div>
        <p className="text-[11px] text-text-dim mb-10">
          Estado KYC de inversión: {KYC_LABELS[profile?.kyc_status ?? 'NOT_STARTED']}
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {[
            ['Capital activo', formatCents(summary.activeCapitalCents)],
            ['Saldo disponible', formatCents(summary.availableBalanceCents)],
            ['Asignaciones activas', String(summary.allocations.length)],
          ].map(([label, value]) => (
            <Card key={label} variant="bordered" padding="sm">
              <p className="text-base sm:text-lg font-outfit font-semibold text-white">
                {isSummaryLoading ? '—' : value}
              </p>
              <p className="text-[10px] text-text-dim uppercase tracking-[0.15em] mt-1 leading-tight">{label}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          <Card variant="bordered" padding="md">
            <p className="text-sm font-medium text-white mb-4">Solicitar retiro</p>
            <div className="flex gap-3 mb-2">
              <input
                type="number"
                min="0"
                placeholder="Monto en COP"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="flex-1 px-3 py-2 rounded text-sm text-white"
                style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
              />
              <Button onClick={handleWithdraw} loading={isSubmitting} variant="primary" size="sm">
                Solicitar
              </Button>
            </div>
            {withdrawError && <p className="text-[12px]" style={{ color: 'var(--error)' }}>{withdrawError}</p>}
            <p className="text-[11px] text-text-dim mt-2">
              Saldo disponible: {formatCents(summary.availableBalanceCents)}
            </p>
          </Card>

          <Card variant="bordered" padding="md">
            <p className="text-sm font-medium text-white mb-4">Retiros recientes</p>
            {summary.withdrawalRequests.length > 0 ? (
              <ul className="space-y-2">
                {summary.withdrawalRequests.slice(0, 5).map((w) => (
                  <li key={w.id} className="flex justify-between text-[12px]">
                    <span className="text-text-dim">{new Date(w.created_at).toLocaleDateString('es-CO')}</span>
                    <span className="text-white">{formatCents(w.amount_cents)}</span>
                    <span className="text-accent">{w.status}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12px] text-text-dim">Sin solicitudes todavía.</p>
            )}
          </Card>
        </div>

        <h2 className="text-sm uppercase tracking-[0.15em] text-text-dim mb-5">Mis asignaciones</h2>
        {summary.allocations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {summary.allocations.map((a) => (
              <Card key={a.id} variant="bordered" padding="md">
                <p className="text-white font-medium">{a.case_equivalent_units} cajas equivalentes</p>
                <p className="text-[11px] text-text-dim mt-1">{formatCents(a.capital_committed_cents)} comprometido</p>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-text-dim">
            Aún no tienes asignaciones. La participación pública todavía no está habilitada
            (programa en beta cerrada).
          </p>
        )}
      </Container>
    </section>
  );
}
