'use client';

import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui';
import { formatCents } from '@/lib/format';
import { MIN_INVESTMENT_CASES } from '@/lib/investment/constants';
import { deriveLotScenario } from '@/lib/investment/economics';
import type { InvestmentProductionLot, LotFundingSummary } from '@/types/investment';
import type { InvestmentFormulaVersion } from '@/types/investment-economics';

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
  fundingByLot,
}: {
  lots: InvestmentProductionLot[];
  formula: InvestmentFormulaVersion | null;
  fundingByLot: Record<string, LotFundingSummary>;
}) {
  const [selectedId, setSelectedId] = useState(lots[0]?.id ?? '');
  const selected = lots.find((lot) => lot.id === selectedId) ?? lots[0] ?? null;
  const [cases, setCases] = useState(MIN_INVESTMENT_CASES);

  const result = useMemo(
    () => selected ? deriveLotScenario(selected, cases, formula) : null,
    [selected, cases, formula],
  );

  if (!selected) {
    return (
      <Card variant="bordered" padding="lg">
        <p className="text-sm text-white font-medium mb-2">Simulador disponible desde {MIN_INVESTMENT_CASES} cajas</p>
        <p className="text-sm text-text-muted leading-relaxed">
          El motor de cálculo está operativo, pero en este momento no existe ningún snapshot económico de lote publicado en la base de datos. Para proteger al inversor, la plataforma no inventa costos, precios ni rentabilidades. En cuanto exista un lote con economía persistida, el simulador lo cargará automáticamente y mantendrá como entrada mínima {MIN_INVESTMENT_CASES} cajas.
        </p>
      </Card>
    );
  }

  if (!result) return null;

  const participantShare = formula ? Number(formula.participant_profit_share) : null;
  const funding = fundingByLot[selected.id] ?? {
    totalCases: selected.total_eligible_units,
    allocatedCases: 0,
    reservedCases: 0,
    fundedPercent: 0,
    availableCasesEquivalent: selected.total_eligible_units,
  };
  const reservedCases = funding.reservedCases ?? 0;
  const isFundingOpen = selected.status === 'FUNDING_OPEN';
  const isCurrentlyReservable = isFundingOpen && funding.availableCasesEquivalent >= MIN_INVESTMENT_CASES;
  const simulationExceedsLiveCapacity = isFundingOpen && cases > funding.availableCasesEquivalent;

  return (
    <>
      {!isFundingOpen && (
        <div className="mb-6 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-4 text-xs text-text-muted leading-relaxed">
          Este cálculo usa un snapshot persistido como referencia. El lote seleccionado no está abierto actualmente para recibir nuevas órdenes; la simulación no representa disponibilidad de inversión.
        </div>
      )}

      <Card variant="bordered" padding="lg" className="mb-6">
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="text-[11px] uppercase tracking-[0.15em] text-text-dim block mb-3" htmlFor="simulator-lot">
              Snapshot de lote
            </label>
            <select
              id="simulator-lot"
              value={selected.id}
              onChange={(event) => { setSelectedId(event.target.value); setCases(MIN_INVESTMENT_CASES); }}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none"
            >
              {lots.map((lot) => <option key={lot.id} value={lot.id}>{lot.code} · {lot.beer_style}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-[0.15em] text-text-dim block mb-3" htmlFor="simulator-cases">
              Cajas a simular · mínimo {MIN_INVESTMENT_CASES} · máx. snapshot {selected.total_eligible_units}
            </label>
            <input
              id="simulator-cases"
              type="number"
              min={MIN_INVESTMENT_CASES}
              max={selected.total_eligible_units}
              step={1}
              value={cases}
              onChange={(event) => setCases(Math.max(MIN_INVESTMENT_CASES, Math.min(selected.total_eligible_units, Number(event.target.value) || MIN_INVESTMENT_CASES)))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none"
            />
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-white/[.07] bg-white/[.015] p-4">
          <p className="text-[9px] uppercase tracking-[.14em] text-text-dim mb-3">Disponibilidad real del lote</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div><span className="text-text-dim block">Asignadas</span><span className="text-white mt-1 block">{funding.allocatedCases} cajas eq.</span></div>
            <div><span className="text-text-dim block">Reservadas</span><span className="text-white mt-1 block">{reservedCases} cajas eq.</span></div>
            <div><span className="text-text-dim block">Disponibles</span><span className="text-white mt-1 block">{funding.availableCasesEquivalent} cajas eq.</span></div>
            <div><span className="text-text-dim block">Nueva orden</span><span className={`mt-1 block ${isCurrentlyReservable ? 'text-accent' : 'text-text-muted'}`}>{isCurrentlyReservable ? 'Habilitada' : 'No disponible'}</span></div>
          </div>
        </div>

        {simulationExceedsLiveCapacity && (
          <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-3 text-[11px] text-text-muted leading-relaxed">
            Estás simulando {cases} cajas, pero actualmente solo quedan {funding.availableCasesEquivalent} cajas equivalentes disponibles para nuevas órdenes. El cálculo sigue siendo válido como escenario económico del snapshot, no como reserva de cupo.
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div><p className="text-[9px] uppercase tracking-[0.14em] text-text-dim">Botellas eq.</p><p className="text-lg text-white mt-1">{result.units}</p></div>
          <div><p className="text-[9px] uppercase tracking-[0.14em] text-text-dim">Capital requerido</p><p className="text-lg text-white mt-1">{formatCents(result.capitalRequiredCents)}</p></div>
          <div><p className="text-[9px] uppercase tracking-[0.14em] text-text-dim">Fórmula</p><p className="text-lg text-white mt-1">{formula ? `v${formula.version}` : 'No activa'}</p></div>
          <div><p className="text-[9px] uppercase tracking-[0.14em] text-text-dim">Participante</p><p className="text-lg text-white mt-1">{participantShare == null ? '—' : `${(participantShare * 100).toFixed(2)}%`}</p></div>
        </div>
      </Card>

      {!formula && (
        <div className="mb-6 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-4 text-xs text-text-muted leading-relaxed">
          No existe una fórmula financiera activa. Se muestran capital, ingresos y contribución del snapshot del lote, pero no se calcula participación ni ROI.
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <ScenarioCard
          title="Escenario límite · 100% punto propio"
          gross={result.ownPointGrossRevenueCents}
          contribution={result.ownPointContributionCents}
          participantProfit={result.ownPointParticipantProfitCents}
          roi={result.ownPointParticipantRoi}
        />
        <ScenarioCard
          title="Escenario límite · 100% B2B"
          gross={result.b2bGrossRevenueCents}
          contribution={result.b2bContributionCents}
          participantProfit={result.b2bParticipantProfitCents}
          roi={result.b2bParticipantRoi}
        />
      </div>

      <p className="text-[11px] text-text-dim leading-relaxed">
        Estos dos escenarios son límites ilustrativos derivados exclusivamente del snapshot económico del lote y, cuando existe, de la fórmula financiera activa. La cantidad simulada se limita a la capacidad financiable persistida del snapshot, pero puede ser mayor que el cupo actualmente disponible porque el simulador no reserva cajas. No presuponen una mezcla de canales ni reemplazan la liquidación.
      </p>
    </>
  );
}
