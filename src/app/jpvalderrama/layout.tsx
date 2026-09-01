import type { Metadata } from 'next';

const title = 'JP Valderrama | Filosofía, Educación, Ideas y Proyectos | CTG One';
const description =
  'Perfil académico y plataforma educativa de Juan Pablo Valderrama Pino: filósofo, educador, escritor, empresario, fundador de CTG One y desarrollador. Valderrama Talks, Ideas, Books y Projects.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: 'https://ctgone.com/jpvalderrama',
  },
  openGraph: {
    title: 'JP Valderrama | CTG One',
    description:
      'Filosofía, educación, escritura, tecnología y proyectos reunidos en una plataforma de conocimiento aplicada.',
    url: 'https://ctgone.com/jpvalderrama',
    siteName: 'CTG One',
    type: 'profile',
    images: [
      {
        url: 'https://ctgone.com/jpvalderrama/brand.webp',
        width: 720,
        height: 360,
        alt: 'Juan Pablo Valderrama — filósofo, escritor y conferencista',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['https://ctgone.com/jpvalderrama/brand.webp'],
  },
};

export default function JPValderramaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
