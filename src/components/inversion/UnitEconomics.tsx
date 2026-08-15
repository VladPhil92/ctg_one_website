import React from 'react';
import { Container, FadeInSection, SectionHeader } from '@/components/ui';

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const productionCost = 6000;
const labelCost = 900;
const totalUnitCost = productionCost + labelCost;
const ownPointGrossPrice = 18000;
const incRate = 0.08;
const advertisingRate = 0.035;
const ownPointPreInc = ownPointGrossPrice / (1 + incRate);
const ownPointInc = ownPointGrossPrice - ownPointPreInc;
const advertising = ownPointPreInc * advertisingRate;
const ownPointContribution = ownPointGrossPrice - ownPointInc - advertising - totalUnitCost;
const b2bPrice = 8000;
const b2bContribution = b2bPrice - totalUnitCost;
const ownPointMargin = ownPointContribution / ownPointGrossPrice;
const b2bMargin = b2bContribution / b2bPrice;
const contributionMultiple = ownPointContribution / b2bContribution;

const Metric = ({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) => (
  <div className="flex items-center justify-between gap-4 py-2 border-b border-white/[0.06] last:border-0">
    <span className="text-xs sm:text-sm text-text-dim">{label}</span>
    <span className={`text-xs sm:text-sm font-medium ${emphasis ? 'text-accent' : 'text-white'}`}>{value}</span>
  </div>
);

export function UnitEconomics() {
  return (
    <section className="py-20 sm:py-24" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <Container>
        <FadeInSection>
          <SectionHeader
            badge="Economía unitaria"
            title="El canal define la"
            titleHighlight="oportunidad"
            description="La misma botella tiene una contribución económica muy distinta según el canal de comercialización. Los valores siguientes reflejan los parámetros comerciales actuales suministrados para el programa."
            centered={false}
            className="mb-12 max-w-3xl"
          />
        </FadeInSection>

        <div className="grid lg:grid-cols-3 gap-5">
          <FadeInSection>
            <div className="h-full rounded-xl border border-white/[0.08] bg-white/[0.025] p-6">
              <p className="text-[10px] uppercase tracking-[0.18em] text-text-dim mb-4">Costo por botella</p>
              <Metric label="Producción" value={COP.format(productionCost)} />
              <Metric label="Etiqueta" value={COP.format(labelCost)} />
              <Metric label="Costo total unitario" value={COP.format(totalUnitCost)} emphasis />
            </div>
          </FadeInSection>

          <FadeInSection delay={0.06}>
            <div className="h-full rounded-xl border border-accent/25 bg-accent/[0.04] p-6">
              <p className="text-[10px] uppercase tracking-[0.18em] text-accent mb-4">Puntos propios</p>
              <Metric label="Precio al consumidor" value={COP.format(ownPointGrossPrice)} />
              <Metric label="Base antes de INC" value={COP.format(ownPointPreInc)} />
              <Metric label="INC · 8%" value={COP.format(ownPointInc)} />
              <Metric label="Publicidad · 3.5% sobre base sin INC" value={COP.format(advertising)} />
              <Metric label="Contribución estimada / botella" value={COP.format(ownPointContribution)} emphasis />
              <Metric label="Margen sobre precio final" value={`${(ownPointMargin * 100).toFixed(1)}%`} emphasis />
            </div>
          </FadeInSection>

          <FadeInSection delay={0.12}>
            <div className="h-full rounded-xl border border-white/[0.08] bg-white/[0.025] p-6">
              <p className="text-[10px] uppercase tracking-[0.18em] text-text-dim mb-4">Canal B2B</p>
              <Metric label="Precio a otros restaurantes" value={COP.format(b2bPrice)} />
              <Metric label="Costo total unitario" value={COP.format(totalUnitCost)} />
              <Metric label="Contribución estimada / botella" value={COP.format(b2bContribution)} emphasis />
              <Metric label="Margen sobre precio B2B" value={`${(b2bMargin * 100).toFixed(1)}%`} />
            </div>
          </FadeInSection>
        </div>

        <FadeInSection delay={0.18}>
          <div className="mt-6 rounded-xl border border-accent/20 p-6 sm:p-8" style={{ backgroundColor: 'rgba(201, 169, 98, 0.045)' }}>
            <p className="text-lg sm:text-xl font-outfit font-semibold text-white mb-3">
              La venta directa en puntos propios concentra el mayor potencial económico.
            </p>
            <p className="text-sm text-text-muted leading-relaxed max-w-4xl">
              Bajo estos parámetros, una botella vendida en un punto propio deja una contribución estimada de {COP.format(ownPointContribution)} frente a {COP.format(b2bContribution)} en B2B: aproximadamente {contributionMultiple.toFixed(1)} veces más contribución por unidad. Por eso, la mezcla de canales de cada lote es una variable crítica para estimar su resultado, no solo el volumen producido.
            </p>
          </div>
        </FadeInSection>

        <p className="mt-5 text-[11px] text-text-dim leading-relaxed max-w-4xl">
          Cálculo ilustrativo con los parámetros comerciales registrados: costo de producción $6.000 + etiqueta $900; precio en puntos propios $18.000 con INC del 8% incluido y 3,5% de publicidad calculado sobre el precio antes de INC; precio B2B $8.000. La liquidación real de un lote se realiza con ingresos, impuestos y costos efectivamente registrados.
        </p>
      </Container>
    </section>
  );
}
