import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Valderrama Books | JP Valderrama',
  description: 'Libros, manuscritos, investigación y proyectos editoriales de JP Valderrama.',
  alternates: { canonical: 'https://ctgone.com/jpvalderrama/books' },
  openGraph: {
    title: 'Valderrama Books | JP Valderrama',
    description: 'El espacio editorial de largo aliento de JP Valderrama.',
    url: 'https://ctgone.com/jpvalderrama/books',
    siteName: 'CTG One',
    type: 'website',
    images: [{ url: 'https://ctgone.com/jpvalderrama/books.webp', width: 1024, height: 1024, alt: 'Valderrama Books' }],
  },
};

export default function BooksLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
