import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: 'https://ctgone.com/inversion/riesgos' },
};

export default function InvestmentRisksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
