import React from 'react';
import { Container, Badge } from '@/components/ui';
import { InvestmentSimulatorClient } from '@/components/inversion/InvestmentSimulatorClient';
import {
  getActiveInvestmentFormulaVersion,
  getPublicLotFundingSummaries,
  getPublicSimulationLots,
} from '@/lib/investment/queries';

export const dynamic = 'force-dynamic';

export default async function SimuladorPage() {
  const [lots, formula, fundingByLot] = await Promise.all([
    getPublicSimulationLots(),
    getActiveInvestmentFormulaVersion(),
    getPublicLotFundingSummaries(),
  ]);

  return (
    <section className="py-16 sm:py-24">
      <Container size="small">
        <Badge variant="accent" className="mb-6">Simulador</Badge>
        <h1 className="text-3xl sm:text-4xl font-outfit font-semibold text-white mb-4">
          Simulador por snapshot de lote
        </h1>
        <p className="text-base text-text-muted leading-relaxed mb-10">
          Explora escenarios construidos con costos, precios y tasas persistidos en lotes publicados. El simulador puede usar un snapshot histórico aunque el lote no esté abierto actualmente para nuevas órdenes; por eso la disponibilidad real se muestra por separado y nunca se deduce de la cifra simulada.
        </p>

        <InvestmentSimulatorClient lots={lots} formula={formula} fundingByLot={fundingByLot} />

        <p className="text-[11px] text-text-dim leading-relaxed mt-10">
          Los escenarios son estimados y no constituyen una rentabilidad garantizada ni una reserva de capacidad. La liquidación real depende de las ventas, costos, impuestos, ajustes y reglas contractuales efectivamente aplicables al lote y a la versión de fórmula financiera que quede fijada en cada allocation. Consulta <a href="/inversion/riesgos" className="text-accent hover:underline">riesgos</a>{' '}
          y <a href="/inversion/legal" className="text-accent hover:underline">condiciones legales</a>.
        </p>
      </Container>
    </section>
  );
}
