import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: 'https://ctgone.com/inversion/lotes' },
};

export default function InvestmentLotsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
