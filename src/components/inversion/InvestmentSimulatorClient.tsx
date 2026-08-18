'use client';

import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui';
import { formatCents } from '@/lib/format';
import { deriveLotScenario } from '@/lib/investment/economics';
import type { InvestmentProductionLot } from '@/types/investment';
import type { InvestmentFormulaVersion } from '@/types/investment-economics';
import type { PublicInvestmentSimulatorProfile } from '@/lib/investment/public-simulator';

function percent(value: number | null) {
  return value == null ? '—' : `${(value * 100).toFixed(2)}%`;
}

function ScenarioCard({
  title,
  gross,
  contribution,
  participantProfit,
  roi,
}: {
  title: string;
  gross: number;
  contribution: number;
  participantProfit: number | null;
  roi: number | null;
}) {
  return (
    <Card variant="bordered" padding="md">
      <p className="text-[10px] text-accent uppercase tracking-[0.15em] mb-4">{title}</p>
      <div className="space-y-3">
        <div className="flex justify-between gap-4 text-xs"><span className="text-text-dim">Venta bruta equivalente</span><span className="text-white">{formatCents(gross)}</span></div>
        <div className="flex justify-between gap-4 text-xs"><span className="text-text-dim">Contribución simplificada</span><span className="text-white">{formatCents(contribution)}</span></div>
        <div className="flex justify-between gap-4 text-xs"><span className="text-text-dim">Participación sobre esa contribución</span><span className="text-accent">{participantProfit == null ? '—' : formatCents(participantProfit)}</span></div>
        <div className="flex justify-between gap-4 text-xs"><span className="text-text-dim">ROI ilustrativo sobre capital</span><span className="text-accent">{percent(roi)}</span></div>
      </div>
    </Card>
  );
}

export function InvestmentSimulatorClient({
  lots,
  formula,
  referenceProfile,
}: {
  lots: InvestmentProductionLot[];
  formula: InvestmentFormulaVersion | null;
  referenceProfile: PublicInvestmentSimulatorProfile;
}) {
  const eligibleLots = lots.filter((lot) => lot.total_cases >= referenceProfile.minCases);
  const [selectedId, setSelectedId] = useState(eligibleLots[0]?.id ?? '');
  const selected = eligibleLots.find((lot) => lot.id === selectedId) ?? eligibleLots[0] ?? null;
  const [cases, setCases] = useState(referenceProfile.minCases);

  const maxCases = selected ? selected.total_cases : referenceProfile.maxCases;
  const setSafeCases = (value: number) => {
    const normalized = Number.isFinite(value) ? Math.trunc(value) : referenceProfile.minCases;
    setCases(Math.max(referenceProfile.minCases, Math.min(maxCases, normalized)));
  };

  const realResult = useMemo(
    () => selected ? deriveLotScenario(selected, cases, formula) : null,
    [selected, cases, formula],
  );

  const referenceResult = useMemo(() => {
    if (selected) return null;
    const units = cases * referenceProfile.caseSizeUnits;
    const capitalCents = cases * referenceProfile.capitalPerCaseCents;
    const projectedNdlpCents = Math.round(capitalCents * referenceProfile.projectedNdlpRatio);
    const participantShare = formula
      ? Number(formula.participant_profit_share)
      : referenceProfile.participantProfitShare;
    const participantProfitCents = Math.round(projectedNdlpCents * participantShare);
    return {
      units,
      capitalCents,
      projectedSalesCents: capitalCents + projectedNdlpCents,
      projectedNdlpCents,
      participantProfitCents,
      roi: capitalCents > 0 ? participantProfitCents / capitalCents : null,
      participantShare,
    };
  }, [selected, cases, formula, referenceProfile]);

  const participantShare = formula
    ? Number(formula.participant_profit_share)
    : referenceProfile.participantProfitShare;

  return (
    <>
      {!selected && (
        <div className="mb-6 rounded-xl border border-accent/20 bg-accent/[0.045] p-4 sm:p-5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-accent mb-2">{referenceProfile.label}</p>
          <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
            Todavía no hay un lote con financiación abierta. Para que el simulador siga siendo útil, mostramos el escenario ilustrativo de referencia previamente publicado. No representa una oferta vigente ni sustituye los valores económicos del lote que finalmente selecciones para invertir.
          </p>
        </div>
      )}

      <Card variant="bordered" padding="lg" className="mb-6">
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="text-[11px] uppercase tracking-[0.15em] text-text-dim block mb-3" htmlFor="simulator-lot">
              Base del escenario
            </label>
            {eligibleLots.length > 0 ? (
              <select
                id="simulator-lot"
                value={selected?.id ?? ''}
                onChange={(event) => {
                  setSelectedId(event.target.value);
                  setCases(referenceProfile.minCases);
                }}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none"
              >
                {eligibleLots.map((lot) => <option key={lot.id} value={lot.id}>{lot.code} · {lot.beer_style}</option>)}
              </select>
            ) : (
              <div id="simulator-lot" className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-muted">
                Referencia ilustrativa · sin lote abierto
              </div>
            )}
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-[0.15em] text-text-dim block mb-3" htmlFor="simulator-cases">
              Número de cajas · mínimo {referenceProfile.minCases}
            </label>
            <input
              id="simulator-cases"
              type="number"
              min={referenceProfile.minCases}
              max={maxCases}
              step={1}
              value={cases}
              onChange={(event) => setSafeCases(Number(event.target.value))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none"
            />
          </div>
        </div>
      </Card>

      {selected && realResult && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <Card variant="bordered" padding="md"><p className="text-[9px] uppercase tracking-[0.14em] text-text-dim">Botellas eq.</p><p className="text-lg text-white mt-1">{realResult.units}</p></Card>
            <Card variant="bordered" padding="md"><p className="text-[9px] uppercase tracking-[0.14em] text-text-dim">Capital requerido</p><p className="text-lg text-white mt-1">{formatCents(realResult.capitalRequiredCents)}</p></Card>
            <Card variant="bordered" padding="md"><p className="text-[9px] uppercase tracking-[0.14em] text-text-dim">Fórmula</p><p className="text-lg text-white mt-1">{formula ? `v${formula.version}` : 'No activa'}</p></Card>
            <Card variant="bordered" padding="md"><p className="text-[9px] uppercase tracking-[0.14em] text-text-dim">Participante</p><p className="text-lg text-white mt-1">{`${(participantShare * 100).toFixed(2)}%`}</p></Card>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <ScenarioCard
              title="Escenario límite · 100% punto propio"
              gross={realResult.ownPointGrossRevenueCents}
              contribution={realResult.ownPointContributionCents}
              participantProfit={realResult.ownPointParticipantProfitCents}
              roi={realResult.ownPointParticipantRoi}
            />
            <ScenarioCard
              title="Escenario límite · 100% B2B"
              gross={realResult.b2bGrossRevenueCents}
              contribution={realResult.b2bContributionCents}
              participantProfit={realResult.b2bParticipantProfitCents}
              roi={realResult.b2bParticipantRoi}
            />
          </div>
        </>
      )}

      {!selected && referenceResult && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Card variant="bordered" padding="md">
            <p className="text-[10px] text-text-dim uppercase tracking-[0.15em] mb-2">Capital estimado requerido</p>
            <p className="text-xl font-outfit font-semibold text-white">{formatCents(referenceResult.capitalCents)}</p>
            <p className="text-[11px] text-text-dim mt-2">{cases} cajas · {referenceResult.units} botellas equivalentes</p>
          </Card>
          <Card variant="bordered" padding="md">
            <p className="text-[10px] text-text-dim uppercase tracking-[0.15em] mb-2">Ventas proyectadas · ilustrativo</p>
            <p className="text-xl font-outfit font-semibold text-white">{formatCents(referenceResult.projectedSalesCents)}</p>
          </Card>
          <Card variant="bordered" padding="md">
            <p className="text-[10px] text-text-dim uppercase tracking-[0.15em] mb-2">Utilidad neta distribuible · ilustrativo</p>
            <p className="text-xl font-outfit font-semibold text-white">{formatCents(referenceResult.projectedNdlpCents)}</p>
          </Card>
          <Card variant="gradient" padding="md">
            <p className="text-[10px] text-text-dim uppercase tracking-[0.15em] mb-2">Participación proyectada · ilustrativo</p>
            <p className="text-xl font-outfit font-semibold text-accent">{formatCents(referenceResult.participantProfitCents)}</p>
            <p className="text-sm text-accent mt-2">ROI ilustrativo: {percent(referenceResult.roi)}</p>
          </Card>
        </div>
      )}

      <p className="text-[11px] text-text-dim leading-relaxed">
        El simulador es informativo. Cuando exista un lote abierto, sus costos y precios persistidos sustituyen automáticamente el perfil de referencia. Una orden real nunca usa las cifras ilustrativas de esta página: PostgreSQL calcula el capital exclusivamente desde el snapshot económico del lote seleccionado. La inversión mínima vigente es de {referenceProfile.minCases} cajas.
      </p>
    </>
  );
}
