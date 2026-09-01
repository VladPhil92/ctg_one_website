import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Valderrama Talks | Conferencias de JP Valderrama',
  description: 'Conferencias, clases y conversaciones de JP Valderrama sobre filosofía, educación, cultura, tecnología y sociedad.',
  alternates: { canonical: 'https://ctgone.com/jpvalderrama/talks' },
  openGraph: {
    title: 'Valderrama Talks | JP Valderrama',
    description: 'Conferencias y conversaciones para convertir ideas complejas en experiencias de aprendizaje claras y rigurosas.',
    url: 'https://ctgone.com/jpvalderrama/talks',
    siteName: 'CTG One',
    type: 'website',
    images: [{ url: 'https://ctgone.com/jpvalderrama/conference.webp', width: 1024, height: 1024, alt: 'Conferencia Filosofía o Dinero — Valderrama Talks' }],
  },
};

export default function TalksLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
