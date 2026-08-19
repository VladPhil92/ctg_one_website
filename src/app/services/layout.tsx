import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: 'https://ctgone.com/services' },
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
