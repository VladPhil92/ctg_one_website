import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Valderrama Projects | JP Valderrama',
  description: 'Valderrama Projects reúne investigación aplicada, EdTech y programas como Colombia Bilingüe: inglés online accesible de A1 a B2.',
  alternates: { canonical: 'https://ctgone.com/jpvalderrama/projects' },
  openGraph: {
    title: 'Valderrama Projects | JP Valderrama',
    description: 'Ideas que pasan de la formulación conceptual a investigación, prototipos, productos y programas educativos como Colombia Bilingüe.',
    url: 'https://ctgone.com/jpvalderrama/projects',
    siteName: 'CTG One',
    type: 'website',
    images: [{ url: 'https://ctgone.com/jpvalderrama/projects.webp', width: 1024, height: 1024, alt: 'Valderrama Projects' }],
  },
};

export default function ProjectsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
