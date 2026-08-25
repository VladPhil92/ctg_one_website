import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CTG One Products | Technology You Can See in Action',
  description: 'Explore CTG Craft Beer and Nvet Care — real products and platforms built by CTG One Technology.',
  alternates: { canonical: 'https://ctgone.com/products' },
  openGraph: {
    title: 'CTG One Products | Technology You Can See in Action',
    description: 'Explore CTG Craft Beer and Nvet Care — real products built by CTG One Technology.',
    url: 'https://ctgone.com/products',
    type: 'website',
  },
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
