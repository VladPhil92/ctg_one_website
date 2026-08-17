import React from 'react';
import { Container, Badge } from '@/components/ui';
import { InvestmentSimulatorClient } from '@/components/inversion/InvestmentSimulatorClient';
import { getActiveInvestmentFormulaVersion, getPublicSimulationLots } from '@/lib/investment/queries';

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
          Simulador por snapshot de lote
        </h1>
        <p className="text-base text-text-muted leading-relaxed mb-10">
          Explora escenarios construidos con costos, precios y tasas almacenados en un lote real con financiación abierta. La plataforma ya no utiliza una rentabilidad proyectada fija ni un capital por caja escrito en el frontend.
        </p>

        <InvestmentSimulatorClient lots={lots} formula={formula} />

        <p className="text-[11px] text-text-dim leading-relaxed mt-10">
          Los escenarios son estimados y no constituyen una rentabilidad garantizada. La liquidación real depende de las ventas, costos, impuestos, ajustes y reglas contractuales efectivamente aplicables al lote y a la versión de fórmula financiera que quede fijada en cada allocation. Consulta <a href="/inversion/riesgos" className="text-accent hover:underline">riesgos</a>{' '}
          y <a href="/inversion/legal" className="text-accent hover:underline">condiciones legales</a>.
        </p>
      </Container>
    </section>
  );
}
