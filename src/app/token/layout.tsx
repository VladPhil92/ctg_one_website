import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CTGO Token | Polygon Mainnet | CTG One',
  description:
    'CTGO is CTG One’s canonical utility token on Polygon PoS. The production contract is verified; liquidity, governance, and independent price indexing remain under consolidation. No fixed fiat price is guaranteed.',
  alternates: { canonical: 'https://ctgone.com/token' },
  openGraph: {
    title: 'CTGO Token | Polygon Mainnet | CTG One',
    description:
      'CTGO is deployed and verified on Polygon PoS. Market liquidity and independent price indexing remain under consolidation; no fixed fiat price is guaranteed.',
    url: 'https://ctgone.com/token',
    type: 'website',
  },
};

export default function TokenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
