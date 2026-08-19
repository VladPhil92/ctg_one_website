import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: 'https://ctgone.com/inversion/legal' },
};

export default function InvestmentLegalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
