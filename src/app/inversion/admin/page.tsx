'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Card } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useInvestmentAdminSummary } from '@/hooks/useInvestmentAdminSummary';
import { LOT_STATUS_LABELS, LOT_NEXT_STATUS } from '@/types/investment';

const DEFAULT_FORM = {
  code: '',
  beerStyle: '',
  destination: 'Bogotá',
  totalCases: '50',
  caseSizeUnits: '24',
  productionCostUnit: '6000',
  labelCostUnit: '900',
  ownPointPriceUnit: '18000',
  b2bPriceUnit: '8000',
  incRatePercent: '8',
  advertisingRatePercent: '3.5',
};

export default function InvestmentAdminPage() {
  const { isAuthenticated, isLoading, profile } = useAuth();
  const router = useRouter();
  const isAdmin = profile?.role === 'admin';
  const { summary, isLoading: isSummaryLoading, refresh } = useInvestmentAdminSummary();

  const [form, setForm] = useState(DEFAULT_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transitioningId, setTransitioningId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/iniciar-sesion?next=/inversion/admin');
      return;
    }
    if (!isAdmin) router.push('/inversion/app');
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

  const handleCreateLot = async () => {
    setFormError(null);
    if (!form.code.trim() || !form.beerStyle.trim() || !form.destination.trim()) {
      setFormError('Completa todos los campos');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/investment/admin/lots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code,
          beerStyle: form.beerStyle,
          destination: form.destination,
          totalCases: Number(form.totalCases),
          caseSizeUnits: Number(form.caseSizeUnits),
          productionCostUnit: Number(form.productionCostUnit),
          labelCostUnit: Number(form.labelCostUnit),
          ownPointPriceUnit: Number(form.ownPointPriceUnit),
          b2bPriceUnit: Number(form.b2bPriceUnit),
          incRate: Number(form.incRatePercent) / 100,
          advertisingRateOnPreInc: Number(form.advertisingRatePercent) / 100,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'No se pudo crear el lote');
      setForm(DEFAULT_FORM);
      await refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo crear el lote');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdvance = async (lotId: string, newStatus: string) => {
    setTransitioningId(lotId);
    try {
      const res = await fetch(`/api/investment/admin/lots/${lotId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStatus }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'No se pudo avanzar el estado');
      }
      await refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo avanzar el estado');
    } finally {
      setTransitioningId(null);
    }
  };

  const inputStyle = { backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' };

  return (
    <section className="py-12 sm:py-16">
      <Container>
        <h1 className="text-2xl sm:text-3xl font-outfit font-semibold text-white mb-10">Panel administrativo</h1>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {[
            ['Lotes', String(summary.lots.length)],
            ['Participantes', String(summary.participantCount)],
            ['Retiros pendientes', String(summary.pendingWithdrawals.length)],
          ].map(([label, value]) => (
            <Card key={label} variant="bordered" padding="sm">
              <p className="text-base sm:text-lg font-outfit font-semibold text-white">{isSummaryLoading ? '—' : value}</p>
              <p className="text-[10px] text-text-dim uppercase tracking-[0.15em] mt-1 leading-tight">{label}</p>
            </Card>
          ))}
        </div>

        <Card variant="bordered" padding="md" className="mb-12">
          <p className="text-sm font-medium text-white mb-1">Crear lote de producción</p>
          <p className="text-[11px] text-text-dim mb-5">Cada lote guarda su propio snapshot de costos, precios, INC y publicidad para preservar la trazabilidad económica histórica.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
            <input placeholder="Código (PB-BOG-...)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="px-3 py-2 rounded text-sm text-white" style={inputStyle} />
            <input placeholder="Estilo de cerveza" value={form.beerStyle} onChange={(e) => setForm({ ...form, beerStyle: e.target.value })} className="px-3 py-2 rounded text-sm text-white" style={inputStyle} />
            <input placeholder="Destino" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className="px-3 py-2 rounded text-sm text-white" style={inputStyle} />
            <input type="number" placeholder="Total cajas" value={form.totalCases} onChange={(e) => setForm({ ...form, totalCases: e.target.value })} className="px-3 py-2 rounded text-sm text-white" style={inputStyle} />
            <input type="number" placeholder="Botellas/caja" value={form.caseSizeUnits} onChange={(e) => setForm({ ...form, caseSizeUnits: e.target.value })} className="px-3 py-2 rounded text-sm text-white" style={inputStyle} />
          </div>

          <p className="text-[10px] uppercase tracking-[0.16em] text-accent mb-3">Economía por botella · COP</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            {[
              ['Producción', 'productionCostUnit'],
              ['Etiqueta', 'labelCostUnit'],
              ['Precio punto propio', 'ownPointPriceUnit'],
              ['Precio B2B', 'b2bPriceUnit'],
              ['INC %', 'incRatePercent'],
              ['Publicidad % s/ pre-INC', 'advertisingRatePercent'],
            ].map(([label, key]) => (
              <label key={key} className="text-[10px] text-text-dim">
                <span className="block mb-1.5">{label}</span>
                <input
                  type="number"
                  step={key === 'advertisingRatePercent' ? '0.1' : '1'}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full px-3 py-2 rounded text-sm text-white"
                  style={inputStyle}
                />
              </label>
            ))}
          </div>

          {formError && <p className="text-[12px] mb-2" style={{ color: 'var(--error)' }}>{formError}</p>}
          <Button onClick={handleCreateLot} loading={isSubmitting} variant="primary" size="sm">Crear lote</Button>
        </Card>

        <h2 className="text-sm uppercase tracking-[0.15em] text-text-dim mb-5">Lotes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {summary.lots.map((lot) => {
            const nextStatus = LOT_NEXT_STATUS[lot.status];
            return (
              <Card key={lot.id} variant="bordered" padding="md">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-white font-medium">{lot.beer_style}</p>
                    <p className="text-[11px] text-text-dim mt-1">{lot.code}</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.15em] text-accent">{LOT_STATUS_LABELS[lot.status]}</span>
                </div>
                {nextStatus && (
                  <Button onClick={() => handleAdvance(lot.id, nextStatus)} loading={transitioningId === lot.id} variant="secondary" size="sm">
                    Avanzar a {LOT_STATUS_LABELS[nextStatus]}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
