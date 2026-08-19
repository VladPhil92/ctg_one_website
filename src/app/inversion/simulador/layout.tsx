import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: 'https://ctgone.com/inversion/simulador' },
};

export default function InvestmentSimulatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
