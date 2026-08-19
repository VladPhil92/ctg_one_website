import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: 'https://ctgone.com/products' },
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
