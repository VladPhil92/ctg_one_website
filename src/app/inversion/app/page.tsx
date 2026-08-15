'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Card } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { formatCents } from '@/lib/format';
import { DEMO_LOTS, DEMO_PARTICIPANT_SUMMARY } from '@/lib/investment/demo-data';

// Participant dashboard shell — demo data only (ADR-000/DOMAIN_MODEL.md:
// this is the UI-skeleton milestone, no real investment_* tables exist
// yet). Auth guard mirrors src/app/dashboard/page.tsx exactly, since this
// reuses the same Supabase session (ADR-011).
export default function InvestmentAppPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

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

  const s = DEMO_PARTICIPANT_SUMMARY;

  return (
    <section className="py-12 sm:py-16">
      <Container>
        <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
          <h1 className="text-2xl sm:text-3xl font-outfit font-semibold text-white">Mi panel</h1>
          <Button href="/inversion/lotes" variant="secondary" size="sm">Ver lotes</Button>
        </div>

        <p className="text-[11px] text-text-dim mb-8 -mt-6">
          Datos de demostración — este programa se encuentra en fase de beta cerrada.
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-12">
          {[
            ['Capital activo', formatCents(s.activeCapitalCents)],
            ['Capital recuperado', formatCents(s.capitalRecoveredCents)],
            ['Utilidad realizada', formatCents(s.realizedProfitCents)],
            ['Saldo disponible', formatCents(s.availableBalanceCents)],
            ['Asignaciones activas', String(s.activeAllocations)],
          ].map(([label, value]) => (
            <Card key={label} variant="bordered" padding="sm">
              <p className="text-base sm:text-lg font-outfit font-semibold text-white">{value}</p>
              <p className="text-[10px] text-text-dim uppercase tracking-[0.15em] mt-1 leading-tight">{label}</p>
            </Card>
          ))}
        </div>

        <h2 className="text-sm uppercase tracking-[0.15em] text-text-dim mb-5">Lotes activos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {DEMO_LOTS.map((lot) => (
            <a key={lot.slug} href={`/inversion/lotes/${lot.slug}`}>
              <Card variant="bordered" padding="md" hover>
                <p className="text-white font-medium">{lot.beerStyle}</p>
                <p className="text-[11px] text-text-dim mt-1">{lot.code} — {lot.statusLabel}</p>
              </Card>
            </a>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {['Movimientos', 'Liquidaciones', 'Retiros y reinversión'].map((title) => (
            <Card key={title} variant="bordered" padding="md">
              <p className="text-sm font-medium text-white mb-2">{title}</p>
              <p className="text-[12px] text-text-dim leading-relaxed">
                Aún no hay registros. Esta sección se activa con el motor financiero
                (próximo hito del proyecto).
              </p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
