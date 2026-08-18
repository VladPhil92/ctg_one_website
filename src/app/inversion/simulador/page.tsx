import React from 'react';
import { Container, Badge } from '@/components/ui';
import { InvestmentSimulatorClient } from '@/components/inversion/InvestmentSimulatorClient';
import { getActiveInvestmentFormulaVersion, getPublicSimulationLots } from '@/lib/investment/queries';
import { PUBLIC_INVESTMENT_SIMULATOR_PROFILE } from '@/lib/investment/public-simulator';

export const dynamic = 'force-dynamic';

export default async function SimuladorPage() {
  const [lots, formula] = await Promise.all([
    getPublicSimulationLots(),
    getActiveInvestmentFormulaVersion(),
  ]);

  return (
    <section className="py-16 sm:py-24">
      <Container size="small">
        <Badge variant="accent" className="mb-6">Simulador</Badge>
        <h1 className="text-3xl sm:text-4xl font-outfit font-semibold text-white mb-4">
          Simulador de participación
        </h1>
        <p className="text-base text-text-muted leading-relaxed mb-10">
          Ajusta el número de cajas para explorar una participación. Si existe un lote con financiación abierta, el cálculo usa su snapshot económico real; mientras no exista uno, se utiliza un escenario ilustrativo de referencia claramente identificado.
        </p>

        <InvestmentSimulatorClient
          lots={lots}
          formula={formula}
          referenceProfile={PUBLIC_INVESTMENT_SIMULATOR_PROFILE}
        />

        <p className="text-[11px] text-text-dim leading-relaxed mt-10">
          Los escenarios son estimados y no constituyen una rentabilidad garantizada. La liquidación real depende de las ventas, costos, impuestos, ajustes y reglas contractuales efectivamente aplicables al lote y a la versión de fórmula financiera que quede fijada en cada allocation. Consulta <a href="/inversion/riesgos" className="text-accent hover:underline">riesgos</a>{' '}
          y <a href="/inversion/legal" className="text-accent hover:underline">condiciones legales</a>.
        </p>
      </Container>
    </section>
  );
}
