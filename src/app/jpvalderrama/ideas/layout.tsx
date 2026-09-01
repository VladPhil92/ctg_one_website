import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Valderrama Ideas | JP Valderrama',
  description: 'Ensayos, análisis y pensamiento aplicado de JP Valderrama sobre filosofía, educación, sociedad, tecnología, empresa y cultura.',
  alternates: { canonical: 'https://ctgone.com/jpvalderrama/ideas' },
  openGraph: {
    title: 'Valderrama Ideas | JP Valderrama',
    description: 'Un archivo editorial para pensar el presente con rigor filosófico y vocación pública.',
    url: 'https://ctgone.com/jpvalderrama/ideas',
    siteName: 'CTG One',
    type: 'website',
    images: [{ url: 'https://ctgone.com/jpvalderrama/ideas.webp', width: 1024, height: 1024, alt: 'Valderrama Ideas' }],
  },
};

export default function IdeasLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
