'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Card } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { formatCents } from '@/lib/format';
import { DEMO_ADMIN_SUMMARY, DEMO_LOTS } from '@/lib/investment/demo-data';

// Admin dashboard shell — demo data only. Interim gate: reuses the
// existing CTG One `profiles.role === 'admin'` flag (ADR-011) until a
// dedicated investment RBAC table (SECURITY_MODEL.md) lands with the
// domain milestone — there is no real financial data behind this page yet
// for that gap to expose.
export default function InvestmentAdminPage() {
  const { isAuthenticated, isLoading, profile } = useAuth();
  const router = useRouter();
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/iniciar-sesion?next=/inversion/admin');
      return;
    }
    if (!isAdmin) {
      router.push('/inversion/app');
    }
  }, [isAuthenticated, isLoading, isAdmin, router]);

  if (isLoading || !isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent)' }} />
          <p className="text-text-muted text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  const s = DEMO_ADMIN_SUMMARY;

  return (
    <section className="py-12 sm:py-16">
      <Container>
        <h1 className="text-2xl sm:text-3xl font-outfit font-semibold text-white mb-2">
          Panel administrativo
        </h1>
        <p className="text-[11px] text-text-dim mb-10">
          Datos de demostración — este programa se encuentra en fase de beta cerrada.
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {[
            ['Capital activo', formatCents(s.activeCapitalCents)],
            ['Financiación abierta', formatCents(s.openFundingCents)],
            ['Lotes activos', String(s.activeLots)],
            ['Participantes', String(s.participants)],
            ['Liquidaciones pendientes', String(s.pendingSettlements)],
            ['Retiros pendientes', String(s.pendingWithdrawals)],
          ].map(([label, value]) => (
            <Card key={label} variant="bordered" padding="sm">
              <p className="text-base sm:text-lg font-outfit font-semibold text-white">{value}</p>
              <p className="text-[10px] text-text-dim uppercase tracking-[0.15em] mt-1 leading-tight">{label}</p>
            </Card>
          ))}
        </div>

        <h2 className="text-sm uppercase tracking-[0.15em] text-text-dim mb-5">Lotes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {DEMO_LOTS.map((lot) => (
            <Card key={lot.slug} variant="bordered" padding="md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{lot.beerStyle}</p>
                  <p className="text-[11px] text-text-dim mt-1">{lot.code}</p>
                </div>
                <span className="text-[10px] uppercase tracking-[0.15em] text-accent">{lot.statusLabel}</span>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {['Participantes', 'Finanzas y liquidaciones', 'Auditoría'].map((title) => (
            <Card key={title} variant="bordered" padding="md">
              <p className="text-sm font-medium text-white mb-2">{title}</p>
              <p className="text-[12px] text-text-dim leading-relaxed">
                Pendiente del motor de dominio (ledger, settlement engine, RBAC de inversión)
                — próximo hito del proyecto.
              </p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
