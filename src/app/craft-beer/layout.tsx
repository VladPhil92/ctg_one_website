import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CTG Craft Beer | Cerveza artesanal de Cartagena',
  description: 'Conoce CTG Craft Beer, nuestros estilos de cerveza artesanal producidos en Cartagena y la plataforma independiente de participación en lotes de producción.',
  alternates: { canonical: '/craft-beer' },
  openGraph: {
    title: 'CTG Craft Beer | Cerveza artesanal de Cartagena',
    description: 'Cerveza artesanal producida en Cartagena y acceso a CTG Craft Beer Inversión.',
    url: '/craft-beer',
    type: 'website',
  },
};

export default function CraftBeerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
