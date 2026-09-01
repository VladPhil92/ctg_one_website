import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Campus | JP Valderrama · CTG One',
  description: 'Conferencias, cursos, clases, libros, recursos y asesoría educativa de JP Valderrama conectados a una única cuenta de CTG One.',
  alternates: {
    canonical: 'https://ctgone.com/jpvalderrama/campus',
  },
  openGraph: {
    title: 'Campus | JP Valderrama · CTG One',
    description: 'Tu biblioteca educativa de JP Valderrama conectada con tu cuenta CTG One.',
    url: 'https://ctgone.com/jpvalderrama/campus',
    type: 'website',
  },
};

export default function EducationCampusLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
