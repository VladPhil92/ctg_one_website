'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Card } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useInvestmentProfile } from '@/hooks/useInvestmentProfile';
import { useInvestmentSummary } from '@/hooks/useInvestmentSummary';
import { InvestmentLiquidityPanel } from '@/components/inversion/InvestmentLiquidityPanel';
import { formatCents } from '@/lib/format';

const KYC_LABELS: Record<string, string> = {
  NOT_STARTED: 'No iniciado',
  PENDING: 'En revisión',
  VERIFIED: 'Verificado',
  REJECTED: 'Rechazado',
  REQUIRES_REVIEW: 'Requiere revisión',
};

export default function InvestmentAppPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { profile } = useInvestmentProfile();
  const { summary, isLoading: isSummaryLoading, refresh } = useInvestmentSummary();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/iniciar-sesion?next=/inversion/app');
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent)' }} /><p className="text-text-muted text-sm">Cargando...</p></div></div>;
  }
  if (!isAuthenticated) return null;

  return (
    <section className="py-12 sm:py-16">
      <Container>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-4">
          <h1 className="text-2xl sm:text-3xl font-outfit font-semibold text-white">Mi panel</h1>
          <Button href="/inversion/lotes" variant="secondary" size="sm">Ver lotes</Button>
        </div>
        <p className="text-[11px] text-text-dim mb-10">Estado KYC de inversión: {KYC_LABELS[profile?.kyc_status ?? 'NOT_STARTED']}</p>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {[
            ['Capital activo', formatCents(summary.activeCapitalCents)],
            ['Saldo disponible', formatCents(summary.availableBalanceCents)],
            ['Asignaciones activas', String(summary.allocations.length)],
          ].map(([label, value]) => (
            <Card key={label} variant="bordered" padding="sm">
              <p className="text-base sm:text-lg font-outfit font-semibold text-white">{isSummaryLoading ? '—' : value}</p>
              <p className="text-[10px] text-text-dim uppercase tracking-[0.15em] mt-1 leading-tight">{label}</p>
            </Card>
          ))}
        </div>

        <InvestmentLiquidityPanel
          availableBalanceCents={summary.availableBalanceCents}
          withdrawals={summary.withdrawalRequests}
          onRefresh={refresh}
        />

        <h2 className="text-sm uppercase tracking-[0.15em] text-text-dim mb-5">Mis asignaciones</h2>
        {summary.allocations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {summary.allocations.map((allocation) => (
              <Card key={allocation.id} variant="bordered" padding="md">
                <p className="text-white font-medium">{allocation.case_equivalent_units} cajas equivalentes</p>
                <p className="text-[11px] text-text-dim mt-1">{formatCents(allocation.capital_committed_cents)} comprometido</p>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-text-dim">Aún no tienes asignaciones. La participación pública todavía no está habilitada (programa en beta cerrada).</p>
        )}
      </Container>
    </section>
  );
}
