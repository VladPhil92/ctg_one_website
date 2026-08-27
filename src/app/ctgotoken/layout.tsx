import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CTGO Token | CTG One Web3 Strategy',
  description: 'CTGO is a real, deployed token currently under consolidation as part of CTG One’s Web3 strategy. No purchase, price, or trading information is offered on this page.',
  alternates: { canonical: 'https://ctgone.com/ctgotoken' },
  openGraph: {
    title: 'CTGO Token | CTG One Web3 Strategy',
    description: 'CTGO is a real, deployed token currently under consolidation.',
    url: 'https://ctgone.com/ctgotoken',
    type: 'website',
  },
};

export default function CtgoTokenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
