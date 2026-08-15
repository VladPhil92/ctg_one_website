import React from 'react';
import { Container, Badge, Card } from '@/components/ui';

export const metadata = { title: 'Riesgos' };

const RISKS = [
  'La producción de cerveza está sujeta a variables agrícolas, industriales y logísticas que pueden afectar el volumen, calidad o costo de un lote.',
  'La comercialización de un lote puede tomar más o menos tiempo del previsto, o no venderse en su totalidad.',
  'No existe una rentabilidad garantizada. La liquidación depende de las ventas, costos e impuestos efectivamente generados por el lote.',
  'Participar no otorga la calidad de accionista de Cervecería Cartagena S.A.S. ni ningún derecho societario.',
  'El tratamiento de pérdidas, inventario dañado o no vendido está sujeto a las condiciones contractuales vigentes al momento de tu aporte (ver Legal).',
  'Este es un programa en fase de beta cerrada; algunas funcionalidades y automatizaciones aún no están disponibles.',
];

export default function RiesgosPage() {
  return (
    <section className="py-20 sm:py-28">
      <Container size="small">
        <Badge variant="accent" className="mb-6">Riesgos</Badge>
        <h1 className="text-3xl sm:text-4xl font-outfit font-semibold text-white mb-8">
          Riesgos del programa
        </h1>
        <div className="space-y-4">
          {RISKS.map((risk) => (
            <Card key={risk} variant="bordered" padding="md">
              <p className="text-sm text-text-muted leading-relaxed">{risk}</p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
