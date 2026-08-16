import React from 'react';
import { notFound } from 'next/navigation';
import { Container, Badge, Card } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { LOT_STATUS_LABELS } from '@/types/investment';
import {
  getLotByCode,
  getLotTimeline,
  getLotFundingSummary,
  getLotInventorySummary,
} from '@/lib/investment/queries';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const lot = await getLotByCode(params.slug);
  return { title: lot ? `${lot.beer_style} — ${lot.code}` : 'Lote no encontrado' };
}

export default async function LotDetailPage({ params }: { params: { slug: string } }) {
  const lot = await getLotByCode(params.slug);
  if (!lot) notFound();

  const [timeline, funding, inventory] = await Promise.all([
    getLotTimeline(lot.id), getLotFundingSummary(lot), getLotInventorySummary(lot.id),
  ]);
  const soldPercent = inventory.produced ? Math.round((inventory.sold / inventory.produced) * 100) : 0;
  const canParticipate = lot.status === 'FUNDING_OPEN' && funding.availableCasesEquivalent > 0;

  return (
    <section className="py-16 sm:py-24">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            <Badge variant="accent" className="mb-4">{lot.destination}</Badge>
            <h1 className="text-3xl sm:text-4xl font-outfit font-semibold text-white mb-2">{lot.beer_style}</h1>
            <p className="text-[12px] text-text-dim tracking-wider mb-10">{lot.code}</p>

            <h2 className="text-sm uppercase tracking-[0.15em] text-text-dim mb-5">Producción</h2>
            {timeline.length > 0 ? (
              <ol className="space-y-3 mb-12">{timeline.map((step) => (
                <li key={step.id} className="flex items-center gap-3 text-sm">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px]" style={{ backgroundColor: 'var(--accent)', color: '#050505' }}>✓</span>
                  <span className="text-text-secondary">{LOT_STATUS_LABELS[step.new_status]}</span>
                </li>
              ))}</ol>
            ) : <p className="text-sm text-text-dim mb-12">Sin eventos de producción registrados todavía.</p>}

            <h2 className="text-sm uppercase tracking-[0.15em] text-text-dim mb-5">Inventario</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              {[
                ['Botellas producidas', inventory.produced], ['En bodega', inventory.warehouse],
                ['Despachadas', inventory.dispatched], ['Vendidas', inventory.sold],
                ['Dañadas', inventory.damaged], ['% vendido', `${soldPercent}%`],
              ].map(([label, value]) => (
                <Card key={label as string} variant="bordered" padding="sm">
                  <p className="text-lg font-outfit font-semibold text-white">{value}</p>
                  <p className="text-[10px] text-text-dim uppercase tracking-[0.15em] mt-1">{label}</p>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <Card variant="bordered" padding="lg" className="sticky top-24">
              <p className="text-[10px] text-text-dim uppercase tracking-[0.15em] mb-1">Estado</p>
              <p className="text-white font-medium mb-6">{LOT_STATUS_LABELS[lot.status]}</p>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm"><span className="text-text-dim">Producción total</span><span className="text-white">{lot.total_cases} cajas</span></div>
                <div className="flex justify-between text-sm"><span className="text-text-dim">Financiado</span><span className="text-white">{funding.fundedPercent}%</span></div>
                <div className="flex justify-between text-sm"><span className="text-text-dim">Disponible</span><span className="text-white">{funding.availableCasesEquivalent} cajas eq.</span></div>
                <div className="flex justify-between text-sm"><span className="text-text-dim">Tamaño de caja</span><span className="text-white">{lot.case_size_units} botellas</span></div>
              </div>

              {canParticipate ? (
                <Button href={`/dashboard/inversion/nueva/${lot.code.toLowerCase()}`} variant="primary" size="md" fullWidth arrow>
                  Elegir cajas y participar
                </Button>
              ) : (
                <Button href="/dashboard/inversion" variant="secondary" size="md" fullWidth>
                  Ver mis inversiones
                </Button>
              )}
              <Button href="/inversion/simulador" variant="secondary" size="md" fullWidth className="mt-3">Simular participación</Button>

              <p className="text-[11px] text-text-dim leading-relaxed mt-6">
                Participar no te convierte en accionista de Cervecería Cartagena S.A.S. Consulta{' '}
                <a href="/inversion/riesgos" className="text-accent hover:underline">riesgos</a> y{' '}
                <a href="/inversion/legal" className="text-accent hover:underline">condiciones legales</a>.
              </p>
            </Card>
          </div>
        </div>
      </Container>
    </section>
  );
}
