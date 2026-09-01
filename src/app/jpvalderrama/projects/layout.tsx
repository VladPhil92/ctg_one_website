import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Valderrama Projects | JP Valderrama',
  description: 'Investigación aplicada, EdTech, tecnología y proyectos interdisciplinarios desarrollados por JP Valderrama.',
  alternates: { canonical: 'https://ctgone.com/jpvalderrama/projects' },
  openGraph: {
    title: 'Valderrama Projects | JP Valderrama',
    description: 'Ideas que pasan de la formulación conceptual a investigación, prototipos y productos.',
    url: 'https://ctgone.com/jpvalderrama/projects',
    siteName: 'CTG One',
    type: 'website',
    images: [{ url: 'https://ctgone.com/jpvalderrama/projects.webp', width: 1024, height: 1024, alt: 'Valderrama Projects' }],
  },
};

export default function ProjectsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
