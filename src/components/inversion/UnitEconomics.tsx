import React from 'react';
import { Container, FadeInSection, SectionHeader } from '@/components/ui';
import { formatCents } from '@/lib/format';
import { deriveUnitEconomics } from '@/lib/investment/economics';
import { getPublicEconomicsReferenceLot } from '@/lib/investment/queries';

const Metric = ({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) => (
  <div className="flex items-center justify-between gap-4 py-2 border-b border-white/[0.06] last:border-0">
    <span className="text-xs sm:text-sm text-text-dim">{label}</span>
    <span className={`text-xs sm:text-sm font-medium ${emphasis ? 'text-accent' : 'text-white'}`}>{value}</span>
  </div>
);

const percent = (value: number | null) => value == null ? '—' : `${(value * 100).toFixed(1)}%`;
const rate = (value: number) => `${(value * 100).toFixed(value * 100 % 1 === 0 ? 0 : 2)}%`;

export async function UnitEconomics() {
  const lot = await getPublicEconomicsReferenceLot();

  if (!lot) {
    return (
      <section className="py-20 sm:py-24" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <Container>
          <FadeInSection>
            <SectionHeader
              badge="Economía unitaria"
              title="Cada lote publica su"
              titleHighlight="propio snapshot"
              description="Costos, precios, impuestos y parámetros comerciales se fijan por lote en la base de datos. No mostramos cifras de relleno cuando todavía no existe un lote publicado con economía completa."
              centered={false}
              className="mb-8 max-w-3xl"
            />
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-6 sm:p-8 max-w-3xl">
              <p className="text-sm text-text-muted leading-relaxed">
                En este momento no hay un snapshot económico de lote disponible para publicación. Cuando Production OS habilite un lote, esta sección se alimentará directamente de sus valores persistidos y quedará identificada con el código del lote utilizado como referencia.
              </p>
            </div>
          </FadeInSection>
        </Container>
      </section>
    );
  }

  const economics = deriveUnitEconomics(lot);
  const contributionMultiple = economics.b2bContributionCents !== 0
    ? economics.ownPointContributionCents / economics.b2bContributionCents
    : null;

  return (
    <section className="py-20 sm:py-24" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <Container>
        <FadeInSection>
          <SectionHeader
            badge={`Economía unitaria · ${lot.code}`}
            title="El canal define la"
            titleHighlight="oportunidad"
            description={`Valores tomados del snapshot económico persistido del lote ${lot.code}. Los parámetros de otros lotes pueden ser distintos.`}
            centered={false}
            className="mb-12 max-w-3xl"
          />
        </FadeInSection>

        <div className="grid lg:grid-cols-3 gap-5">
          <FadeInSection>
            <div className="h-full rounded-xl border border-white/[0.08] bg-white/[0.025] p-6">
              <p className="text-[10px] uppercase tracking-[0.18em] text-text-dim mb-4">Costo por botella</p>
              <Metric label="Producción" value={formatCents(lot.production_cost_unit_cents)} />
              <Metric label="Etiqueta" value={formatCents(lot.label_cost_unit_cents)} />
              <Metric label="Costo total unitario" value={formatCents(economics.totalUnitCostCents)} emphasis />
            </div>
          </FadeInSection>

          <FadeInSection delay={0.06}>
            <div className="h-full rounded-xl border border-accent/25 bg-accent/[0.04] p-6">
              <p className="text-[10px] uppercase tracking-[0.18em] text-accent mb-4">Puntos propios</p>
              <Metric label="Precio al consumidor" value={formatCents(lot.own_point_price_unit_cents)} />
              <Metric label="Base antes de INC" value={formatCents(economics.ownPointPreIncCents)} />
              <Metric label={`INC · ${rate(lot.inc_rate)}`} value={formatCents(economics.ownPointIncCents)} />
              <Metric label={`Publicidad · ${rate(lot.advertising_rate_on_pre_inc)} sobre base sin INC`} value={formatCents(economics.ownPointAdvertisingCents)} />
              <Metric label="Contribución estimada / botella" value={formatCents(economics.ownPointContributionCents)} emphasis />
              <Metric label="Margen sobre precio final" value={percent(economics.ownPointMargin)} emphasis />
            </div>
          </FadeInSection>

          <FadeInSection delay={0.12}>
            <div className="h-full rounded-xl border border-white/[0.08] bg-white/[0.025] p-6">
              <p className="text-[10px] uppercase tracking-[0.18em] text-text-dim mb-4">Canal B2B</p>
              <Metric label="Precio B2B" value={formatCents(lot.b2b_price_unit_cents)} />
              <Metric label="Costo total unitario" value={formatCents(economics.totalUnitCostCents)} />
              <Metric label="Contribución estimada / botella" value={formatCents(economics.b2bContributionCents)} emphasis />
              <Metric label="Margen sobre precio B2B" value={percent(economics.b2bMargin)} />
            </div>
          </FadeInSection>
        </div>

        <FadeInSection delay={0.18}>
          <div className="mt-6 rounded-xl border border-accent/20 p-6 sm:p-8" style={{ backgroundColor: 'rgba(201, 169, 98, 0.045)' }}>
            <p className="text-lg sm:text-xl font-outfit font-semibold text-white mb-3">
              El resultado depende de la mezcla comercial efectiva del lote.
            </p>
            <p className="text-sm text-text-muted leading-relaxed max-w-4xl">
              Para el snapshot {lot.code}, la contribución simplificada por botella es {formatCents(economics.ownPointContributionCents)} en el escenario de punto propio y {formatCents(economics.b2bContributionCents)} en B2B
              {contributionMultiple != null && Number.isFinite(contributionMultiple) ? ` (${contributionMultiple.toFixed(1)}× entre ambos escenarios)` : ''}. La liquidación no usa esta comparación: se calcula con los ingresos, impuestos, costos comerciales, costos de producción y ajustes efectivamente registrados para el lote.
            </p>
          </div>
        </FadeInSection>

        <p className="mt-5 text-[11px] text-text-dim leading-relaxed max-w-4xl">
          Fuente: snapshot persistido de {lot.code}. Esta vista es explicativa y no constituye una rentabilidad garantizada. Los valores históricos del lote no se recalculan con presets posteriores del catálogo maestro.
        </p>
      </Container>
    </section>
  );
}
