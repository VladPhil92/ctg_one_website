import React from 'react';
import { Container, Badge } from '@/components/ui';

export const metadata = { title: 'Legal' };

export default function LegalPage() {
  return (
    <section className="py-20 sm:py-28">
      <Container size="small">
        <Badge variant="accent" className="mb-6">Legal</Badge>
        <h1 className="text-3xl sm:text-4xl font-outfit font-semibold text-white mb-8">
          Condiciones legales
        </h1>
        <div className="space-y-6 text-sm text-text-muted leading-relaxed">
          <p>
            CTG Craft Beer Inversión es un programa de participación económica en lotes de
            producción identificables de Cervecería Cartagena S.A.S. La participación no
            constituye la adquisición de acciones ni de ningún instrumento de patrimonio de
            Cervecería Cartagena S.A.S., ni un valor negociable.
          </p>
          <p>
            El porcentaje contractual aplicable de la utilidad neta distribuible se determina
            según la versión de fórmula financiera vigente al momento del aporte, y se liquida
            de acuerdo con el desempeño real de ventas, costos e impuestos del lote
            correspondiente.
          </p>
          <p>
            Este programa se encuentra actualmente en fase de beta cerrada. Varios aspectos
            contractuales y regulatorios se encuentran en definición (ver el registro de
            decisiones pendientes en la documentación técnica del proyecto) y serán comunicados
            antes de cualquier apertura pública de financiación.
          </p>
          <p>
            Esta página es un resumen informativo y no sustituye el acuerdo de financiación
            (Funding Agreement) que se suscribe individualmente con cada participante antes de
            confirmar una asignación.
          </p>
        </div>
      </Container>
    </section>
  );
}
