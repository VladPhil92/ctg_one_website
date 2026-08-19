import React from 'react';
import { notFound } from 'next/navigation';
import { Container, Badge, Card } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { LOT_STATUS_LABELS } from '@/types/investment';
import { MIN_INVESTMENT_CASES } from '@/lib/investment/constants';
import {
  getLotByCode,
  getLotFundingSummary,
  getPublicLotOperationalSnapshot,
} from '@/lib/investment/queries';

export const dynamic = 'force-dynamic';

type LotRouteParams = Promise<{ slug: string }>;

function formatEventDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

export async function generateMetadata({ params }: { params: LotRouteParams }) {
  const { slug } = await params;
  const lot = await getLotByCode(slug);
  if (!lot) {
    return {
      title: 'Lote no encontrado',
      robots: { index: false, follow: false },
    };
  }

  const canonicalSlug = encodeURIComponent(lot.code.toLowerCase());
  return {
    title: `${lot.beer_style} — ${lot.code}`,
    alternates: { canonical: `https://ctgone.com/inversion/lotes/${canonicalSlug}` },
  };
}

export default async function LotDetailPage({ params }: { params: LotRouteParams }) {
  const { slug } = await params;
  const lot = await getLotByCode(slug);
  if (!lot) notFound();

  const [funding, operations] = await Promise.all([
    getLotFundingSummary(lot),
    getPublicLotOperationalSnapshot(lot.id),
  ]);

  const soldPercent = operations.serializedUnits > 0
    ? Math.round((operations.soldUnits / operations.serializedUnits) * 100)
    : 0;
  const reservedCases = funding.reservedCases ?? 0;
  const canParticipate = lot.status === 'FUNDING_OPEN'
    && funding.availableCasesEquivalent >= MIN_INVESTMENT_CASES;
  const fundingOpenButBelowMinimum = lot.status === 'FUNDING_OPEN'
    && funding.availableCasesEquivalent < MIN_INVESTMENT_CASES;

  return (
    <section className="py-16 sm:py-24">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            <Badge variant="accent" className="mb-4">{lot.destination}</Badge>
            <h1 className="text-3xl sm:text-4xl font-outfit font-semibold text-white mb-2">{lot.beer_style}</h1>
            <p className="text-[12px] text-text-dim tracking-wider mb-10">{lot.code}</p>

            <h2 className="text-sm uppercase tracking-[0.15em] text-text-dim mb-5">Timeline público</h2>
            {operations.timeline.length > 0 ? (
              <ol className="space-y-3 mb-12">
                {operations.timeline.map((step, index) => (
                  <li key={`${step.status}-${step.occurredAt}-${index}`} className="flex items-center gap-3 text-sm">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px]" style={{ backgroundColor: 'var(--accent)', color: '#050505' }}>✓</span>
                    <span className="text-text-secondary">{LOT_STATUS_LABELS[step.status]}</span>
                    <span className="ml-auto text-[10px] text-text-dim">{formatEventDate(step.occurredAt)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-text-dim mb-12">Sin hitos operacionales públicos registrados todavía.</p>
            )}

            <div className="flex items-end justify-between gap-4 mb-5">
              <div>
                <h2 className="text-sm uppercase tracking-[0.15em] text-text-dim">Inventario agregado</h2>
                <p className="text-[11px] text-text-dim mt-2 max-w-xl leading-relaxed">
                  Conteo por estado actual de unidades serializadas. La vista pública no expone seriales, ubicaciones, referencias de venta ni evidencia interna.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              {[
                ['Serializadas', operations.serializedUnits],
                ['En bodega', operations.warehouseUnits],
                ['Despachadas', operations.dispatchedUnits],
                ['En mercado', operations.inMarketUnits],
                ['Vendidas vigentes', operations.soldUnits],
                ['Devueltas', operations.returnedUnits],
                ['Incidencias físicas', operations.incidentUnits],
                ['% vendidas / serializadas', `${soldPercent}%`],
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
                <div className="flex justify-between text-sm gap-4"><span className="text-text-dim">Producción física</span><span className="text-white text-right">{lot.total_cases} cajas</span></div>
                <div className="flex justify-between text-sm gap-4"><span className="text-text-dim">Capacidad financiable</span><span className="text-white text-right">{funding.totalCases} cajas eq.</span></div>
                <div className="flex justify-between text-sm gap-4"><span className="text-text-dim">Asignadas</span><span className="text-white text-right">{funding.allocatedCases} cajas eq.</span></div>
                <div className="flex justify-between text-sm gap-4"><span className="text-text-dim">Reservadas</span><span className="text-white text-right">{reservedCases} cajas eq.</span></div>
                <div className="flex justify-between text-sm gap-4"><span className="text-text-dim">Financiado consolidado</span><span className="text-white text-right">{funding.fundedPercent}%</span></div>
                <div className="flex justify-between text-sm gap-4"><span className="text-text-dim">Disponible para nueva orden</span><span className="text-white text-right">{funding.availableCasesEquivalent} cajas eq.</span></div>
                <div className="flex justify-between text-sm gap-4"><span className="text-text-dim">Tamaño de caja</span><span className="text-white text-right">{lot.case_size_units} botellas</span></div>
              </div>

              {canParticipate ? (
                <Button href={`/inversion/app/nueva/${lot.code.toLowerCase()}`} variant="primary" size="md" fullWidth arrow>
                  Elegir cajas y participar
                </Button>
              ) : (
                <Button href="/inversion/app" variant="secondary" size="md" fullWidth>
                  Ver mis inversiones
                </Button>
              )}

              {fundingOpenButBelowMinimum && (
                <p className="text-[11px] text-amber-300/80 leading-relaxed mt-3">
                  La financiación sigue abierta, pero quedan menos de {MIN_INVESTMENT_CASES} cajas equivalentes, que es el mínimo para una nueva orden.
                </p>
              )}
              {lot.status !== 'FUNDING_OPEN' && funding.availableCasesEquivalent > 0 && (
                <p className="text-[11px] text-text-dim leading-relaxed mt-3">
                  La capacidad no asignada no equivale a disponibilidad de inversión mientras el lote no esté en “Financiación abierta”.
                </p>
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
