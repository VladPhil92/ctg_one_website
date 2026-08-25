import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CTGO Token | CTG One Web3 Strategy',
  description: 'CTGO is a utility layer currently in development as part of CTG One’s Web3 strategy. See its real status — no holder counts, price, APY, or TVL figures are published until verified.',
  alternates: { canonical: 'https://ctgone.com/token' },
  openGraph: {
    title: 'CTGO Token | CTG One Web3 Strategy',
    description: 'CTGO is a utility layer currently in development.',
    url: 'https://ctgone.com/token',
    type: 'website',
  },
};

export default function TokenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
