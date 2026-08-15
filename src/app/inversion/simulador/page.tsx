'use client';

import React, { useMemo, useState } from 'react';
import { Container, Badge, Card } from '@/components/ui';
import { formatCents } from '@/lib/format';

// Illustrative-only demo constants — not a quoted price, not the real
// formula engine (see docs/investment/FINANCIAL_MODEL.md, not yet
// implemented). Every figure this page shows is clearly labeled as an
// estimate per the mandatory disclaimer at the bottom.
const CASE_SIZE_UNITS = 24;
const CAPITAL_PER_CASE_CENTS = 33_600_000; // COP 336,000/caja
const PROJECTED_NDLP_RATIO = 0.357; // illustrative projected profit as a share of capital, for demo purposes only
const PARTICIPANT_PROFIT_SHARE = 0.5; // current default per BUSINESS_MODEL.md — versioned, not final

export default function SimuladorPage() {
  const [cases, setCases] = useState(5);

  const result = useMemo(() => {
    const bottleEquivalent = cases * CASE_SIZE_UNITS;
    const capitalCents = cases * CAPITAL_PER_CASE_CENTS;
    const projectedNdlpCents = Math.round(capitalCents * PROJECTED_NDLP_RATIO);
    const projectedParticipantProfitCents = Math.round(projectedNdlpCents * PARTICIPANT_PROFIT_SHARE);
    const projectedSalesCents = capitalCents + projectedNdlpCents;
    const roi = capitalCents > 0 ? (projectedParticipantProfitCents / capitalCents) * 100 : 0;
    return { bottleEquivalent, capitalCents, projectedSalesCents, projectedNdlpCents, projectedParticipantProfitCents, roi };
  }, [cases]);

  return (
    <section className="py-16 sm:py-24">
      <Container size="small">
        <Badge variant="accent" className="mb-6">Simulador</Badge>
        <h1 className="text-3xl sm:text-4xl font-outfit font-semibold text-white mb-4">
          Simulador de participación
        </h1>
        <p className="text-base text-text-muted leading-relaxed mb-10">
          Ajusta el número de cajas para ver, con cifras ilustrativas, cómo se vería una
          participación. Estos valores son estimados y no constituyen una rentabilidad garantizada.
        </p>

        <Card variant="bordered" padding="lg" className="mb-10">
          <label className="text-[11px] uppercase tracking-[0.15em] text-text-dim block mb-3">
            Número de cajas
          </label>
          <div className="flex items-center gap-4 mb-2">
            <input
              type="range"
              min={5}
              max={50}
              step={1}
              value={cases}
              onChange={(e) => setCases(Number(e.target.value))}
              className="flex-1 accent-accent"
            />
            <span className="text-2xl font-outfit font-semibold text-white w-16 text-right">{cases}</span>
          </div>
          <p className="text-[11px] text-text-dim">Equivalente a {result.bottleEquivalent} botellas.</p>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {[
            ['Capital estimado requerido', formatCents(result.capitalCents)],
            ['Ventas proyectadas (estimado)', formatCents(result.projectedSalesCents)],
            ['Utilidad neta proyectada del lote (estimado)', formatCents(result.projectedNdlpCents)],
            ['Participación proyectada (50% de la utilidad atribuible)', formatCents(result.projectedParticipantProfitCents)],
          ].map(([label, value]) => (
            <Card key={label} variant="bordered" padding="md">
              <p className="text-[10px] text-text-dim uppercase tracking-[0.15em] mb-2">{label}</p>
              <p className="text-lg font-outfit font-semibold text-white">{value}</p>
            </Card>
          ))}
          <Card variant="gradient" padding="md" className="sm:col-span-2">
            <p className="text-[10px] text-text-dim uppercase tracking-[0.15em] mb-2">ROI proyectado (estimado)</p>
            <p className="text-2xl font-outfit font-semibold text-accent">{result.roi.toFixed(2)}%</p>
            <p className="text-[11px] text-text-dim mt-2">
              Nota: un reparto del 50% de la utilidad neta distribuible no equivale a un 50% de
              rentabilidad sobre el capital — son magnitudes distintas.
            </p>
          </Card>
        </div>

        <p className="text-[11px] text-text-dim leading-relaxed">
          Los valores proyectados son estimados y no constituyen una rentabilidad garantizada. La
          liquidación real depende de las ventas, costos, impuestos y reglas contractuales
          efectivamente aplicables al lote y a la versión de fórmula financiera vigente al momento
          de tu aporte. Consulta <a href="/inversion/riesgos" className="text-accent hover:underline">riesgos</a>{' '}
          y <a href="/inversion/legal" className="text-accent hover:underline">condiciones legales</a>.
        </p>
      </Container>
    </section>
  );
}
