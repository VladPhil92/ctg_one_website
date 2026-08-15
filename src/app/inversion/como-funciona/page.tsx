import React from 'react';
import { Container, Badge, Card } from '@/components/ui';
import { Button } from '@/components/ui/Button';

const STEPS = [
  {
    title: '1. Selecciona una oportunidad',
    body: 'Explora los lotes de producción con financiación abierta: estilo de cerveza, destino comercial, tamaño de producción y aporte mínimo.',
  },
  {
    title: '2. Financia un equivalente productivo',
    body: 'Aportas el capital correspondiente a un número de cajas dentro de un lote físico compartido con otros participantes y con CTG.',
  },
  {
    title: '3. Sigue la producción',
    body: 'Cada etapa —cocción, fermentación, embotellado, control de calidad, bodega, despacho— queda registrada con evidencia y fecha.',
  },
  {
    title: '4. Sigue las ventas',
    body: 'Consulta el inventario disponible, despachado y vendido del lote, y el porcentaje comercializado.',
  },
  {
    title: '5. Consulta la liquidación',
    body: 'Al cierre del lote se calcula la utilidad neta distribuible y la porción atribuible a tu asignación, según la fórmula vigente al momento de tu aporte.',
  },
  {
    title: '6. Retira o reinvierte',
    body: 'Solicita el retiro de tu liquidación o reinviértela en un nuevo lote, con trazabilidad completa entre ambos.',
  },
];

export const metadata = { title: 'Cómo funciona' };

export default function ComoFuncionaPage() {
  return (
    <section className="py-20 sm:py-28">
      <Container size="small">
        <Badge variant="accent" className="mb-6">Cómo funciona</Badge>
        <h1 className="text-3xl sm:text-4xl font-outfit font-semibold text-white mb-6 max-w-2xl">
          De la capital a la liquidación, con trazabilidad completa
        </h1>
        <p className="text-base text-text-muted max-w-xl leading-relaxed mb-14">
          CTG Craft Beer Inversión conecta tu aporte con producción real de cerveza. No eres
          accionista de Cervecería Cartagena S.A.S. por participar, y no adquieres un valor
          negociable — participas en el resultado económico de un lote de producción identificado.
        </p>

        <div className="space-y-5">
          {STEPS.map((step) => (
            <Card key={step.title} variant="bordered" padding="md">
              <h2 className="text-base font-outfit font-semibold text-white mb-2">{step.title}</h2>
              <p className="text-sm text-text-muted leading-relaxed">{step.body}</p>
            </Card>
          ))}
        </div>

        <div className="mt-14 flex flex-col sm:flex-row gap-4">
          <Button href="/inversion/lotes" variant="primary" size="md" arrow>
            Ver lotes disponibles
          </Button>
          <Button href="/inversion/riesgos" variant="secondary" size="md">
            Leer sobre los riesgos
          </Button>
        </div>
      </Container>
    </section>
  );
}
