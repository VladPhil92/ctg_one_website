import React from 'react';
import { notFound } from 'next/navigation';
import { Container, Badge, Card } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { formatCents } from '@/lib/format';
import { DEMO_LOTS, getDemoLot } from '@/lib/investment/demo-data';

export function generateStaticParams() {
  return DEMO_LOTS.map((lot) => ({ slug: lot.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const lot = getDemoLot(params.slug);
  return { title: lot ? `${lot.beerStyle} — ${lot.code}` : 'Lote no encontrado' };
}

export default function LotDetailPage({ params }: { params: { slug: string } }) {
  const lot = getDemoLot(params.slug);
  if (!lot) notFound();

  const soldPercent = lot.inventory.produced
    ? Math.round((lot.inventory.sold / lot.inventory.produced) * 100)
    : 0;

  return (
    <section className="py-16 sm:py-24">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            <Badge variant="accent" className="mb-4">{lot.destination}</Badge>
            <h1 className="text-3xl sm:text-4xl font-outfit font-semibold text-white mb-2">
              {lot.beerStyle}
            </h1>
            <p className="text-[12px] text-text-dim tracking-wider mb-10">{lot.code}</p>

            {/* PRODUCCIÓN — timeline */}
            <h2 className="text-sm uppercase tracking-[0.15em] text-text-dim mb-5">Producción</h2>
            <ol className="space-y-3 mb-12">
              {lot.timeline.map((step) => (
                <li key={step.label} className="flex items-center gap-3 text-sm">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px]"
                    style={{
                      backgroundColor: step.done ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                      color: step.done ? '#050505' : 'var(--text-dim)',
                    }}
                  >
                    {step.done ? '✓' : ''}
                  </span>
                  <span className={step.done ? 'text-text-secondary' : 'text-text-dim'}>
                    {step.label}
                  </span>
                </li>
              ))}
            </ol>

            {/* INVENTARIO */}
            <h2 className="text-sm uppercase tracking-[0.15em] text-text-dim mb-5">Inventario</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              {[
                ['Botellas producidas', lot.inventory.produced],
                ['En bodega', lot.inventory.warehouse],
                ['Despachadas', lot.inventory.dispatched],
                ['Vendidas', lot.inventory.sold],
                ['Dañadas', lot.inventory.damaged],
                ['% vendido', `${soldPercent}%`],
              ].map(([label, value]) => (
                <Card key={label as string} variant="bordered" padding="sm">
                  <p className="text-lg font-outfit font-semibold text-white">{value}</p>
                  <p className="text-[10px] text-text-dim uppercase tracking-[0.15em] mt-1">{label}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* RESUMEN + participate */}
          <div>
            <Card variant="bordered" padding="lg" className="sticky top-24">
              <p className="text-[10px] text-text-dim uppercase tracking-[0.15em] mb-1">Estado</p>
              <p className="text-white font-medium mb-6">{lot.statusLabel}</p>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-text-dim">Producción total</span>
                  <span className="text-white">{lot.totalCases} cajas</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-dim">Financiado</span>
                  <span className="text-white">{lot.fundedPercent}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-dim">Disponible</span>
                  <span className="text-white">{lot.availableCasesEquivalent} cajas eq.</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-dim">Aporte mínimo</span>
                  <span className="text-white">{lot.minimumAllocationCases} cajas</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-dim">Capital / caja (est.)</span>
                  <span className="text-white">{formatCents(lot.capitalPerCaseCents)}</span>
                </div>
              </div>

              <Button href="/inversion/simulador" variant="primary" size="md" fullWidth arrow>
                Simular participación
              </Button>
              <Button href="/registro?next=/inversion/app" variant="secondary" size="md" fullWidth className="mt-3">
                Crear cuenta para participar
              </Button>

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
