import type { Metadata, Viewport } from 'next';

const title = 'World Makers | Imagina. Crea. Aprende. Transforma.';
const description =
  'World Makers es un sandbox 3D de mundo abierto donde construir, explorar, experimentar y cuidar el mundo convierten el aprendizaje en una aventura.';

export const metadata: Metadata = {
  metadataBase: new URL('https://worldmakers.ctgone.com'),
  title,
  description,
  keywords: [
    'World Makers',
    'videojuego educativo',
    'sandbox educativo',
    'aprendizaje basado en juego',
    'STEM',
    'ciencia para niños',
    'mundo abierto',
    'CTG One',
  ],
  alternates: {
    canonical: 'https://worldmakers.ctgone.com',
  },
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: 'https://worldmakers.ctgone.com',
    siteName: 'World Makers',
    title,
    description,
    images: [
      {
        url: '/api/worldmakers/visuals/hero',
        width: 1672,
        height: 941,
        alt: 'World Makers: crea, explora y aprende en un mundo vivo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/api/worldmakers/visuals/hero'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#123B7A',
  colorScheme: 'light',
};

export default function WorldMakersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
