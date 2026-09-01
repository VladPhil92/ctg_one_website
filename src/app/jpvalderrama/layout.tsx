import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'JP Valderrama | Filosofía, Educación, Ideas y Proyectos | CTG One',
  description:
    'Perfil académico y plataforma educativa de Juan Pablo Valderrama Pino: filósofo, educador, escritor, empresario, fundador de CTG One y desarrollador. Valderrama Talks, Ideas, Books y Projects.',
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
  },
};

export default function JPValderramaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
